package database

import (
	"log"
	"time"
	"singgah-pos-backend/internal/config"
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/pkg/password"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func Connect(cfg config.Config) *gorm.DB {
	db, err := gorm.Open(mysql.Open(cfg.DatabaseURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Shared-hosting hardening: batasi connection pool agar jumlah OS thread
	// yang dibuat go-sql-driver/mysql (1 thread watcher per koneksi) tidak
	// melampaui ulimit -u server. Tanpa ini aplikasi rawan crash
	// "fatal error: newosproc" saat koneksi DB menumpuk (mis. export PDF).
	// MaxOpenConns=5 → max 5 watcher threads (aman untuk ulimit -u rendah).
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get sql.DB: %v", err)
	}
	sqlDB.SetMaxOpenConns(5)
	sqlDB.SetMaxIdleConns(2)
	sqlDB.SetConnMaxIdleTime(60 * time.Second)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

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
		&models.CashRegister{},
		&models.CashBook{},
		&models.ProductionTarget{},
		&models.ProfitSharingPeriod{},
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
			{Key: "outlet_phone", Value: "", SettingGroup: "profile"},
			{Key: "outlet_address", Value: "", SettingGroup: "profile"},
			{Key: "tax_percentage", Value: "10", SettingGroup: "tax"},
			{Key: "service_charge", Value: "5", SettingGroup: "tax"},
			{Key: "printer_connection", Value: "network", SettingGroup: "printer"},
			{Key: "printer_ip", Value: "", SettingGroup: "printer"},
			{Key: "printer_bluetooth_address", Value: "", SettingGroup: "printer"},
			{Key: "printer_width", Value: "80mm", SettingGroup: "printer"},
			{Key: "auto_print", Value: "true", SettingGroup: "printer"},
			{Key: "pwa_background_color", Value: "#4B3621", SettingGroup: "appearance"},
			{Key: "pwa_theme_color", Value: "#F5F0E6", SettingGroup: "appearance"},
		}
		db.Create(&defaultSettings)
		log.Println("Seeded default settings")
	}

	// Ensure PWA color settings exist for older databases
	pwaKeys := []string{"pwa_background_color", "pwa_theme_color"}
	pwaDefaults := map[string]string{
		"pwa_background_color": "#4B3621",
		"pwa_theme_color":      "#F5F0E6",
	}
	for _, key := range pwaKeys {
		var count int64
		db.Model(&models.Setting{}).Where("`key` = ?", key).Count(&count)
		if count == 0 {
			db.Create(&models.Setting{Key: key, Value: pwaDefaults[key], SettingGroup: "appearance"})
			log.Printf("Seeded missing setting: %s", key)
		}
	}

	// Seed Default Outlet if not exists
	var outletCount int64
	db.Model(&models.Outlet{}).Count(&outletCount)
	if outletCount == 0 {
		defaultOutlet := models.Outlet{
			Name: "Singgah Coffee",
			Code: "SGH-001",
		}
		db.Create(&defaultOutlet)

		// Assign existing users to default outlet
		db.Model(&models.User{}).Where("outlet_id = 0 OR outlet_id IS NULL").Update("outlet_id", defaultOutlet.ID)
		log.Println("Seeded default outlet and assigned users")
	}

	return db
}
