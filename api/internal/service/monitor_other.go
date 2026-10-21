//go:build !linux

package service

import "github.com/kakozane/kakozane-blog/api/internal/model"

func (s *MonitorService) systemMetrics(r *model.MonitorComponent) {
	r.Status = "partial"
	r.Message = "当前非 Linux 环境，仅提供 Go 进程指标；系统 CPU、内存和磁盘指标在 Linux 部署后可用。"
}
