package usecase

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type SettingsUsecase struct {
	settingRepo repository.SettingRepository
}

func NewSettingsUsecase(db *gorm.DB) *SettingsUsecase {
	return &SettingsUsecase{
		settingRepo: postgres.NewSettingRepository(db),
	}
}

func (uc *SettingsUsecase) GetAll(group string) ([]entity.Setting, error) {
	var settings []entity.Setting
	var err error

	if group != "" {
		settings, err = uc.settingRepo.FindByGroup(group)
	} else {
		settings, err = uc.settingRepo.FindAll()
	}

	if err != nil {
		return nil, err
	}
	return settings, nil
}

func (uc *SettingsUsecase) Update(settings entity.SettingMap) error {
	for key, value := range settings {
		if err := uc.settingRepo.Upsert(key, value, "general"); err != nil {
			return err
		}
	}
	return nil
}
