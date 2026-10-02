package handler

import (
	"bytes"
	"testing"
)

func TestWriteEvent(t *testing.T) {
	for _, test := range []struct {
		message string
		want    string
	}{
		{"site", "event: site\ndata: {}\n\n"},
		{`{"kind":"post","title":"Test","slug":"test"}`, "event: published\ndata: {\"kind\":\"post\",\"title\":\"Test\",\"slug\":\"test\"}\n\n"},
	} {
		var body bytes.Buffer
		if err := writeEvent(&body, test.message); err != nil {
			t.Fatal(err)
		}
		if body.String() != test.want {
			t.Fatalf("event frame = %q, want %q", body.String(), test.want)
		}
	}
}
