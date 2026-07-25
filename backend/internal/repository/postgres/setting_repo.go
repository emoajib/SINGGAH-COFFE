package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type settingRepository struct {
	db *gorm.DB
}

func NewSettingRepository(db *gorm.DB) *settingRepository {
	return &settingRepository{db: db}
}

func (r *settingRepository) FindAll() ([]entity.Setting, error) {
	var ms []models.Setting
	if err := r.db.Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.Setting, len(ms))
	for i, m := range ms {
		result[i] = entity.Setting{
			ID:           m.ID,
			Key:          m.Key,
			Value:        m.Value,
			SettingGroup: m.SettingGroup,
		}
	}
	return result, nil
}

func (r *settingRepository) FindByGroup(group string) ([]entity.Setting, error) {
	var ms []models.Setting
	if err := r.db.Where("setting_group = ?", group).Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.Setting, len(ms))
	for i, m := range ms {
		result[i] = entity.Setting{
			ID:           m.ID,
			Key:          m.Key,
			Value:        m.Value,
			SettingGroup: m.SettingGroup,
		}
	}
	return result, nil
}

func (r *settingRepository) FindByKey(key string) (*entity.Setting, error) {
	var m models.Setting
	if err := r.db.Where("key = ?", key).First(&m).Error; err != nil {
		return nil, err
	}
	return &entity.Setting{
		ID:           m.ID,
		Key:          m.Key,
		Value:        m.Value,
		SettingGroup: m.SettingGroup,
	}, nil
}

func (r *settingRepository) Upsert(key, value, group string) error {
	var m models.Setting
	result := r.db.Where("key = ?", key).First(&m)
	if result.Error == gorm.ErrRecordNotFound {
		return r.db.Create(&models.Setting{
			Key:          key,
			Value:        value,
			SettingGroup: group,
		}).Error
	}
	return r.db.Model(&m).Update("value", value).Error
}
