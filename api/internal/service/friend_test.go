package service

import "testing"

func TestValidExternalURL(t *testing.T) {
	for _, tc := range []struct {
		value string
		valid bool
	}{
		{"https://example.com/articles?q=go", true},
		{"http://example.com", false},
		{"javascript:alert(1)", false},
		{"https://user:pass@example.com", false},
		{"https://", false},
	} {
		if got := validExternalURL(tc.value); got != tc.valid {
			t.Errorf("validExternalURL(%q) = %t, want %t", tc.value, got, tc.valid)
		}
	}
}
