package model

import "time"

type MonitorLog struct {
	ID         int64     `json:"id"`
	Kind       string    `json:"kind"`
	Scope      string    `json:"scope"`
	UserID     int64     `json:"userId"`
	Username   string    `json:"username"`
	Method     string    `json:"method"`
	Route      string    `json:"route"`
	TargetID   string    `json:"targetId"`
	Status     int       `json:"status"`
	DurationMS int64     `json:"durationMs"`
	IP         string    `json:"ip"`
	UserAgent  string    `json:"userAgent"`
	CreatedAt  time.Time `json:"createdAt"`
}

type MonitorLogFilter struct {
	Kind, Scope, Result, Query string
	From, To                   time.Time
	Page, PageSize             int
}

type MonitorMetric struct {
	Key   string  `json:"key"`
	Label string  `json:"label"`
	Value float64 `json:"value"`
	Unit  string  `json:"unit"`
}

type MonitorComponent struct {
	Status          string             `json:"status"`
	Message         string             `json:"message,omitempty"`
	Metrics         []MonitorMetric    `json:"metrics"`
	Connection      *MonitorConnection `json:"connection,omitempty"`
	Details         []MonitorDetail    `json:"details,omitempty"`
	Tables          []MonitorTable     `json:"tables,omitempty"`
	TablesTruncated bool               `json:"tablesTruncated,omitempty"`
	Keyspaces       []MonitorKeyspace  `json:"keyspaces,omitempty"`
}

type MonitorConnection struct {
	Host          string   `json:"host"`
	Port          string   `json:"port"`
	Database      string   `json:"database"`
	ResolvedIPs   []string `json:"resolvedIPs"`
	ResolveFailed bool     `json:"resolveFailed,omitempty"`
}

type MonitorDetail struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Value string `json:"value"`
}

type MonitorTable struct {
	Schema     string     `json:"schema"`
	Name       string     `json:"name"`
	Type       string     `json:"type"`
	Engine     *string    `json:"engine"`
	Rows       *int64     `json:"rows"`
	DataBytes  *int64     `json:"dataBytes"`
	IndexBytes *int64     `json:"indexBytes"`
	Collation  *string    `json:"collation"`
	CreatedAt  *time.Time `json:"createdAt"`
}

type MonitorKeyspace struct {
	Database int   `json:"database"`
	Keys     int64 `json:"keys"`
	Expires  int64 `json:"expires"`
	AvgTTLMS int64 `json:"avgTtlMs"`
}

type MonitorRoute struct {
	Method       string  `json:"method"`
	Route        string  `json:"route"`
	Requests     uint64  `json:"requests"`
	Errors       uint64  `json:"errors"`
	ClientErrors uint64  `json:"clientErrors"`
	Slow         uint64  `json:"slow"`
	TotalMS      float64 `json:"-"`
	AverageMS    float64 `json:"averageMs"`
	MaxMS        float64 `json:"maxMs"`
}

type MonitorPoint struct {
	CPU      *float64  `json:"cpu,omitempty"`
	Memory   *float64  `json:"memory,omitempty"`
	At       time.Time `json:"at"`
	Requests uint64    `json:"requests"`
	Errors   uint64    `json:"errors"`
}

type MonitorSnapshot struct {
	SampledAt     time.Time        `json:"sampledAt"`
	StartedAt     time.Time        `json:"startedAt"`
	Server        MonitorComponent `json:"server"`
	MySQL         MonitorComponent `json:"mysql"`
	Redis         MonitorComponent `json:"redis"`
	Routes        []MonitorRoute   `json:"routes"`
	History       []MonitorPoint   `json:"history"`
	DroppedLogs   uint64           `json:"droppedLogs"`
	FailedLogs    uint64           `json:"failedLogs"`
	CleanupFailed bool             `json:"cleanupFailed"`
	QueueDepth    int              `json:"queueDepth"`
}
