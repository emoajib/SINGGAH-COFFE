package usecase

import (
	"fmt"
	"math"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type CashBookUsecase struct {
	db           *gorm.DB
	cashBookRepo repository.CashBookRepository
}

func NewCashBookUsecase(db *gorm.DB) *CashBookUsecase {
	return &CashBookUsecase{
		db:           db,
		cashBookRepo: postgres.NewCashBookRepository(db),
	}
}

func mapCashBookMethod(paymentMethod string) string {
	switch paymentMethod {
	case "Cash":
		return "Cash"
	case "QRIS":
		return "QRIS"
	default:
		return "Lainnya"
	}
}

func (uc *CashBookUsecase) GetAllFiltered(start, end, method, tipe string, outletID ...uint) ([]entity.CashBookResponse, error) {
	items, err := uc.cashBookRepo.FindAllRange(start, end, method, tipe, outletID...)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.CashBookResponse, len(items))
	for i, c := range items {
		resp[i] = c.ToResponse()
	}
	return resp, nil
}

func (uc *CashBookUsecase) GetByID(id uint) (*entity.CashBookResponse, error) {
	c, err := uc.cashBookRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	resp := c.ToResponse()
	return &resp, nil
}

func (uc *CashBookUsecase) Create(c *entity.CashBook, outletID ...uint) (*entity.CashBookResponse, error) {
	if c.Date.IsZero() {
		c.Date = time.Now()
	}
	if len(outletID) > 0 {
		c.OutletID = outletID[0]
	}
	if err := uc.cashBookRepo.Create(c); err != nil {
		return nil, err
	}
	resp := c.ToResponse()
	return &resp, nil
}

func (uc *CashBookUsecase) Update(id uint, c *entity.CashBook) (*entity.CashBookResponse, error) {
	existing, err := uc.cashBookRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	existing.Date = c.Date
	existing.Method = c.Method
	existing.Type = c.Type
	existing.Amount = c.Amount
	existing.Description = c.Description
	existing.Reference = c.Reference
	if err := uc.cashBookRepo.Update(existing); err != nil {
		return nil, err
	}
	resp := existing.ToResponse()
	return &resp, nil
}

func (uc *CashBookUsecase) Delete(id uint) error {
	return uc.cashBookRepo.Delete(id)
}

func (uc *CashBookUsecase) GetTotalsSince(since string, outletID ...uint) (income float64, expense float64, err error) {
	return uc.cashBookRepo.GetTotalsSince(since, outletID...)
}

func (uc *CashBookUsecase) orderRef(orderID uint) string {
	return fmt.Sprintf("order:%d", orderID)
}

func (uc *CashBookUsecase) expenseRef(expenseID uint) string {
	return fmt.Sprintf("expense:%d", expenseID)
}

func (uc *CashBookUsecase) EnsureOrderIncome(o *entity.Order, outletID ...uint) error {
	if o == nil || o.ID == 0 || o.PaymentStatus != "Paid" || o.Status == "Void" {
		return nil
	}
	ref := uc.orderRef(o.ID)
	exists, err := uc.cashBookRepo.ExistsByReference(ref, outletID...)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	desc := "Penjualan " + o.OrderNumber
	if o.CashierName != "" {
		desc += " (kasir " + o.CashierName + ")"
	}
	date := o.OrderTime
	if date.IsZero() {
		date = time.Now()
	}
	return uc.cashBookRepo.Create(&entity.CashBook{
		OutletID:    o.OutletID,
		Date:        date,
		Method:      mapCashBookMethod(o.PaymentMethod),
		Type:        "income",
		Amount:      o.TotalAmount,
		Description: desc,
		Reference:   ref,
	})
}

func (uc *CashBookUsecase) RemoveOrderIncome(orderID uint, outletID ...uint) error {
	_, err := uc.cashBookRepo.DeleteByReference(uc.orderRef(orderID), outletID...)
	return err
}

func (uc *CashBookUsecase) registerCloseRef(registerID uint) string {
	return fmt.Sprintf("cash-register-close:%d", registerID)
}

// EnsureRegisterClose records the cashier shift variance (selisih) into Buku Kas.
// Surplus (variance > 0) is an income; shortage (variance < 0) is an expense.
// No entry is written when variance is exactly zero. Idempotent via reference.
func (uc *CashBookUsecase) EnsureRegisterClose(cr *entity.CashRegister, outletID uint) error {
	if cr == nil || cr.ID == 0 || cr.Variance == 0 {
		return nil
	}
	ref := uc.registerCloseRef(cr.ID)
	exists, err := uc.cashBookRepo.ExistsByReference(ref, outletID)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}
	tipe := "income"
	label := "surplus"
	if cr.Variance < 0 {
		tipe = "expense"
		label = "kekurangan"
	}
	desc := fmt.Sprintf("Selisih tutup kas %s (%s) Rp %.0f", cr.CashierName, label, math.Abs(cr.Variance))
	return uc.cashBookRepo.Create(&entity.CashBook{
		OutletID:    outletID,
		Date:        time.Now(),
		Method:      "Lainnya",
		Type:        tipe,
		Amount:      math.Abs(cr.Variance),
		Description: desc,
		Reference:   ref,
	})
}

type CashBookSyncResult struct {
	OrdersSynced   int64 `json:"orders_synced"`
	ExpensesSynced int64 `json:"expenses_synced"`
}

func (uc *CashBookUsecase) SyncFromTransactions(outletID uint) (*CashBookSyncResult, error) {
	result := &CashBookSyncResult{}

	var orders []entity.Order
	err := uc.db.Raw(
		"SELECT id, order_number, total_amount, payment_method, payment_status, status, cashier_name, outlet_id, order_time "+
			"FROM orders WHERE status = 'Completed' AND payment_status = 'Paid' AND deleted_at IS NULL AND outlet_id = ? "+
			"AND NOT EXISTS (SELECT 1 FROM cash_books cb WHERE cb.reference = CONCAT('order:', orders.id) AND cb.deleted_at IS NULL)",
		outletID,
	).Scan(&orders).Error
	if err != nil {
		return nil, err
	}
	for i := range orders {
		if err := uc.EnsureOrderIncome(&orders[i]); err != nil {
			return nil, err
		}
		result.OrdersSynced++
	}

	type expenseRow struct {
		ID            uint
		Title         string
		Amount        float64
		PaymentMethod string
		Date          time.Time
		OutletID      uint
	}
	var expenses []expenseRow
	err = uc.db.Raw(
		"SELECT id, title, amount, date, outlet_id, COALESCE(payment_method, 'Cash') as payment_method FROM expenses WHERE deleted_at IS NULL AND outlet_id = ? "+
			"AND NOT EXISTS (SELECT 1 FROM cash_books cb WHERE cb.reference = CONCAT('expense:', expenses.id) AND cb.deleted_at IS NULL)",
		outletID,
	).Scan(&expenses).Error
	if err != nil {
		return nil, err
	}
	for _, e := range expenses {
		if e.Amount <= 0 {
			continue
		}
		method := e.PaymentMethod
		if method == "" {
			method = "Cash"
		}
		if err := uc.cashBookRepo.Create(&entity.CashBook{
			OutletID:    e.OutletID,
			Date:        e.Date,
			Method:      method,
			Type:        "expense",
			Amount:      e.Amount,
			Description: "Pengeluaran: " + e.Title,
			Reference:   uc.expenseRef(e.ID),
		}); err != nil {
			return nil, err
		}
		result.ExpensesSynced++
	}

	return result, nil
}
