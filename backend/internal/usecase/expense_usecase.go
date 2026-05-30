package usecase

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
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

func (uc *ExpenseUsecase) Delete(id uint) error {
	return uc.expenseRepo.Delete(id)
}
