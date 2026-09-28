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

type InventoryUsecase struct {
	db             *gorm.DB
	ingredientRepo repository.IngredientRepository
	productRepo    repository.ProductRepository
	mutationRepo   repository.StockMutationRepository
	expenseRepo    repository.ExpenseRepository
	settingRepo    repository.SettingRepository
}

func NewInventoryUsecase(db *gorm.DB) *InventoryUsecase {
	return &InventoryUsecase{
		db:             db,
		ingredientRepo: postgres.NewIngredientRepository(db),
		productRepo:    postgres.NewProductRepository(db),
		mutationRepo:   postgres.NewStockMutationRepository(db),
		expenseRepo:    postgres.NewExpenseRepository(db),
		settingRepo:    postgres.NewSettingRepository(db),
	}
}

func (uc *InventoryUsecase) GetIngredients(outletID ...uint) ([]entity.IngredientResponse, error) {
	ingredients, err := uc.ingredientRepo.FindAll(outletID...)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.IngredientResponse, len(ingredients))
	for i, ing := range ingredients {
		resp[i] = ing.ToResponse()
	}
	return resp, nil
}

func (uc *InventoryUsecase) GetByID(id uint) (*entity.IngredientResponse, error) {
	ingredient, err := uc.ingredientRepo.FindByID(id)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("ingredient")
	}
	resp := ingredient.ToResponse()
	return &resp, nil
}

func (uc *InventoryUsecase) GetStockHistory(ingredientID uint, outletID ...uint) ([]entity.StockMutationResponse, error) {
	mutations, err := uc.mutationRepo.FindByIngredientID(ingredientID, outletID...)
	if err != nil {
		return nil, err
	}
	ingredient, err := uc.ingredientRepo.FindByID(ingredientID)
	ingredientName := ""
	if err == nil && ingredient != nil {
		ingredientName = ingredient.Name
	}
	resp := make([]entity.StockMutationResponse, len(mutations))
	for i, m := range mutations {
		resp[i] = m.ToResponse()
		resp[i].IngredientName = ingredientName
	}
	return resp, nil
}

func (uc *InventoryUsecase) CreateIngredient(req *entity.Ingredient, outletID ...uint) (*entity.IngredientResponse, error) {
	if len(outletID) > 0 {
		req.OutletID = outletID[0]
	}
	if err := uc.ingredientRepo.Create(req); err != nil {
		return nil, err
	}
	resp := req.ToResponse()
	return &resp, nil
}

func (uc *InventoryUsecase) UpdateStock(ingredientID uint, mutationType string, quantity float64, notes string, isPurchase bool, updateMasterPrice bool, newCost float64, outletID ...uint) error {
	return uc.UpdateStockWithLocation(ingredientID, mutationType, quantity, notes, isPurchase, updateMasterPrice, newCost, "kedai", outletID...)
}

// UpdateStockWithLocation adalah versi extended dari UpdateStock yang mendukung dual-location stock.
// location: "warehouse" (stok gudang) atau "kedai" (stok operasional bar).
// Untuk pembelian (isPurchase=true), stok masuk ke location yang ditentukan.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *InventoryUsecase) UpdateStockWithLocation(ingredientID uint, mutationType string, quantity float64, notes string, isPurchase bool, updateMasterPrice bool, newCost float64, location string, outletID ...uint) error {
	return uc.db.Transaction(func(tx *gorm.DB) error {
		mutationRepo := postgres.NewStockMutationRepository(tx)
		ingredientRepo := postgres.NewIngredientRepository(tx)
		expenseRepo := postgres.NewExpenseRepository(tx)

		oid := uint(0)
		if len(outletID) > 0 {
			oid = outletID[0]
		}
		if location == "" {
			location = "kedai"
		}

		mutation := &entity.StockMutation{
			IngredientID: ingredientID,
			Type:         mutationType,
			Location:     location,
			Quantity:     quantity,
			Notes:        notes,
			Date:         time.Now(),
			OutletID:     oid,
		}

		if err := mutationRepo.Create(mutation); err != nil {
			return err
		}

		// Determine stock adjustment direction
		operator := "add"
		if mutationType == string(entity.MutationOut) || mutationType == string(entity.MutationSub) {
			operator = "sub"
		}

		// Update current_stock (total) selalu, lalu update lokasi spesifik
		if err := ingredientRepo.UpdateStockAtomic(ingredientID, quantity, operator); err != nil {
			return err
		}
		if err := ingredientRepo.UpdateStockAtomicByLocation(ingredientID, quantity, operator, location); err != nil {
			return err
		}

		// Create expense record for purchase stock-in dan sync ke Buku Kas
		// dalam transaksi yang sama agar atomik.
		// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
		if isPurchase && mutationType == string(entity.MutationIn) {
			ingredient, err := ingredientRepo.FindByIDForUpdate(ingredientID)
			if err != nil {
				return err
			}
			costToUse := ingredient.CostPerUnit
			if updateMasterPrice && newCost > 0 {
				costToUse = newCost
			}
			// Vetted by AI - Manual Review Required by Senior Engineer/Manager
			// Category "Bahan Baku" + CostType "variable" agar:
			// 1. BEP memperhitungkan HPP via GetTotalByCostType("variable")
			// 2. Profit Sharing tidak salah memasukkan HPP ke basis bagi hasil
			// 3. P&L report memisahkan HPP dari biaya operasional lain
			exp := &entity.Expense{
				Title:       "Pembelian: " + ingredient.Name,
				Amount:      quantity * costToUse,
				Category:    "Bahan Baku",
				CostType:    "variable",
				Date:        time.Now(),
				Description: "Auto-generated from Stock In",
				Notes:       notes,
				OutletID:    oid,
			}
			if err := expenseRepo.Create(exp); err != nil {
				return err
			}
			// PSAK: Create outbox event for journal entry
			outboxRepo := postgres.NewOutboxRepository(tx)
			if err := outboxRepo.Create(&entity.EventOutbox{
				EventType:     "expense.created",
				ReferenceType: "expense",
				ReferenceID:   exp.ID,
				Payload: mustMarshal(map[string]interface{}{
					"id":             exp.ID,
					"amount":         exp.Amount,
					"category":       exp.Category,
					"payment_method": "Lainnya",
					"outlet_id":      oid,
					"date":           exp.Date.Format("2006-01-02"),
					"title":          exp.Title,
				}),
				Status: "pending",
			}); err != nil {
				return err
			}
			// Sync ke Buku Kas — gunakan syncExpenseToCashBook() yang idempoten
			// (DELETE+INSERT via reference "expense:{id}") konsisten dengan expense_usecase.
			// Pola ini aman dipanggil berulang tanpa duplikasi entry Buku Kas.
			// Vetted by AI - Manual Review Required by Senior Engineer/Manager
			if exp.ID > 0 && exp.Amount > 0 {
				cashBookRepo := postgres.NewCashBookRepository(tx)
				syncExpenseToCashBook(cashBookRepo, exp)
			}
		}

		// Update master cost per unit if requested and recalculate product costs
		if updateMasterPrice && newCost > 0 {
			if err := ingredientRepo.UpdateCostPerUnit(ingredientID, newCost); err != nil {
				return err
			}
		}
		// Always recalculate product costs after stock-in so order_items.cost
		// reflects current ingredient prices for accurate P&L/Profit Sharing HPP.
		if isPurchase && mutationType == string(entity.MutationIn) {
			productRepo := postgres.NewProductRepository(tx)
			_ = productRepo.RecalculateCosts(ingredientID)
		}

		return nil
	})
}

// TransferStock memindahkan stok dari gudang (warehouse) ke kedai atau sebaliknya.
// Operasi ini BUKAN pembelian — tidak membuat expense/cash book entry.
// Atomik: kedua sisi (deduct+add) dalam satu transaksi.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *InventoryUsecase) TransferStock(ingredientID uint, quantity float64, from, to string, notes string, outletID ...uint) error {
	if from == to {
		return fmt.Errorf("lokasi asal dan tujuan tidak boleh sama")
	}
	if from != "warehouse" && from != "kedai" {
		return fmt.Errorf("lokasi asal tidak valid: %s", from)
	}
	if to != "warehouse" && to != "kedai" {
		return fmt.Errorf("lokasi tujuan tidak valid: %s", to)
	}
	if quantity <= 0 {
		return fmt.Errorf("jumlah transfer harus lebih dari 0")
	}

	return uc.db.Transaction(func(tx *gorm.DB) error {
		ingredientRepo := postgres.NewIngredientRepository(tx)
		mutationRepo := postgres.NewStockMutationRepository(tx)

		oid := uint(0)
		if len(outletID) > 0 {
			oid = outletID[0]
		}

		// Lock baris ingredient untuk cek stok cukup
		ingredient, err := ingredientRepo.FindByIDForUpdate(ingredientID)
		if err != nil {
			return fmt.Errorf("bahan tidak ditemukan: %w", err)
		}

		// Cek kecukupan stok di lokasi asal
		var fromStock float64
		if from == "warehouse" {
			fromStock = ingredient.WarehouseStock
		} else {
			fromStock = ingredient.KedaiStock
		}
		if fromStock < quantity {
			return fmt.Errorf("stok %s tidak cukup (tersedia: %.2f, diminta: %.2f)", from, fromStock, quantity)
		}

		// Kurangi stok di lokasi asal
		if err := ingredientRepo.UpdateStockAtomicByLocation(ingredientID, quantity, "sub", from); err != nil {
			return fmt.Errorf("gagal kurangi stok %s: %w", from, err)
		}
		// Tambah stok di lokasi tujuan
		if err := ingredientRepo.UpdateStockAtomicByLocation(ingredientID, quantity, "add", to); err != nil {
			return fmt.Errorf("gagal tambah stok %s: %w", to, err)
		}
		// current_stock (total) tidak berubah pada transfer antar lokasi

		// Catat mutasi TRANSFER
		mutation := &entity.StockMutation{
			IngredientID: ingredientID,
			Type:         string(entity.MutationTransfer),
			Location:     to,
			FromLocation: from,
			ToLocation:   to,
			Quantity:     quantity,
			Notes:        notes,
			Date:         time.Now(),
			OutletID:     oid,
		}
		if err := mutationRepo.Create(mutation); err != nil {
			return fmt.Errorf("gagal catat mutasi transfer: %w", err)
		}

		return nil
	})
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *InventoryUsecase) UpdateIngredient(id uint, name, category, unit, purchaseUnit string, purchaseUnitSize, costPerUnit, minStock float64) error {
	ingredient, err := uc.ingredientRepo.FindByID(id)
	if err != nil {
		return domainErrors.NewNotFoundError("ingredient")
	}

	oldCost := ingredient.CostPerUnit
	ingredient.Name = name
	ingredient.Category = category
	ingredient.Unit = unit
	ingredient.PurchaseUnit = purchaseUnit
	ingredient.PurchaseUnitSize = purchaseUnitSize
	ingredient.CostPerUnit = costPerUnit
	ingredient.MinStock = minStock

	return uc.db.Transaction(func(tx *gorm.DB) error {
		ingRepo := postgres.NewIngredientRepository(tx)
		if err := ingRepo.Update(ingredient); err != nil {
			return err
		}

		if oldCost != costPerUnit {
			productRepo := postgres.NewProductRepository(tx)
			if err := productRepo.RecalculateCosts(id); err != nil {
				return err
			}
		}
		return nil
	})
}

func (uc *InventoryUsecase) GetLowStockAlerts(outletID ...uint) ([]entity.IngredientResponse, error) {
	ingredients, err := uc.ingredientRepo.FindLowStock(10, outletID...)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.IngredientResponse, len(ingredients))
	for i, ing := range ingredients {
		resp[i] = ing.ToResponse()
	}
	return resp, nil
}

func (uc *InventoryUsecase) DeleteIngredient(id uint) error {
	// Cek apakah ada produk yang masih menggunakan bahan ini di resepnya
	type Dep struct {
		ProductID   uint
		ProductName string
	}
	var deps []Dep
	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	uc.db.Raw(`
		SELECT ri.product_id, p.name AS product_name
		FROM recipe_items ri
		JOIN products p ON p.id = ri.product_id
		WHERE ri.ingredient_id = ? AND p.deleted_at IS NULL
	`, id).Scan(&deps)

	if len(deps) > 0 {
		names := ""
		for i, d := range deps {
			if i > 0 {
				names += ", "
			}
			names += d.ProductName
		}
		return fmt.Errorf("bahan ini masih digunakan di resep produk: %s. Hapus resep terlebih dahulu sebelum menghapus bahan", names)
	}

	return uc.db.Transaction(func(tx *gorm.DB) error {
		ingredientRepo := postgres.NewIngredientRepository(tx)

		// Clean up associated stock mutations
		tx.Exec("DELETE FROM stock_mutations WHERE ingredient_id = ?", id)

		return ingredientRepo.Delete(id)
	})
}
