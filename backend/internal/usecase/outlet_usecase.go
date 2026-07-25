package usecase

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type OutletUsecase struct {
	outletRepo repository.OutletRepository
}

func NewOutletUsecase(db *gorm.DB) *OutletUsecase {
	return &OutletUsecase{
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
	return uc.outletRepo.Delete(id)
}
