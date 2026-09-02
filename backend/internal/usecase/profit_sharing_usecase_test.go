package usecase

import (
	"testing"
)

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func TestParseDatePS(t *testing.T) {
	tests := []struct {
		input    string
		expected string // formatted in WIB "2006-01-02 15:04:05"
	}{
		{
			input:    "2026-08-23T16:00:00+07:00",
			expected: "2026-08-23 16:00:00",
		},
		{
			input:    "2026-08-23T16:00:00 07:00", // query param with + decoded as space
			expected: "2026-08-23 16:00:00",
		},
		{
			input:    "2026-08-23T09:00:00Z", // UTC ISO string
			expected: "2026-08-23 16:00:00",
		},
		{
			input:    "2026-08-23T16:00:00",
			expected: "2026-08-23 16:00:00",
		},
		{
			input:    "2026-08-23T16:00",
			expected: "2026-08-23 16:00:00",
		},
		{
			input:    "2026-08-23 16:00:00",
			expected: "2026-08-23 16:00:00",
		},
		{
			input:    "2026-08-23",
			expected: "2026-08-23 00:00:00",
		},
	}

	for _, tt := range tests {
		res := parseDatePS(tt.input)
		if res.IsZero() {
			t.Errorf("parseDatePS(%q) returned zero time, expected %s", tt.input, tt.expected)
			continue
		}
		formatted := res.In(wib).Format("2006-01-02 15:04:05")
		if formatted != tt.expected {
			t.Errorf("parseDatePS(%q) = %s; want %s", tt.input, formatted, tt.expected)
		}
	}
}
