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
	// MaxOpenConns=10 → max 5 watcher threads (aman untuk ulimit -u rendah).
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get sql.DB: %v", err)
	}
	sqlDB.SetMaxOpenConns(10)
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
		&models.PSAKAccount{},
		&models.PSAKJournalEntry{},
		&models.PSAKJournalEntryItem{},
		&models.PSAKEventOutbox{},
		&models.PSAKSchemaVersion{},
		&models.ProfitSharingPerson{},
		&models.BaristaCashbon{},
		// Loyalty & Customer Feedback - Vetted by AI
		&models.Customer{},
		&models.LoyaltyProgram{},
		&models.LoyaltyStamp{},
		&models.LoyaltyRedemption{},
		&models.CustomerFeedback{},
		// Master Data Barista - Vetted by AI
		&models.Barista{},
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

	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	// Bersihkan antrian lampau: pesanan dari sebelum hari ini yang berstatus Completed
	// otomatis diset kitchen_status = 'served' agar tidak memenuhi antrian aktif barista
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	if err := db.Model(&models.Order{}).
		Where("order_time < ? AND kitchen_status IN ('queued', 'preparing', 'ready') AND status = 'Completed'", startOfDay).
		Update("kitchen_status", "served").Error; err != nil {
		log.Printf("Notice: historical kitchen queue cleanup skipped: %v", err)
	}

	// Seed Default Baristas if not exists (Salman & Rio)
	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	var baristaCount int64
	db.Model(&models.Barista{}).Count(&baristaCount)
	if baristaCount == 0 {
		defaultBaristas := []models.Barista{
			{
				OutletID:        1,
				Name:            "SALMAN",
				DefaultSharePct: 20.0,
				Status:          "active",
				Notes:           "Barista Utama",
			},
			{
				OutletID:        1,
				Name:            "RIO",
				DefaultSharePct: 20.0,
				Status:          "active",
				Notes:           "Barista Utama",
			},
		}
		db.Create(&defaultBaristas)
		log.Println("Seeded default active baristas (SALMAN & RIO)")
	}

	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	// Standardize historical expense categories in database to the 6 canonical categories:
	// 1. Operasional
	// 2. Bahan Baku (HPP)
	// 3. Gaji & Upah
	// 4. Pemeliharaan & Servis
	// 5. Pemasaran / Marketing
	// 6. Lainnya
	db.Exec("UPDATE expenses SET category = 'Operasional' WHERE LOWER(TRIM(category)) IN ('operational', 'biaya tetap', 'fixed', 'beban operasional', 'operasional rutin')")
	db.Exec("UPDATE expenses SET category = 'Bahan Baku (HPP)' WHERE LOWER(TRIM(category)) IN ('bahan baku', 'hpp', 'cogs', 'raw material')")
	db.Exec("UPDATE expenses SET category = 'Gaji & Upah' WHERE LOWER(TRIM(category)) IN ('salary', 'gaji', 'upah', 'honor', 'bagi hasil')")
	db.Exec("UPDATE expenses SET category = 'Pemeliharaan & Servis' WHERE LOWER(TRIM(category)) IN ('maintenance', 'pemeliharaan', 'servis', 'perawatan')")
	db.Exec("UPDATE expenses SET category = 'Pemasaran / Marketing' WHERE LOWER(TRIM(category)) IN ('marketing', 'pemasaran', 'promosi', 'iklan')")
	db.Exec("UPDATE expenses SET category = 'Peralatan' WHERE LOWER(TRIM(category)) IN ('peralatan', 'equipment', 'alat', 'perlengkapan alat', 'tools', 'inventaris')")
	db.Exec("UPDATE expenses SET category = 'Lainnya' WHERE LOWER(TRIM(category)) IN ('other', 'misc') OR category = '' OR category IS NULL")

	// Ensure cash_books has sub_type and investor_name (idempotent / non-blocking)
	_ = db.Exec("ALTER TABLE cash_books ADD COLUMN IF NOT EXISTS sub_type VARCHAR(30) NOT NULL DEFAULT ''")
	_ = db.Exec("ALTER TABLE cash_books ADD COLUMN IF NOT EXISTS investor_name VARCHAR(100) NOT NULL DEFAULT ''")

	return db
}
