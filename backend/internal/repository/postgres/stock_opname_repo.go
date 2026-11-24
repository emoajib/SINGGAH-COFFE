package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository"

	"gorm.io/gorm"
)

type stockOpnameRepository struct {
	db *gorm.DB
}

func NewStockOpnameRepository(db *gorm.DB) repository.StockOpnameRepository {
	return &stockOpnameRepository{db: db}
}

func (r *stockOpnameRepository) Create(opname *entity.StockOpname) error {
	m := models.StockOpname{
		OutletID:   opname.OutletID,
		PeriodFrom:  opname.PeriodFrom,
		PeriodTo:    opname.PeriodTo,
		Notes:       opname.Notes,
		CreatedBy:   opname.CreatedBy,
	}
	items := make([]models.StockOpnameItem, len(opname.Items))
	for i, it := range opname.Items {
		items[i] = models.StockOpnameItem{
			IngredientID:  it.IngredientID,
			SystemStock:   it.SystemStock,
			PhysicalStock: it.PhysicalStock,
			Difference:    it.Difference,
			Unit:          it.Unit,
			Note:          it.Note,
		}
	}
	m.Items = items
	if err := r.db.Create(&m).Error; err != nil {
		return err
	}
	opname.ID = m.ID
	opname.CreatedAt = m.CreatedAt
	for i := range m.Items {
		if i < len(opname.Items) {
			opname.Items[i].ID = m.Items[i].ID
		}
	}
	return nil
}

func (r *stockOpnameRepository) Update(opname *entity.StockOpname) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var m models.StockOpname
		if err := tx.First(&m, opname.ID).Error; err != nil {
			return err
		}
		m.PeriodFrom = opname.PeriodFrom
		m.PeriodTo = opname.PeriodTo
		m.Notes = opname.Notes
		if err := tx.Save(&m).Error; err != nil {
			return err
		}
		// Hapus item lama, masukkan item baru
		if err := tx.Where("opname_id = ?", opname.ID).Delete(&models.StockOpnameItem{}).Error; err != nil {
			return err
		}
		for _, it := range opname.Items {
			itemModel := models.StockOpnameItem{
				OpnameID:      opname.ID,
				IngredientID:  it.IngredientID,
				SystemStock:   it.SystemStock,
				PhysicalStock: it.PhysicalStock,
				Difference:    it.Difference,
				Unit:          it.Unit,
				Note:          it.Note,
			}
			if err := tx.Create(&itemModel).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *stockOpnameRepository) Delete(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("opname_id = ?", id).Delete(&models.StockOpnameItem{}).Error; err != nil {
			return err
		}
		return tx.Delete(&models.StockOpname{}, id).Error
	})
}

func (r *stockOpnameRepository) FindByID(id uint) (*entity.StockOpname, error) {
	var m models.StockOpname
	if err := r.db.Preload("Items.Ingredient").First(&m, id).Error; err != nil {
		return nil, err
	}
	return toEntityStockOpname(m), nil
}

func (r *stockOpnameRepository) FindAll(outletID ...uint) ([]entity.StockOpname, error) {
	var ms []models.StockOpname
	q := r.db.Preload("Items.Ingredient").Order("created_at DESC")
	if len(outletID) > 0 && outletID[0] > 0 {
		q = q.Where("outlet_id = ?", outletID[0])
	}
	if err := q.Find(&ms).Error; err != nil {
		return nil, err
	}
	res := make([]entity.StockOpname, len(ms))
	for i, m := range ms {
		res[i] = *toEntityStockOpname(m)
	}
	return res, nil
}

func toEntityStockOpname(m models.StockOpname) *entity.StockOpname {
	items := make([]entity.StockOpnameItem, len(m.Items))
	for i, it := range m.Items {
		name := ""
		unit := it.Unit
		if it.Ingredient.ID > 0 {
			name = it.Ingredient.Name
			if unit == "" {
				unit = it.Ingredient.Unit
			}
		}
		items[i] = entity.StockOpnameItem{
			ID:            it.ID,
			OpnameID:      it.OpnameID,
			IngredientID:  it.IngredientID,
			IngredientName: name,
			Unit:          unit,
			SystemStock:   it.SystemStock,
			PhysicalStock: it.PhysicalStock,
			Difference:    it.Difference,
			Note:          it.Note,
		}
	}
	return &entity.StockOpname{
		ID:         m.ID,
		OutletID:   m.OutletID,
		PeriodFrom: m.PeriodFrom,
		PeriodTo:   m.PeriodTo,
		Notes:      m.Notes,
		CreatedBy:  m.CreatedBy,
		CreatedAt:  m.CreatedAt,
		Items:      items,
	}
}
