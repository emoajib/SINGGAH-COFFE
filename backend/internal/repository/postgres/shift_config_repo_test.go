package postgres

import (
	"testing"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"github.com/stretchr/testify/assert"
)

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func TestShiftConfig_ModelDomainMapping(t *testing.T) {
	now := time.Now()
	m := &models.ShiftConfig{
		ID:             1,
		OutletID:       10,
		Name:           "Shift 1 (Pagi)",
		StartTime:      "07:00",
		EndTime:        "14:00",
		OwnerPct:       60.0,
		BaristaPoolPct: 40.0,
		IsActive:       true,
		SortOrder:      1,
		CreatedAt:      now,
		UpdatedAt:      now,
	}

	d := toDomainShiftConfig(m)
	assert.Equal(t, uint(1), d.ID)
	assert.Equal(t, uint(10), d.OutletID)
	assert.Equal(t, "Shift 1 (Pagi)", d.Name)
	assert.Equal(t, "07:00", d.StartTime)
	assert.Equal(t, "14:00", d.EndTime)
	assert.Equal(t, 60.0, d.OwnerPct)
	assert.Equal(t, 40.0, d.BaristaPoolPct)
	assert.True(t, d.IsActive)
	assert.Equal(t, 1, d.SortOrder)

	mBack := toModelShiftConfig(&d)
	assert.Equal(t, m.ID, mBack.ID)
	assert.Equal(t, m.Name, mBack.Name)
	assert.Equal(t, m.StartTime, mBack.StartTime)
	assert.Equal(t, m.EndTime, mBack.EndTime)
	assert.Equal(t, m.OwnerPct, mBack.OwnerPct)
	assert.Equal(t, m.BaristaPoolPct, mBack.BaristaPoolPct)
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func TestProfitSharingPerson_ShiftFieldsMapping(t *testing.T) {
	shiftID := uint(2)
	p := entity.ProfitSharingPerson{
		ID:            5,
		PeriodID:      1,
		Name:          "Barista A",
		Role:          "barista",
		SharePct:      20.0,
		ShiftIDs:      []uint{shiftID},
		ShiftNames:    []string{"Shift 2 (Siang)"},
		ShiftPoolPcts: []float64{50.0},
	}

	m := toModelPerson(p)
	assert.Equal(t, uint(5), m.ID)
	assert.Equal(t, "[2]", m.ShiftIDs)
	assert.Equal(t, `["Shift 2 (Siang)"]`, m.ShiftNames)
	assert.Equal(t, "[50]", m.ShiftPoolPcts)

	dBack := toDomainPerson(m)
	assert.Equal(t, p.ID, dBack.ID)
	assert.Equal(t, []uint{shiftID}, dBack.ShiftIDs)
	assert.Equal(t, []string{"Shift 2 (Siang)"}, dBack.ShiftNames)
	assert.Equal(t, []float64{50.0}, dBack.ShiftPoolPcts)
}
