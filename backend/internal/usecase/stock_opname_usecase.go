package usecase

import (
	"fmt"
	"strings"
	"time"

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

// parseOpnameDate mengurai string tanggal baik "2006-01-02" maupun RFC3339.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func parseOpnameDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Now(), nil
	}
	// Coba format YYYY-MM-DD
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t, nil
	}
	// Coba format RFC3339 (dengan waktu / T)
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	if t, err := time.Parse("2006-01-02 15:04:05", s); err == nil {
		return t, nil
	}
	return time.Time{}, fmt.Errorf("format tanggal tidak valid: %s", s)
}

func (uc *StockOpnameUsecase) Create(req request.CreateStockOpnameRequest, outletID, userID uint) (*entity.StockOpname, error) {
	from, err := parseOpnameDate(req.PeriodFrom)
	if err != nil {
		return nil, err
	}
	to, err := parseOpnameDate(req.PeriodTo)
	if err != nil {
		return nil, err
	}
	if to.Before(from) {
		to = from
	}
	opname := &entity.StockOpname{
		OutletID:   outletID,
		PeriodFrom: from,
		PeriodTo:   to,
		Notes:      req.Notes,
		CreatedBy:  userID,
		Items:      make([]entity.StockOpnameItem, 0, len(req.Items)),
	}
	for _, it := range req.Items {
		ing, err := uc.ingredientRepo.FindByID(it.IngredientID)
		if err != nil {
			return nil, err
		}
		sys := ing.KedaiStock
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

func (uc *StockOpnameUsecase) Update(id uint, req request.CreateStockOpnameRequest) (*entity.StockOpname, error) {
	from, err := parseOpnameDate(req.PeriodFrom)
	if err != nil {
		return nil, err
	}
	to, err := parseOpnameDate(req.PeriodTo)
	if err != nil {
		return nil, err
	}
	if to.Before(from) {
		to = from
	}
	existing, err := uc.opnameRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	existing.PeriodFrom = from
	existing.PeriodTo = to
	existing.Notes = req.Notes
	existing.Items = make([]entity.StockOpnameItem, 0, len(req.Items))
	for _, it := range req.Items {
		ing, err := uc.ingredientRepo.FindByID(it.IngredientID)
		if err != nil {
			return nil, err
		}
		sys := ing.KedaiStock
		existing.Items = append(existing.Items, entity.StockOpnameItem{
			OpnameID:       id,
			IngredientID:   it.IngredientID,
			IngredientName: ing.Name,
			Unit:           ing.Unit,
			SystemStock:    sys,
			PhysicalStock:  it.PhysicalStock,
			Difference:     it.PhysicalStock - sys,
			Note:           it.Note,
		})
	}
	if err := uc.opnameRepo.Update(existing); err != nil {
		return nil, err
	}
	return existing, nil
}

func (uc *StockOpnameUsecase) Delete(id uint) error {
	return uc.opnameRepo.Delete(id)
}

func (uc *StockOpnameUsecase) List(outletID uint) ([]entity.StockOpname, error) {
	return uc.opnameRepo.FindAll(outletID)
}

func (uc *StockOpnameUsecase) Get(id uint) (*entity.StockOpname, error) {
	return uc.opnameRepo.FindByID(id)
}
