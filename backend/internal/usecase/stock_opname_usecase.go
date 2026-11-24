package usecase

import (
	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type StockOpnameUsecase struct {
	db              *gorm.DB
	opnameRepo      repository.StockOpnameRepository
	ingredientRepo  repository.IngredientRepository
}

func NewStockOpnameUsecase(db *gorm.DB) *StockOpnameUsecase {
	return &StockOpnameUsecase{
		db:             db,
		opnameRepo:     postgres.NewStockOpnameRepository(db),
		ingredientRepo: postgres.NewIngredientRepository(db),
	}
}

func (uc *StockOpnameUsecase) Create(req request.CreateStockOpnameRequest, outletID, userID uint) (*entity.StockOpname, error) {
	if req.PeriodTo.Before(req.PeriodFrom) {
		return nil, nil
	}
	opname := &entity.StockOpname{
		OutletID:   outletID,
		PeriodFrom: req.PeriodFrom,
		PeriodTo:   req.PeriodTo,
		Notes:      req.Notes,
		CreatedBy:  userID,
		Items:      make([]entity.StockOpnameItem, 0, len(req.Items)),
	}
	for _, it := range req.Items {
		ing, err := uc.ingredientRepo.FindByID(it.IngredientID)
		if err != nil {
			return nil, err
		}
		sys := ing.CurrentStock
		opname.Items = append(opname.Items, entity.StockOpnameItem{
			IngredientID:   it.IngredientID,
			IngredientName: ing.Name,
			Unit:           ing.Unit,
			SystemStock:    sys,
			PhysicalStock:  it.PhysicalStock,
			Difference:     it.PhysicalStock - sys,
			Note:           it.Note,
		})
	}
	if err := uc.opnameRepo.Create(opname); err != nil {
		return nil, err
	}
	return opname, nil
}

func (uc *StockOpnameUsecase) List(outletID uint) ([]entity.StockOpname, error) {
	return uc.opnameRepo.FindAll(outletID)
}

func (uc *StockOpnameUsecase) Get(id uint) (*entity.StockOpname, error) {
	return uc.opnameRepo.FindByID(id)
}
