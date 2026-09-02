package usecase

import (
	"fmt"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

// Hanya kategori "Salary" yang dilindungi karena di-generate otomatis dari
// profit sharing. Kategori lain ("Operational", "Marketing", "Maintenance",
// "Misc") sah dibuat manual oleh kasir/manager.
var protectedExpenseCategories = map[string]bool{
	"Salary": true,
}

// ExpenseUsecase mengelola logika bisnis pengeluaran.
// Setiap operasi CRUD expense secara otomatis disinkronkan ke Buku Kas
// menggunakan pola idempoten reference "expense:{id}" yang sama dengan Order.
// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
type ExpenseUsecase struct {
	expenseRepo  repository.ExpenseRepository
	cashBookRepo repository.CashBookRepository
}

func NewExpenseUsecase(db *gorm.DB) *ExpenseUsecase {
	return &ExpenseUsecase{
		expenseRepo:  postgres.NewExpenseRepository(db),
		cashBookRepo: postgres.NewCashBookRepository(db),
	}
}

// expenseRef menghasilkan reference key idempoten untuk entry Buku Kas.
func expenseRef(expenseID uint) string {
	return fmt.Sprintf("expense:%d", expenseID)
}

// syncExpenseToCashBook memastikan entry Buku Kas selalu mencerminkan nilai terkini.
// Strategi: hapus entry lama (jika ada) lalu buat baru — upsert logis.
// Best-effort: error diabaikan agar tidak memblok alur utama kasir/manager.
// Pola ini idempoten dengan SyncFromTransactions milik Owner.
func (uc *ExpenseUsecase) syncExpenseToCashBook(expense *entity.Expense) {
	if expense.ID == 0 || expense.Amount <= 0 {
		return
	}
	ref := expenseRef(expense.ID)
	date := expense.Date
	if date.IsZero() {
		date = time.Now()
	}
	method := expense.PaymentMethod
	if method == "" {
		method = "Cash"
	}
	// Hapus entry lama untuk memastikan amount dan method selalu terbaru (upsert logis).
	_, _ = uc.cashBookRepo.DeleteByReference(ref, expense.OutletID)
	// Buat entry baru dengan metode pembayaran yang sesuai (Cash / QRIS / Lainnya).
	_ = uc.cashBookRepo.Create(&entity.CashBook{
		OutletID:    expense.OutletID,
		Date:        date,
		Method:      method,
		Type:        "expense",
		Amount:      expense.Amount,
		Description: "Pengeluaran: " + expense.Title,
		Reference:   ref,
	})
}

func (uc *ExpenseUsecase) GetAll(outletID ...uint) ([]entity.ExpenseResponse, error) {
	expenses, err := uc.expenseRepo.FindAll(outletID...)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.ExpenseResponse, len(expenses))
	for i, e := range expenses {
		resp[i] = e.ToResponse()
	}
	return resp, nil
}

func (uc *ExpenseUsecase) GetAllFiltered(start, end, category string, outletID ...uint) ([]entity.ExpenseResponse, error) {
	expenses, err := uc.expenseRepo.FindAllRange(start, end, category, outletID...)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.ExpenseResponse, len(expenses))
	for i, e := range expenses {
		resp[i] = e.ToResponse()
	}
	return resp, nil
}

// Create menyimpan expense dan langsung sync ke Buku Kas secara real-time.
// GAP 1 FIX: sebelumnya tidak ada sync ke Buku Kas sama sekali.
func (uc *ExpenseUsecase) Create(expense *entity.Expense, outletID ...uint) (*entity.ExpenseResponse, error) {
	if protectedExpenseCategories[expense.Category] {
		return nil, domainErrors.NewInvalidInputError("kategori ini tidak bisa dibuat secara manual")
	}
	if expense.Date.IsZero() {
		expense.Date = time.Now()
	}
	if expense.PaymentMethod == "" {
		expense.PaymentMethod = "Cash"
	}
	if len(outletID) > 0 {
		expense.OutletID = outletID[0]
	}
	if err := uc.expenseRepo.Create(expense); err != nil {
		return nil, err
	}
	// Sync real-time ke Buku Kas (best-effort, tidak memblok response).
	uc.syncExpenseToCashBook(expense)
	resp := expense.ToResponse()
	return &resp, nil
}

// Update memperbarui expense dan menyegarkan entry Buku Kas.
// GAP 3 FIX: sebelumnya edit expense tidak mengupdate Buku Kas → data stale.
// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ExpenseUsecase) Update(id uint, expense *entity.Expense) (*entity.ExpenseResponse, error) {
	existing, err := uc.expenseRepo.FindByID(id)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("expense not found")
	}
	if protectedExpenseCategories[existing.Category] {
		return nil, domainErrors.NewInvalidInputError("kategori ini tidak bisa diubah")
	}

	existing.Title = expense.Title
	existing.Amount = expense.Amount
	existing.Category = expense.Category
	existing.CostType = expense.CostType
	if expense.PaymentMethod != "" {
		existing.PaymentMethod = expense.PaymentMethod
	}
	if !expense.Date.IsZero() {
		existing.Date = expense.Date
	}
	existing.Description = expense.Description
	existing.Notes = expense.Notes

	if err := uc.expenseRepo.Update(existing); err != nil {
		return nil, err
	}
	// Sync update ke Buku Kas: hapus lama → buat baru dengan nilai terkini.
	uc.syncExpenseToCashBook(existing)
	resp := existing.ToResponse()
	return &resp, nil
}

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *ExpenseUsecase) UpdateCostType(id uint, costType string) error {
	existing, err := uc.expenseRepo.FindByID(id)
	if err != nil {
		return domainErrors.NewNotFoundError("expense not found")
	}
	existing.CostType = costType
	return uc.expenseRepo.Update(existing)
}

// Delete menghapus expense dan membersihkan entry Buku Kas terkait.
// GAP 2 FIX: sebelumnya hapus expense meninggalkan orphan entry di Buku Kas.
// Mencegah hapus expense dengan kategori terlindung (Salary dari profit sharing).
func (uc *ExpenseUsecase) Delete(id uint) error {
	existing, err := uc.expenseRepo.FindByID(id)
	if err != nil {
		return domainErrors.NewNotFoundError("expense not found")
	}
	if protectedExpenseCategories[existing.Category] {
		return domainErrors.NewInvalidInputError("kategori ini tidak bisa dihapus")
	}
	// Hapus entry Buku Kas terlebih dahulu (best-effort, tidak memblok).
	_, _ = uc.cashBookRepo.DeleteByReference(expenseRef(id))
	return uc.expenseRepo.Delete(id)
}
