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
	return uc.db.Transaction(func(tx *gorm.DB) error {
		mutationRepo := postgres.NewStockMutationRepository(tx)
		ingredientRepo := postgres.NewIngredientRepository(tx)
		expenseRepo := postgres.NewExpenseRepository(tx)

		oid := uint(0)
		if len(outletID) > 0 {
			oid = outletID[0]
		}

		mutation := &entity.StockMutation{
			IngredientID: ingredientID,
			Type:         mutationType,
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
		if err := ingredientRepo.UpdateStockAtomic(ingredientID, quantity, operator); err != nil {
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
			exp := &entity.Expense{
				Title:       "Pembelian: " + ingredient.Name,
				Amount:      quantity * costToUse,
				Category:    "Operasional",
				Date:        time.Now(),
				Description: "Auto-generated from Stock In",
				Notes:       notes,
				OutletID:    oid,
			}
			if err := expenseRepo.Create(exp); err != nil {
				return err
			}
			// Sync ke Buku Kas dalam transaksi yang sama.
			// Pola idempoten reference "expense:{id}" mencegah duplikasi
			// saat Owner menjalankan SyncFromTransactions di kemudian hari.
			if exp.ID > 0 && exp.Amount > 0 {
				cashBookRepo := postgres.NewCashBookRepository(tx)
				ref := fmt.Sprintf("expense:%d", exp.ID)
				exists, _ := cashBookRepo.ExistsByReference(ref, oid)
				if !exists {
					_ = cashBookRepo.Create(&entity.CashBook{
						OutletID:    oid,
						Date:        exp.Date,
						Method:      "Lainnya",
						Type:        "expense",
						Amount:      exp.Amount,
						Description: "Pengeluaran: " + exp.Title,
						Reference:   ref,
					})
				}
			}
		}

		// Update master cost per unit if requested
		if updateMasterPrice && newCost > 0 {
			if err := ingredientRepo.UpdateCostPerUnit(ingredientID, newCost); err != nil {
				return err
			}
			productRepo := postgres.NewProductRepository(tx)
			_ = productRepo.RecalculateCosts(ingredientID)
		}

		return nil
	})
}

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

	if err := uc.ingredientRepo.Update(ingredient); err != nil {
		return err
	}

	if oldCost != costPerUnit {
		_ = uc.productRepo.RecalculateCosts(id)
	}

	return nil
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
