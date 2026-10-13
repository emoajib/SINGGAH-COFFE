package usecase

import (
	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type OutletUsecase struct {
	db         *gorm.DB
	outletRepo repository.OutletRepository
}

func NewOutletUsecase(db *gorm.DB) *OutletUsecase {
	return &OutletUsecase{
		db:         db,
		outletRepo: postgres.NewOutletRepository(db),
	}
}

func (uc *OutletUsecase) GetAll() ([]entity.OutletResponse, error) {
	outlets, err := uc.outletRepo.FindAll()
	if err != nil {
		return nil, err
	}
	resp := make([]entity.OutletResponse, len(outlets))
	for i, o := range outlets {
		resp[i] = o.ToResponse()
	}
	return resp, nil
}

func (uc *OutletUsecase) GetByID(id uint) (*entity.OutletResponse, error) {
	outlet, err := uc.outletRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	resp := outlet.ToResponse()
	return &resp, nil
}

func (uc *OutletUsecase) Create(in *entity.Outlet) (*entity.OutletResponse, error) {
	if err := uc.outletRepo.Create(in); err != nil {
		return nil, err
	}
	resp := in.ToResponse()
	return &resp, nil
}

func (uc *OutletUsecase) Update(id uint, in *entity.Outlet) (*entity.OutletResponse, error) {
	in.ID = id
	if err := uc.outletRepo.Update(in); err != nil {
		return nil, err
	}
	outlet, err := uc.outletRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	resp := outlet.ToResponse()
	return &resp, nil
}

func (uc *OutletUsecase) Delete(id uint) error {
	// Larang hapus outlet terakhir & outlet yang masih punya dependen.
	var outletCount int64
	uc.db.Model(&models.Outlet{}).Count(&outletCount)
	if outletCount <= 1 {
		return domainErrors.NewInvalidInputError("tidak dapat menghapus satu-satunya outlet")
	}
	deps := map[string]interface{}{
		"users": &models.User{}, "orders": &models.Order{},
		"ingredients": &models.Ingredient{}, "expenses": &models.Expense{},
		"cash_registers": &models.CashRegister{}, "cash_books": &models.CashBook{},
		"attendances": &models.Attendance{}, "schedules": &models.Schedule{},
	}
	for table, model := range deps {
		var c int64
		uc.db.Model(model).Where("outlet_id = ?", id).Count(&c)
		if c > 0 {
			return domainErrors.NewInvalidInputError("outlet masih memiliki " + table + " aktif, arsipkan dulu sebelum hapus")
		}
	}
	return uc.outletRepo.Delete(id)
}
