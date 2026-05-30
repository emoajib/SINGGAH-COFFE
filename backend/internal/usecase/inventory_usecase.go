package usecase

import (
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
	mutationRepo   repository.StockMutationRepository
	expenseRepo    repository.ExpenseRepository
	settingRepo    repository.SettingRepository
}

func NewInventoryUsecase(db *gorm.DB) *InventoryUsecase {
	return &InventoryUsecase{
		db:             db,
		ingredientRepo: postgres.NewIngredientRepository(db),
		mutationRepo:   postgres.NewStockMutationRepository(db),
		expenseRepo:    postgres.NewExpenseRepository(db),
		settingRepo:    postgres.NewSettingRepository(db),
	}
}

func (uc *InventoryUsecase) GetIngredients() ([]entity.IngredientResponse, error) {
	ingredients, err := uc.ingredientRepo.FindAll()
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

func (uc *InventoryUsecase) GetStockHistory(ingredientID uint) ([]entity.StockMutationResponse, error) {
	mutations, err := uc.mutationRepo.FindByIngredientID(ingredientID)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.StockMutationResponse, len(mutations))
	for i, m := range mutations {
		resp[i] = m.ToResponse()
	}
	return resp, nil
}

func (uc *InventoryUsecase) CreateIngredient(req *entity.Ingredient) (*entity.IngredientResponse, error) {
	if err := uc.ingredientRepo.Create(req); err != nil {
		return nil, err
	}
	resp := req.ToResponse()
	return &resp, nil
}

func (uc *InventoryUsecase) UpdateStock(ingredientID uint, mutationType string, quantity float64, notes string, isPurchase bool, updateMasterPrice bool, newCost float64) error {
	return uc.db.Transaction(func(tx *gorm.DB) error {
		mutationRepo := postgres.NewStockMutationRepository(tx)
		ingredientRepo := postgres.NewIngredientRepository(tx)
		expenseRepo := postgres.NewExpenseRepository(tx)

		mutation := &entity.StockMutation{
			IngredientID: ingredientID,
			Type:         mutationType,
			Quantity:     quantity,
			Notes:        notes,
			Date:         time.Now(),
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

		// Create expense record for purchase stock-in
		if isPurchase && mutationType == string(entity.MutationIn) {
			ingredient, err := ingredientRepo.FindByID(ingredientID)
			if err != nil {
				return err
			}
			costToUse := ingredient.CostPerUnit
			if updateMasterPrice && newCost > 0 {
				costToUse = newCost
			}
			expenseRepo.Create(&entity.Expense{
				Title:       "Pembelian: " + ingredient.Name,
				Amount:      quantity * costToUse,
				Category:    "Operasional",
				Date:        time.Now(),
				Description: "Auto-generated from Stock In",
				Notes:       notes,
			})
		}

		// Update master cost per unit if requested
		if updateMasterPrice && newCost > 0 {
			if err := ingredientRepo.UpdateCostPerUnit(ingredientID, newCost); err != nil {
				return err
			}
		}

		return nil
	})
}

func (uc *InventoryUsecase) UpdateIngredient(id uint, name, unit string, costPerUnit, minStock float64) error {
	ingredient, err := uc.ingredientRepo.FindByID(id)
	if err != nil {
		return domainErrors.NewNotFoundError("ingredient")
	}

	ingredient.Name = name
	ingredient.Unit = unit
	ingredient.CostPerUnit = costPerUnit
	ingredient.MinStock = minStock

	return uc.ingredientRepo.Update(ingredient)
}

func (uc *InventoryUsecase) DeleteIngredient(id uint) error {
	return uc.db.Transaction(func(tx *gorm.DB) error {
		ingredientRepo := postgres.NewIngredientRepository(tx)

		// Clean up associated recipe items and mutations before deleting
		tx.Exec("DELETE FROM recipe_items WHERE ingredient_id = ?", id)
		tx.Exec("DELETE FROM stock_mutations WHERE ingredient_id = ?", id)

		return ingredientRepo.Delete(id)
	})
}
