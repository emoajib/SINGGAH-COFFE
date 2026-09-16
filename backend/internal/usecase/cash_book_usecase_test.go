package usecase

import (
	"testing"
	"time"

	"singgah-pos-backend/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func TestCashBookUsecase_ExchangeCash(t *testing.T) {
	db := setupSimulationDB(t)
	uc := NewCashBookUsecase(db)

	outletID := uint(1)
	createdBy := uint(10)

	t.Run("Success Cash to QRIS", func(t *testing.T) {
		req := ExchangeCashRequest{
			FromMethod:  "Cash",
			ToMethod:    "QRIS",
			Amount:      200000,
			Date:        time.Date(2026, 9, 15, 12, 0, 0, 0, time.UTC),
			Description: "RIO TUKAR QRIS KE CASH",
		}

		res, err := uc.ExchangeCash(req, outletID, createdBy)
		require.NoError(t, err)
		require.NotNil(t, res)

		assert.Equal(t, "expense", res.DebitEntry.Type)
		assert.Equal(t, "Cash", res.DebitEntry.Method)
		assert.Equal(t, float64(200000), res.DebitEntry.Amount)

		assert.Equal(t, "income", res.CreditEntry.Type)
		assert.Equal(t, "QRIS", res.CreditEntry.Method)
		assert.Equal(t, float64(200000), res.CreditEntry.Amount)

		// Verify in DB directly
		var all []models.CashBook
		err = db.Where("outlet_id = ?", outletID).Find(&all).Error
		require.NoError(t, err)
		assert.Len(t, all, 2)
	})

	t.Run("Fails Same Method", func(t *testing.T) {
		req := ExchangeCashRequest{
			FromMethod: "Cash",
			ToMethod:   "Cash",
			Amount:     100000,
		}
		res, err := uc.ExchangeCash(req, outletID, createdBy)
		assert.Error(t, err)
		assert.Nil(t, res)
		assert.Contains(t, err.Error(), "tidak boleh sama")
	})

	t.Run("Fails Zero or Negative Amount", func(t *testing.T) {
		req := ExchangeCashRequest{
			FromMethod: "Cash",
			ToMethod:   "QRIS",
			Amount:     0,
		}
		res, err := uc.ExchangeCash(req, outletID, createdBy)
		assert.Error(t, err)
		assert.Nil(t, res)
		assert.Contains(t, err.Error(), "harus lebih dari 0")
	})

	t.Run("Fails Invalid Method", func(t *testing.T) {
		req := ExchangeCashRequest{
			FromMethod: "Bitcoin",
			ToMethod:   "Cash",
			Amount:     50000,
		}
		res, err := uc.ExchangeCash(req, outletID, createdBy)
		assert.Error(t, err)
		assert.Nil(t, res)
		assert.Contains(t, err.Error(), "metode tidak valid")
	})
}
