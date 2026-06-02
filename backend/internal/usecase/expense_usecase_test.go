package usecase

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/models"
)

// Helper function to create a test database for expense tests
func setupExpenseTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to database: " + err.Error())
	}
	
	// Migrate the schema
	db.AutoMigrate(&models.Expense{})
	return db
}

// Helper function to create a test usecase for expense tests
func createExpenseUsecase(db *gorm.DB) *ExpenseUsecase {
	return NewExpenseUsecase(db)
}

func TestExpenseUsecase_CreateSuccess(t *testing.T) {
	// Setup
	db := setupExpenseTestDB()
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	
	uc := createExpenseUsecase(db)

	// Execute
	expense := &entity.Expense{
		Title:     "Test Expense",
		Amount:    100.50,
		Category:  "Operational",
		CostType:  "fixed",
		Description: "Test expense description",
	}
	resp, err := uc.Create(expense)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, "Test Expense", resp.Title)
	assert.Equal(t, 100.50, resp.Amount)
	assert.Equal(t, "Operational", resp.Category)
	assert.Equal(t, "fixed", resp.CostType)
	assert.Equal(t, "Test expense description", resp.Description)
}

func TestExpenseUsecase_GetAllEmpty(t *testing.T) {
	// Setup
	db := setupExpenseTestDB()
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	
	uc := createExpenseUsecase(db)

	// Execute
	expenses, err := uc.GetAll()

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, expenses)
	assert.Len(t, expenses, 0)
}

func TestExpenseUsecase_GetAllWithData(t *testing.T) {
	// Setup
	db := setupExpenseTestDB()
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	
	uc := createExpenseUsecase(db)

	// Create test data
	expense1 := &entity.Expense{
		Title:     "Expense One",
		Amount:    50.00,
		Category:  "Operational",
		CostType:  "fixed",
	}
	expense2 := &entity.Expense{
		Title:     "Expense Two",
		Amount:    75.25,
		Category:  "Marketing",
		CostType:  "variable",
	}
	uc.Create(expense1)
	uc.Create(expense2)

	// Execute
	expenses, err := uc.GetAll()

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, expenses)
	assert.Len(t, expenses, 2)
	// Due to ordering by date desc, id desc, the most recent comes first
	assert.Equal(t, "Expense Two", expenses[0].Title)
	assert.Equal(t, "Expense One", expenses[1].Title)
}

func TestExpenseUsecase_UpdateSuccess(t *testing.T) {
	// Setup
	db := setupExpenseTestDB()
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	
	uc := createExpenseUsecase(db)

	// Create test expense
	expense := &entity.Expense{
		Title:     "Original Title",
		Amount:    100.00,
		Category:  "Operational",
		CostType:  "fixed",
	}
	createdResp, err := uc.Create(expense)
	assert.NoError(t, err)
	assert.NotNil(t, createdResp)

	// Execute
	updatedExpense := &entity.Expense{
		Title:     "Updated Title",
		Amount:    150.00,
		Category:  "Marketing",
		CostType:  "variable",
		Description: "Updated description",
	}
	resp, err := uc.Update(createdResp.ID, updatedExpense)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, "Updated Title", resp.Title)
	assert.Equal(t, 150.00, resp.Amount)
	assert.Equal(t, "Marketing", resp.Category)
	assert.Equal(t, "variable", resp.CostType)
	assert.Equal(t, "Updated description", resp.Description)
}

func TestExpenseUsecase_UpdateNotFound(t *testing.T) {
	// Setup
	db := setupExpenseTestDB()
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	
	uc := createExpenseUsecase(db)

	// Execute
	expense := &entity.Expense{
		Title:     "Non-existent Expense",
		Amount:    100.00,
		Category:  "Operational",
		CostType:  "fixed",
	}
	_, err := uc.Update(999, expense) // Non-existent ID

	// Assert
	assert.Error(t, err)
	assert.ErrorIs(t, err, errors.ErrNotFound)
}

func TestExpenseUsecase_DeleteSuccess(t *testing.T) {
	// Setup
	db := setupExpenseTestDB()
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	
	uc := createExpenseUsecase(db)

	// Create test expense
	expense := &entity.Expense{
		Title:     "Expense to Delete",
		Amount:    100.00,
		Category:  "Operational",
		CostType:  "fixed",
	}
	createdResp, err := uc.Create(expense)
	assert.NoError(t, err)
	assert.NotNil(t, createdResp)

	// Execute
	err = uc.Delete(createdResp.ID)

	// Assert
	assert.NoError(t, err)

	// Verify deletion
	expenses, err := uc.GetAll()
	assert.NoError(t, err)
	assert.NotNil(t, expenses)
	assert.Len(t, expenses, 0)
}

func TestExpenseUsecase_UpdateCostTypeSuccess(t *testing.T) {
	// Setup
	db := setupExpenseTestDB()
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	
	uc := createExpenseUsecase(db)

	// Create test expense
	expense := &entity.Expense{
		Title:     "Expense for CostType Update",
		Amount:    100.00,
		Category:  "Operational",
		CostType:  "fixed",
	}
	createdResp, err := uc.Create(expense)
	assert.NoError(t, err)
	assert.NotNil(t, createdResp)

	// Execute
	err = uc.UpdateCostType(createdResp.ID, "variable")

	// Assert
	assert.NoError(t, err)

	// Verify update
	expenses, err := uc.GetAll()
	assert.NoError(t, err)
	assert.NotNil(t, expenses)
	assert.Len(t, expenses, 1)
	assert.Equal(t, "variable", expenses[0].CostType)
}

func TestExpenseUsecase_UpdateCostTypeNotFound(t *testing.T) {
	// Setup
	db := setupExpenseTestDB()
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	
	uc := createExpenseUsecase(db)

	// Execute
	err := uc.UpdateCostType(999, "variable") // Non-existent ID

	// Assert
	assert.Error(t, err)
	assert.ErrorIs(t, err, errors.ErrNotFound)
}