package handler

import (
	"encoding/json"
	"testing"
)

// Error "format people tidak valid" terjadi karena AttendanceModal mengirim
// attendance sebagai OBJEK JSON, sedangkan parser lama hanya terima string.
func TestNormalizeAttendance_Forms(t *testing.T) {
	cases := []struct {
		name  string
		raw   string
		want  string
	}{
		{"objek dari modal", `{"2026-10-01":[1,2],"2026-10-02":[1]}`, `{"2026-10-01":[1,2],"2026-10-02":[1]}`},
		{"string lama", `"{\"2026-10-01\":[1]}"`, `{"2026-10-01":[1]}`},
		{"kosong", ``, ``},
		{"null", `null`, ``},
		{"objek kosong", `{}`, `{}`},
	}
	for _, tc := range cases {
		if got := normalizeAttendance([]byte(tc.raw)); got != tc.want {
			t.Errorf("%s: got %q want %q", tc.name, got, tc.want)
		}
	}

	// Bentuk objek harus bisa di-unmarshal ke map seperti dipakai kalkulator.
	req := profitSharingPersonRequest{}
	if err := json.Unmarshal([]byte(`{"name":"RIO","attendance":{"2026-10-01":[1]}}`), &req); err != nil {
		t.Fatalf("parse orang dengan attendance objek: %v", err)
	}
	if e := req.toEntity(); e.Attendance != `{"2026-10-01":[1]}` {
		t.Errorf("toEntity attendance: got %q", e.Attendance)
	}
}
