package database

import (
	"log"
	"singgah-pos-backend/internal/config"
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/pkg/password"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Connect(cfg config.Config) *gorm.DB {
	db, err := gorm.Open(postgres.New(postgres.Config{DSN: cfg.DatabaseURL}), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto Migrate the schema with error checking
	log.Println("Running Auto Migration...")
	err = db.AutoMigrate(
		&models.User{},
		&models.Product{},
		&models.Ingredient{},
		&models.RecipeItem{},
		&models.StockMutation{},
		&models.Order{},
		&models.OrderItem{},
		&models.Setting{},
		&models.Expense{},
		&models.ProcessedWebhook{},
		&entity.TokenBlacklist{},
		&models.Outlet{},
	)
	if err != nil {
		log.Printf("AutoMigrate failed: %v", err)
	}

	// Seed Default Owner if not exists
	var userCount int64
	db.Model(&models.User{}).Count(&userCount)
	if userCount == 0 {
		log.Println("WARNING: Default admin credentials detected — please change password immediately")
		hashedPassword, err := password.HashPassword("admin")
		if err != nil {
			log.Fatalf("Failed to hash default admin password: %v", err)
		}
		admin := models.User{
			Name:     "Owner Singgah",
			Email:    "owner@singgah.coffee",
			Password: hashedPassword,
			Role:     "owner",
		}
		if result := db.Create(&admin); result.Error != nil {
			log.Fatalf("Failed to seed default admin user: %v", result.Error)
		}
		log.Println("Seeded default admin user")
	}

	// Seed Default Settings if not exists
	var settingCount int64
	db.Model(&models.Setting{}).Count(&settingCount)
	if settingCount == 0 {
		defaultSettings := []models.Setting{
			{Key: "outlet_name", Value: "Singgah Coffee", SettingGroup: "profile"},
			{Key: "outlet_phone", Value: "+62 812-3456-7890", SettingGroup: "profile"},
			{Key: "outlet_address", Value: "Jl. Example No. 123, Jakarta Selatan", SettingGroup: "profile"},
			{Key: "tax_percentage", Value: "10", SettingGroup: "tax"},
			{Key: "service_charge", Value: "5", SettingGroup: "tax"},
			{Key: "printer_connection", Value: "network", SettingGroup: "printer"},
			{Key: "printer_ip", Value: "", SettingGroup: "printer"},
			{Key: "printer_bluetooth_address", Value: "", SettingGroup: "printer"},
			{Key: "printer_width", Value: "80mm", SettingGroup: "printer"},
			{Key: "auto_print", Value: "true", SettingGroup: "printer"},
		}
		db.Create(&defaultSettings)
		log.Println("Seeded default settings")
	}

	// Seed Default Outlet if not exists
	var outletCount int64
	db.Model(&models.Outlet{}).Count(&outletCount)
	if outletCount == 0 {
		defaultOutlet := models.Outlet{
			Name:    "Singgah Coffee",
			Address: "Jl. Example No. 123, Jakarta Selatan",
			Phone:   "+62 812-3456-7890",
			Code:    "SGH-001",
		}
		db.Create(&defaultOutlet)

		// Assign existing users to default outlet
		db.Model(&models.User{}).Where("outlet_id = 0 OR outlet_id IS NULL").Update("outlet_id", defaultOutlet.ID)
		log.Println("Seeded default outlet and assigned users")
	}

	return db
}
