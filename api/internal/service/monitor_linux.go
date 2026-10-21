//go:build linux

package service

import (
	"os"
	"strconv"
	"strings"
	"syscall"

	"github.com/kakozane/kakozane-blog/api/internal/model"
)

func parseCPU(text string) (total, idle uint64) {
	lines := strings.SplitN(text, "\n", 2)
	fields := strings.Fields(lines[0])
	if len(fields) < 5 || fields[0] != "cpu" {
		return
	}
	// guest 已包含在 user/nice 中，不能重复计数。
	for i, field := range fields[1:] {
		if i >= 8 {
			break
		}
		v, err := strconv.ParseUint(field, 10, 64)
		if err != nil {
			return 0, 0
		}
		total += v
		if i == 3 || i == 4 {
			idle += v
		}
	}
	return
}
func memoryValues(text string) map[string]float64 {
	result := map[string]float64{}
	for _, line := range strings.Split(text, "\n") {
		fields := strings.Fields(line)
		if len(fields) >= 2 {
			if n, err := strconv.ParseFloat(fields[1], 64); err == nil {
				result[strings.TrimSuffix(fields[0], ":")] = n * 1024
			}
		}
	}
	return result
}
func (s *MonitorService) systemMetrics(r *model.MonitorComponent) {
	r.Message = "CPU / 系统内存来自当前 Linux 内核；Docker Desktop 对应 Linux 虚拟机。磁盘为上传目录所在文件系统，cgroup 指标来自当前命名空间，Docker 中通常为 API 容器。"
	stat, err := os.ReadFile("/proc/stat")
	if err == nil {
		total, idle := parseCPU(string(stat))
		if s.cpuTotal > 0 && total > s.cpuTotal && idle >= s.cpuIdle {
			delta := total - s.cpuTotal
			idleDelta := idle - s.cpuIdle
			if idleDelta <= delta {
				r.Metrics = append(r.Metrics, monitorMetric("cpu", "系统 CPU 使用率", 100*float64(delta-idleDelta)/float64(delta), "%"))
			}
		}
		s.cpuTotal = total
		s.cpuIdle = idle
	} else {
		r.Status = "partial"
	}
	if body, err := os.ReadFile("/proc/meminfo"); err == nil {
		v := memoryValues(string(body))
		total, tOK := v["MemTotal"]
		available, aOK := v["MemAvailable"]
		if tOK && aOK && total > 0 {
			r.Metrics = append(r.Metrics, monitorMetric("system_memory", "系统内存总量", total, "bytes"), monitorMetric("memory_percent", "系统内存使用率", 100*(total-available)/total, "%"))
		}
	} else {
		r.Status = "partial"
	}
	if body, err := os.ReadFile("/proc/loadavg"); err == nil {
		f := strings.Fields(string(body))
		if len(f) >= 3 {
			for i, key := range []string{"load1", "load5", "load15"} {
				if n, err := strconv.ParseFloat(f[i], 64); err == nil {
					r.Metrics = append(r.Metrics, monitorMetric(key, []string{"系统负载 1 分钟", "系统负载 5 分钟", "系统负载 15 分钟"}[i], n, ""))
				}
			}
		}
	}
	var fs syscall.Statfs_t
	if err := syscall.Statfs(s.mediaDirectory, &fs); err == nil && fs.Blocks > 0 {
		r.Metrics = append(r.Metrics, monitorMetric("disk_total", "上传磁盘总量", float64(fs.Blocks)*float64(fs.Bsize), "bytes"), monitorMetric("disk_available", "上传磁盘可用", float64(fs.Bavail)*float64(fs.Bsize), "bytes"), monitorMetric("disk_percent", "上传磁盘已用比例", 100*float64(fs.Blocks-fs.Bfree)/float64(fs.Blocks), "%"))
	} else {
		r.Status = "partial"
	}
	for _, v := range []struct{ path, key, label string }{{"/sys/fs/cgroup/memory.current", "container_memory", "当前 cgroup 内存"}, {"/sys/fs/cgroup/memory.max", "container_memory_limit", "当前 cgroup 内存上限"}} {
		if b, err := os.ReadFile(v.path); err == nil {
			if n, err := strconv.ParseFloat(strings.TrimSpace(string(b)), 64); err == nil {
				r.Metrics = append(r.Metrics, monitorMetric(v.key, v.label, n, "bytes"))
			}
		}
	}
}
