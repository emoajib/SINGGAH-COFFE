package usecase

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type ExpenseUsecase struct {
	expenseRepo repository.ExpenseRepository
}

func NewExpenseUsecase(db *gorm.DB) *ExpenseUsecase {
	return &ExpenseUsecase{
		expenseRepo: postgres.NewExpenseRepository(db),
	}
}

func (uc *ExpenseUsecase) GetAll() ([]entity.ExpenseResponse, error) {
	expenses, err := uc.expenseRepo.FindAll()
	if err != nil {
		return nil, err
	}
	resp := make([]entity.ExpenseResponse, len(expenses))
	for i, e := range expenses {
		resp[i] = e.ToResponse()
	}
	return resp, nil
}

func (uc *ExpenseUsecase) Create(expense *entity.Expense) (*entity.ExpenseResponse, error) {
	if expense.Date.IsZero() {
		expense.Date = time.Now()
	}
	if err := uc.expenseRepo.Create(expense); err != nil {
		return nil, err
	}
	resp := expense.ToResponse()
	return &resp, nil
}

func (uc *ExpenseUsecase) Update(id uint, expense *entity.Expense) (*entity.ExpenseResponse, error) {
	existing, err := uc.expenseRepo.FindByID(id)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("expense not found")
	}

	existing.Title = expense.Title
	existing.Amount = expense.Amount
	existing.Category = expense.Category
	if !expense.Date.IsZero() {
		existing.Date = expense.Date
	}
	existing.Description = expense.Description
	existing.Notes = expense.Notes

	if err := uc.expenseRepo.Update(existing); err != nil {
		return nil, err
	}
	resp := existing.ToResponse()
	return &resp, nil
}

func (uc *ExpenseUsecase) Delete(id uint) error {
	return uc.expenseRepo.Delete(id)
}
