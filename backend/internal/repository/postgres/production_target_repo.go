package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type productionTargetRepository struct {
	db *gorm.DB
}

func NewProductionTargetRepository(db *gorm.DB) *productionTargetRepository {
	return &productionTargetRepository{db: db}
}

func (r *productionTargetRepository) FindAll(outletID ...uint) ([]entity.ProductionTarget, error) {
	tx := r.db
	tx = scopeOutlet(tx, "production_targets", outletID...)
	var ms []models.ProductionTarget
	if err := tx.Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.ProductionTarget, len(ms))
	for i, m := range ms {
		result[i] = entity.ProductionTarget{
			ProductID: m.ProductID,
			TargetCup: m.TargetCup,
		}
	}
	return result, nil
}

// ReplaceAll wipes targets for the outlet and inserts the given set atomically.
func (r *productionTargetRepository) ReplaceAll(targets []entity.ProductionTarget, outletID uint) error {
	if outletID == 0 {
		outletID = 1
	}
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("outlet_id = ?", outletID).Delete(&models.ProductionTarget{}).Error; err != nil {
			return err
		}
		if len(targets) == 0 {
			return nil
		}
		rows := make([]models.ProductionTarget, len(targets))
		for i, t := range targets {
			rows[i] = models.ProductionTarget{
				ProductID: t.ProductID,
				TargetCup: t.TargetCup,
				OutletID:  outletID,
			}
		}
		return tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "product_id"}, {Name: "outlet_id"}}, UpdateAll: true}).Create(&rows).Error
	})
}
