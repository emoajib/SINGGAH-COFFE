package usecase

import (
	"testing"

	"singgah-pos-backend/internal/domain/entity"
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
			expected: "2026-08-23 23:59:59", // H1: date-only → end of day
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

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func TestCalcFinancialsBasisTypeAndLeaveReduction(t *testing.T) {
	// Sample data from user:
	// Basis (Gross Revenue) = 4,598,000
	// COGS = 2,395,589 -> Gross Margin = 2,202,411
	// Expenses = 397,500 -> Net Profit = 1,804,911
	basis := 4598000.0
	cogs := 2395589.0
	expenses := 397500.0
	ratio := 40.0
	ownerPct := 60.0

	// Test 1: Basis Type Net vs Gross
	resNet := calcFinancials(basis, cogs, expenses, ratio, nil, ownerPct, nil, 0, 0, "net", 14)
	if resNet.SharingBasis != 1804911.0 {
		t.Errorf("expected Net SharingBasis to be 1804911, got %v", resNet.SharingBasis)
	}

	resGross := calcFinancials(basis, cogs, expenses, ratio, nil, ownerPct, nil, 0, 0, "gross", 14)
	if resGross.SharingBasis != 2202411.0 {
		t.Errorf("expected Gross SharingBasis to be 2202411, got %v", resGross.SharingBasis)
	}

	// Test 2: Multi-person with Barista Leave Days
	// 14 day period. RIO leaves 2 days (12 days attendance), SALMAN 0 days leave (14 days attendance)
	people := []entity.ProfitSharingPerson{
		{Name: "Owner", Role: "owner", SharePct: 60},
		{Name: "RIO", Role: "barista", SharePct: 20, LeaveDays: 2},
		{Name: "SALMAN", Role: "barista", SharePct: 20, LeaveDays: 0},
	}

	resMulti := calcFinancials(basis, cogs, expenses, ratio, nil, ownerPct, people, 0, 0, "net", 14)

	// Owner base = math.Round(1804911 * 0.60 / 250) * 250 = 1083000
	// Barista pool = 1804911 - 1083000 = 721911
	// Normal share per barista (20% out of 40% = 50% of barista pool) = math.Round(721911 * 0.5 / 250) * 250 = 361000
	// RIO leave reduction (2 / 14) = math.Round(361000 * 2 / 14 / 250) * 250 = 51500
	// RIO final amount = 361000 - 51500 = 309500
	// SALMAN final amount = 361000
	// Owner final amount = 1083000 + 51500 = 1134500

	var rio, salman, owner entity.ProfitSharingPerson
	for _, p := range people {
		if p.Name == "RIO" {
			rio = p
		} else if p.Name == "SALMAN" {
			salman = p
		} else if p.Name == "Owner" {
			owner = p
		}
	}

	if rio.LeaveReduction != 51500 {
		t.Errorf("expected RIO LeaveReduction to be 51500, got %v", rio.LeaveReduction)
	}
	if rio.Amount != 309500 {
		t.Errorf("expected RIO Amount to be 309500, got %v", rio.Amount)
	}
	if salman.Amount != 361000 {
		t.Errorf("expected SALMAN Amount to be 361000, got %v", salman.Amount)
	}
	if owner.Amount != 1134500 {
		t.Errorf("expected Owner Amount to be 1134500, got %v", owner.Amount)
	}
	if resMulti.OwnerAmount != 1134500 {
		t.Errorf("expected resMulti.OwnerAmount to be 1134500, got %v", resMulti.OwnerAmount)
	}
}
