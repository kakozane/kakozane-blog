package service

import (
	"context"
	"log/slog"
	"runtime"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/kakozane/kakozane-blog/api/internal/model"
	"github.com/kakozane/kakozane-blog/api/internal/repository"
)

type MonitorService struct {
	repo              *repository.MonitorRepository
	mediaDirectory    string
	queue             chan model.MonitorLog
	dropped           atomic.Uint64
	failed            atomic.Uint64
	cleanupFailed     atomic.Bool
	mu                sync.RWMutex
	snapshot          model.MonitorSnapshot
	routes            map[string]model.MonitorRoute
	requests, errors  uint64
	cpuTotal, cpuIdle uint64
}

func NewMonitorService(repo *repository.MonitorRepository, directory string) *MonitorService {
	return &MonitorService{repo: repo, mediaDirectory: directory, queue: make(chan model.MonitorLog, 512), routes: map[string]model.MonitorRoute{}, snapshot: model.MonitorSnapshot{StartedAt: time.Now().UTC(), Routes: []model.MonitorRoute{}, History: []model.MonitorPoint{}, Server: model.MonitorComponent{Status: "pending"}, MySQL: model.MonitorComponent{Status: "pending"}, Redis: model.MonitorComponent{Status: "pending"}}}
}
func (s *MonitorService) Record(item model.MonitorLog) {
	select {
	case s.queue <- item:
	default:
		s.dropped.Add(1)
	}
}
func (s *MonitorService) Observe(method, route string, status int, elapsed time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	key := method + " " + route
	// 未匹配路径和非标准 HTTP 方法合并，防止攻击者制造无限维度。
	if len(s.routes) >= 512 {
		if _, ok := s.routes[key]; !ok {
			key = "OTHER"
			method = "OTHER"
			route = "其他"
		}
	}
	v := s.routes[key]
	v.Method = method
	v.Route = route
	v.Requests++
	s.requests++
	if status >= 500 {
		v.Errors++
		s.errors++
	} else if status >= 400 {
		v.ClientErrors++
	}
	ms := float64(elapsed.Microseconds()) / 1000
	v.TotalMS += ms
	v.AverageMS = v.TotalMS / float64(v.Requests)
	if ms > v.MaxMS {
		v.MaxMS = ms
	}
	if elapsed >= time.Second {
		v.Slow++
	}
	s.routes[key] = v
}
func (s *MonitorService) Snapshot() model.MonitorSnapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := s.snapshot
	result.History = append([]model.MonitorPoint{}, s.snapshot.History...)
	result.Routes = make([]model.MonitorRoute, 0, len(s.routes))
	for _, v := range s.routes {
		result.Routes = append(result.Routes, v)
	}
	sort.Slice(result.Routes, func(i, j int) bool { return result.Routes[i].Requests > result.Routes[j].Requests })
	result.DroppedLogs = s.dropped.Load()
	result.FailedLogs = s.failed.Load()
	result.CleanupFailed = s.cleanupFailed.Load()
	result.QueueDepth = len(s.queue)
	return result
}
func (s *MonitorService) ListLogs(ctx context.Context, f model.MonitorLogFilter) ([]model.MonitorLog, int64, error) {
	return s.repo.ListLogs(ctx, f)
}

// Run 在关闭 HTTP 服务后取消；关闭时最多花 5 秒冲刷队列。
func (s *MonitorService) Run(ctx context.Context) {
	var wg sync.WaitGroup
	wg.Add(1)
	go func() { defer wg.Done(); s.sampleLoop(ctx) }()
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for ctx.Err() == nil {
		select {
		case item := <-s.queue:
			s.write(context.Background(), item)
		case <-ticker.C:
			cleanupCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
			err := s.repo.Cleanup(cleanupCtx)
			cancel()
			s.cleanupFailed.Store(err != nil)
			if err != nil && ctx.Err() == nil {
				slog.Warn("monitor log cleanup failed")
			}
		case <-ctx.Done():
		}
	}
	flush, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	for len(s.queue) > 0 && flush.Err() == nil {
		s.write(flush, <-s.queue)
	}
	cancel()
	s.dropped.Add(uint64(len(s.queue)))
	wg.Wait()
}

func (s *MonitorService) write(parent context.Context, item model.MonitorLog) {
	ctx, cancel := context.WithTimeout(parent, 2*time.Second)
	defer cancel()
	if err := s.repo.InsertLog(ctx, item); err != nil {
		s.failed.Add(1)
		if s.failed.Load()%100 == 1 {
			slog.Warn("monitor log write failed; check database availability")
		}
	}
}
func (s *MonitorService) sampleLoop(ctx context.Context) {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		s.sample(ctx)
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}
func (s *MonitorService) sample(parent context.Context) {
	ctx, cancel := context.WithTimeout(parent, 4*time.Second)
	defer cancel()
	var mysql, redis model.MonitorComponent
	var wg sync.WaitGroup
	wg.Add(2)
	go func() { defer wg.Done(); mysql = s.repo.MySQL(ctx) }()
	go func() { defer wg.Done(); redis = s.repo.Redis(ctx) }()
	server := s.server()
	wg.Wait()
	s.mu.Lock()
	defer s.mu.Unlock()
	s.snapshot.SampledAt = time.Now().UTC()
	s.snapshot.Server = server
	s.snapshot.MySQL = mysql
	s.snapshot.Redis = redis
	point := model.MonitorPoint{At: s.snapshot.SampledAt, Requests: s.requests, Errors: s.errors}
	for _, metric := range server.Metrics {
		value := metric.Value
		if metric.Key == "cpu" {
			point.CPU = &value
		}
		if metric.Key == "memory_percent" {
			point.Memory = &value
		}
	}
	s.snapshot.History = append(s.snapshot.History, point)
	if len(s.snapshot.History) > 120 {
		s.snapshot.History = append([]model.MonitorPoint{}, s.snapshot.History[len(s.snapshot.History)-120:]...)
	}
}
func monitorMetric(key, label string, value float64, unit string) model.MonitorMetric {
	return model.MonitorMetric{Key: key, Label: label, Value: value, Unit: unit}
}
func (s *MonitorService) server() model.MonitorComponent {
	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)
	result := model.MonitorComponent{Status: "ok", Metrics: []model.MonitorMetric{
		monitorMetric("uptime", "API 运行时长", time.Since(s.snapshot.StartedAt).Seconds(), "s"),
		monitorMetric("goroutines", "Go 协程数", float64(runtime.NumGoroutine()), ""),
		monitorMetric("heap", "Go 堆使用", float64(mem.HeapAlloc), "bytes"),
		monitorMetric("go_memory", "Go 运行时申请内存", float64(mem.Sys), "bytes"),
		monitorMetric("gc", "累计 GC 次数", float64(mem.NumGC), ""),
		monitorMetric("gc_pause", "累计 GC 暂停", float64(mem.PauseTotalNs)/1e6, "ms"),
	}}
	s.systemMetrics(&result)
	return result
}
