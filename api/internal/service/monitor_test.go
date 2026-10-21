package service

import (
	"sync"
	"testing"
	"time"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func TestMonitorBoundedConcurrentCounters(t *testing.T) {
	s := NewMonitorService(nil, t.TempDir())
	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				s.Observe("POST", "/api/v1/admin/users", 503, 2*time.Second)
				s.Record(model.MonitorLog{})
			}
		}()
	}
	wg.Wait()
	snap := s.Snapshot()
	if snap.Routes[0].Requests != 2000 || snap.Routes[0].Errors != 2000 || snap.Routes[0].Slow != 2000 || snap.Routes[0].AverageMS != 2000 {
		t.Fatalf("incorrect aggregation: %+v", snap.Routes)
	}
	if snap.QueueDepth != 512 || snap.DroppedLogs != 1488 {
		t.Fatalf("queue must be bounded: %+v", snap)
	}
	snap.Routes[0].Requests = 0
	if s.Snapshot().Routes[0].Requests != 2000 {
		t.Fatal("snapshot aliases internal routes")
	}
}
