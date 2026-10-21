//go:build linux

package service

import "testing"

func TestMonitorLinuxParsers(t *testing.T) {
	total, idle := parseCPU("cpu 10 20 30 40 50 60 70 80 90 100\ncpu0 1 2 3 4")
	if total != 360 || idle != 90 {
		t.Fatalf("guest double counted: %d %d", total, idle)
	}
	total, _ = parseCPU("bad data")
	if total != 0 {
		t.Fatal("bad proc data accepted")
	}
	mem := memoryValues("MemTotal: 1024 kB\nMemAvailable: 256 kB\ninvalid")
	if mem["MemTotal"] != 1048576 || mem["MemAvailable"] != 262144 {
		t.Fatal(mem)
	}
}
