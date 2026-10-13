package usecase

import (
	"fmt"
	"strconv"
	"strings"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
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
		if err := validateSetting(key, value); err != nil {
			return err
		}
		if err := uc.settingRepo.Upsert(key, value, groupForKey(key)); err != nil {
			return err
		}
	}
	return nil
}

// allowlist kunci setting yang boleh ditulis via API + validasi nilainya.
func validateSetting(key, value string) error {
	v := strings.TrimSpace(value)
	switch key {
	case "tax_percentage", "service_charge":
		f, err := strconv.ParseFloat(v, 64)
		if err != nil || f < 0 || f > 100 {
			return domainErrors.NewInvalidInputError(fmt.Sprintf("setting %s harus angka 0-100", key))
		}
	case "self_order_enabled", "auto_print", "enable_stock_alerts", "manager_accounting_access":
		if v != "true" && v != "false" {
			return domainErrors.NewInvalidInputError(fmt.Sprintf("setting %s harus true/false", key))
		}
	case "stock_planning_period_days", "cashbon_max_per_request", "cashbon_max_outstanding", "printer_width":
		if v != "" {
			if _, err := strconv.ParseFloat(v, 64); err != nil {
				return domainErrors.NewInvalidInputError(fmt.Sprintf("setting %s harus angka", key))
			}
		}
	case "outlet_name", "outlet_phone", "outlet_address", "outlet_logo_url",
		"printer_connection", "printer_ip", "printer_bluetooth_address",
		"pwa_background_color", "pwa_theme_color", "default_opening_float":
		// bebas (teks)
	default:
		return domainErrors.NewInvalidInputError(fmt.Sprintf("kunci setting tidak dikenal: %s", key))
	}
	return nil
}

func groupForKey(key string) string {
	switch key {
	case "tax_percentage", "service_charge":
		return "tax"
	case "outlet_name", "outlet_phone", "outlet_address", "outlet_logo_url":
		return "profile"
	case "printer_connection", "printer_ip", "printer_bluetooth_address", "printer_width", "auto_print":
		return "printer"
	case "manager_accounting_access":
		return "security"
	default:
		return "general"
	}
}
