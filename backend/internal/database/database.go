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
		&models.ShiftConfig{}, // Multi-shift bagi hasil - Vetted by AI
		// Bagi hasil per-shift: jadwal, kehadiran, instance shift, audit (tanpa soft-delete, K1)
		&models.ShiftInstance{},
		&models.Schedule{},
		&models.Attendance{},
		&models.AuditLog{},
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

	// Ensure PWA color settings and alert settings exist for older databases
	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	requiredSettings := map[string]struct {
		value string
		group string
	}{
		"pwa_background_color": {"#4B3621", "appearance"},
		"pwa_theme_color":      {"#F5F0E6", "appearance"},
		"enable_stock_alerts":  {"true", "notifications"},
	}
	for key, meta := range requiredSettings {
		var count int64
		db.Model(&models.Setting{}).Where("`key` = ?", key).Count(&count)
		if count == 0 {
			db.Create(&models.Setting{Key: key, Value: meta.value, SettingGroup: meta.group})
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
	// Uses ensureColumn helper for MySQL version compatibility (< 8.0.29 doesn't support IF NOT EXISTS)
	ensureColumn(db, "cash_books", "sub_type", "VARCHAR(30) NOT NULL DEFAULT ''")
	ensureColumn(db, "cash_books", "investor_name", "VARCHAR(100) NOT NULL DEFAULT ''")

	// Ensure orders has self-order tracking columns (idempotent / non-blocking)
	ensureColumn(db, "orders", "order_source", "VARCHAR(20) NOT NULL DEFAULT 'cashier'")
	ensureColumn(db, "orders", "customer_phone", "VARCHAR(30) NOT NULL DEFAULT ''")
	ensureColumn(db, "orders", "tracking_token", "VARCHAR(64) NOT NULL DEFAULT ''")
	ensureColumn(db, "orders", "pickup_code", "VARCHAR(10) NOT NULL DEFAULT ''")
	ensureColumn(db, "order_items", "notes", "VARCHAR(100) NOT NULL DEFAULT ''")

	// Ensure ingredients has warehouse_stock & kedai_stock for dual-location stock (idempotent / non-blocking)
	ensureColumn(db, "ingredients", "warehouse_stock", "DECIMAL(10,3) NOT NULL DEFAULT 0")
	ensureColumn(db, "ingredients", "kedai_stock", "DECIMAL(10,3) NOT NULL DEFAULT 0")
	ensureColumn(db, "stock_mutations", "location", "VARCHAR(20) NOT NULL DEFAULT 'kedai'")
	ensureColumn(db, "stock_mutations", "from_location", "VARCHAR(20) NOT NULL DEFAULT ''")
	ensureColumn(db, "stock_mutations", "to_location", "VARCHAR(20) NOT NULL DEFAULT ''")

	// Bagi hasil per-shift: kolom baru idempoten untuk database lama.
	ensureColumn(db, "orders", "shift_instance_id", "BIGINT UNSIGNED NULL")
	ensureColumn(db, "expenses", "shift_instance_id", "BIGINT UNSIGNED NULL")
	ensureColumn(db, "expenses", "is_shared", "BOOLEAN NOT NULL DEFAULT FALSE")
	ensureColumn(db, "profit_sharing_periods", "pool_pct", "DOUBLE NOT NULL DEFAULT 40")
	ensureColumn(db, "profit_sharing_periods", "ratio_effective_date", "DATETIME NULL")
	ensureColumn(db, "profit_sharing_periods", "ratio_locked_at", "DATETIME NULL")
	ensureColumn(db, "profit_sharing_periods", "rounding_remainder", "DOUBLE NOT NULL DEFAULT 0")
	ensureColumn(db, "barista_cashbons", "remaining_balance", "DOUBLE NOT NULL DEFAULT 0")
	ensureColumn(db, "barista_cashbons", "recorded_by", "BIGINT UNSIGNED NOT NULL DEFAULT 0")
	ensureColumn(db, "barista_cashbons", "approved_by", "BIGINT UNSIGNED NULL")

	// Backfill: jika kedai_stock masih 0 dan current_stock > 0, set kedai_stock = current_stock (backward compatibility)
	_ = db.Exec("UPDATE ingredients SET kedai_stock = current_stock WHERE (kedai_stock = 0 OR kedai_stock IS NULL) AND current_stock > 0")

	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	// Rekonsiliasi data stok otomatis (Self-Healing Migration):
	// Menyelaraskan kedai_stock yang tidak sinkron akibat transaksi POS versi terdahulu.
	_ = db.Exec("UPDATE ingredients SET kedai_stock = CASE WHEN current_stock >= warehouse_stock THEN current_stock - warehouse_stock ELSE 0 END WHERE ((warehouse_stock + kedai_stock) - current_stock > 0.001 OR current_stock - (warehouse_stock + kedai_stock) > 0.001) AND (warehouse_stock > 0 OR kedai_stock > 0)")
	_ = db.Exec("UPDATE ingredients SET kedai_stock = 0 WHERE kedai_stock < 0")
	_ = db.Exec("UPDATE ingredients SET warehouse_stock = 0 WHERE warehouse_stock < 0")
	_ = db.Exec("UPDATE ingredients SET current_stock = 0 WHERE current_stock < 0")

	// Ensure self_order setting exists
	var soCount int64
	db.Model(&models.Setting{}).Where("`key` = ?", "self_order_enabled").Count(&soCount)
	if soCount == 0 {
		db.Create(&models.Setting{Key: "self_order_enabled", Value: "true", SettingGroup: "general"})
	}

	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	// Ensure psak_accounts has hierarchy and contra columns (idempotent / non-blocking)
	_ = db.Exec("ALTER TABLE psak_accounts ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 3")
	_ = db.Exec("ALTER TABLE psak_accounts ADD COLUMN IF NOT EXISTS is_header BOOLEAN NOT NULL DEFAULT FALSE")
	_ = db.Exec("ALTER TABLE psak_accounts ADD COLUMN IF NOT EXISTS is_contra BOOLEAN NOT NULL DEFAULT FALSE")
	_ = db.Exec("ALTER TABLE psak_accounts ADD COLUMN IF NOT EXISTS normal_balance VARCHAR(10) NOT NULL DEFAULT 'debit'")

	// Ensure manager_accounting_access setting exists (default false)
	var accSettingCount int64
	db.Model(&models.Setting{}).Where("`key` = ?", "manager_accounting_access").Count(&accSettingCount)
	if accSettingCount == 0 {
		db.Create(&models.Setting{Key: "manager_accounting_access", Value: "false", SettingGroup: "security", OutletID: 1})
	}

	// Update existing account classifications for contra accounts and naming
	_ = db.Exec("UPDATE psak_accounts SET is_contra = TRUE, normal_balance = 'credit' WHERE code = '1202'")
	_ = db.Exec("UPDATE psak_accounts SET type = 'asset', normal_balance = 'debit' WHERE code = '1104'")
	_ = db.Exec("UPDATE psak_accounts SET name = 'Beban Pemeliharaan Peralatan' WHERE code = '5206' AND (name = 'Beban Peralatan' OR name = '')")

	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	// Rekonsiliasi Akun PSAK (Self-Healing Migration):
	// Pastikan akun Bank/QRIS (1104), Utang Jangka Panjang (2201), dan Beban Pemeliharaan Peralatan (5206) tersedia.
	requiredPSAKAccounts := []models.PSAKAccount{
		{Code: "1104", Name: "Bank / QRIS", Type: "asset", NormalBalance: "debit", Level: 3, IsActive: true, OutletID: 1},
		{Code: "2201", Name: "Utang Jangka Panjang", Type: "liability", NormalBalance: "credit", Level: 3, IsActive: true, OutletID: 1},
		{Code: "5206", Name: "Beban Pemeliharaan Peralatan", Type: "expense", NormalBalance: "debit", Level: 3, IsActive: true, OutletID: 1},
	}
	for _, acc := range requiredPSAKAccounts {
		var cnt int64
		db.Model(&models.PSAKAccount{}).Where("code = ? AND outlet_id = ?", acc.Code, acc.OutletID).Count(&cnt)
		if cnt == 0 {
			db.Create(&acc)
			log.Printf("Seeded missing PSAK Account: %s (%s)", acc.Code, acc.Name)
		}
	}

	var bankAcc models.PSAKAccount
	if err := db.Where("code = '1104' AND outlet_id = 1").First(&bankAcc).Error; err == nil && bankAcc.ID > 0 {
		// 1. Relokasi entri jurnal Penjualan (Order) QRIS/Transfer yang sebelumnya salah tercatat ke 1102 (Piutang) menjadi 1104 (Bank / QRIS)
		_ = db.Exec(`
			UPDATE psak_journal_entry_items jitem
			JOIN psak_journal_entries je ON je.id = jitem.journal_entry_id
			JOIN orders o ON o.id = je.source_id AND je.source_type = 'order'
			SET jitem.account_id = ?, jitem.account_code = '1104', jitem.account_name = 'Bank / QRIS'
			WHERE jitem.account_code = '1102' AND o.payment_method IN ('QRIS', 'Transfer') AND (o.payment_status = 'Paid' OR o.status = 'Completed')
		`, bankAcc.ID)

		// 2. Relokasi entri jurnal Pengeluaran (Expense) yang sebelumnya salah dikreditkan ke 1102 (Piutang) menjadi 1104 (Bank / QRIS)
		_ = db.Exec(`
			UPDATE psak_journal_entry_items jitem
			JOIN psak_journal_entries je ON je.id = jitem.journal_entry_id
			JOIN expenses e ON e.id = je.source_id AND je.source_type = 'expense'
			SET jitem.account_id = ?, jitem.account_code = '1104', jitem.account_name = 'Bank / QRIS'
			WHERE jitem.account_code = '1102'
		`, bankAcc.ID)

		// 3. Relokasi entri jurnal reversal atau sisa expense/investor yang tercatat di 1102
		_ = db.Exec(`
			UPDATE psak_journal_entry_items jitem
			JOIN psak_journal_entries je ON je.id = jitem.journal_entry_id
			SET jitem.account_id = ?, jitem.account_code = '1104', jitem.account_name = 'Bank / QRIS'
			WHERE jitem.account_code = '1102' AND je.source_type IN ('expense', 'investor')
		`, bankAcc.ID)
	}

	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	// 4. Rekonsiliasi Pembelian Bahan Baku ke 1103 (Persediaan) - Standar PSAK Sistem Perpetual
	var invAcc models.PSAKAccount
	if err := db.Where("code = '1103' AND outlet_id = 1").First(&invAcc).Error; err == nil && invAcc.ID > 0 {
		_ = db.Exec(`
			UPDATE psak_journal_entry_items jitem
			JOIN psak_journal_entries je ON je.id = jitem.journal_entry_id
			JOIN expenses e ON e.id = je.source_id AND je.source_type = 'expense'
			SET jitem.account_id = ?, jitem.account_code = '1103', jitem.account_name = 'Persediaan'
			WHERE jitem.account_code = '5101' AND (e.category = 'Bahan Baku (HPP)' OR e.category = 'Bahan Baku')
		`, invAcc.ID)
	}

	// 5. Rekonsiliasi Kategori Beban ke Akun CoA yang Tepat
	var opAcc, salaryAcc models.PSAKAccount
	if err := db.Where("code = '5201' AND outlet_id = 1").First(&opAcc).Error; err == nil && opAcc.ID > 0 {
		_ = db.Exec(`
			UPDATE psak_journal_entry_items jitem
			JOIN psak_journal_entries je ON je.id = jitem.journal_entry_id
			JOIN expenses e ON e.id = je.source_id AND je.source_type = 'expense'
			SET jitem.account_id = ?, jitem.account_code = '5201', jitem.account_name = 'Beban Operasional'
			WHERE jitem.account_code IN ('5202', '5203') AND (
				e.category LIKE '%Marketing%' OR e.category LIKE '%Pemasaran%' OR 
				e.category LIKE '%Maintenance%' OR e.category LIKE '%Pemeliharaan%'
			)
		`, opAcc.ID)
	}
	if err := db.Where("code = '5202' AND outlet_id = 1").First(&salaryAcc).Error; err == nil && salaryAcc.ID > 0 {
		_ = db.Exec(`
			UPDATE psak_journal_entry_items jitem
			JOIN psak_journal_entries je ON je.id = jitem.journal_entry_id
			JOIN expenses e ON e.id = je.source_id AND je.source_type = 'expense'
			SET jitem.account_id = ?, jitem.account_code = '5202', jitem.account_name = 'Beban Gaji'
			WHERE jitem.account_code = '5204' AND (e.category LIKE '%Gaji%' OR e.category LIKE '%Salary%')
		`, salaryAcc.ID)
	}

	return db
}

// ensureColumn adds a column to a table if it doesn't exist.
// Uses information_schema to check first — compatible with all MySQL versions,
// including < 8.0.29 which doesn't support ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func ensureColumn(db *gorm.DB, table, column, definition string) {
	var count int64
	db.Raw(`SELECT COUNT(*) FROM information_schema.COLUMNS
		WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
		table, column).Scan(&count)
	if count == 0 {
		_ = db.Exec("ALTER TABLE " + table + " ADD COLUMN " + column + " " + definition)
	}
}
