package routes

import (
	"singgah-pos-backend/internal/delivery/handler"
	"singgah-pos-backend/internal/delivery/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type Handlers struct {
	Auth             *handler.AuthHandler
	Product          *handler.ProductHandler
	Order            *handler.OrderHandler
	Inventory        *handler.InventoryHandler
	Report           *handler.ReportHandler
	Expense          *handler.ExpenseHandler
	Settings         *handler.SettingsHandler
	Webhook          *handler.WebhookHandler
	BEP              *handler.BEPHandler
	Outlet           *handler.OutletHandler
	CashRegister     *handler.CashRegisterHandler
	Backup           *handler.BackupHandler
	Sync             *handler.SyncHandler
	ProductionTarget *handler.ProductionTargetHandler
	CashBook         *handler.CashBookHandler
	ProfitSharing    *handler.ProfitSharingHandler
	ShiftConfig      *handler.ShiftConfigHandler
	Schedule         *handler.ScheduleHandler
	Attendance       *handler.AttendanceHandler
	ShiftInstance    *handler.ShiftInstanceHandler
	Account          *handler.AccountHandler
	Journal          *handler.JournalHandler
	Loyalty          *handler.LoyaltyHandler
	Cashbon          *handler.CashbonHandler
	Barista          *handler.BaristaHandler
	PublicOrder      *handler.PublicOrderHandler
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func SetupRoutes(r *gin.Engine, h *Handlers, db *gorm.DB) {
	healthHandler := func(c *gin.Context) {
		sqlDB, err := db.DB()
		if err != nil {
			c.JSON(500, gin.H{"status": "error", "message": "database connection failed"})
			return
		}
		if err := sqlDB.Ping(); err != nil {
			c.JSON(500, gin.H{"status": "error", "message": "database ping failed"})
			return
		}
		c.JSON(200, gin.H{"status": "ok"})
	}

	r.GET("/health", healthHandler)

	api := r.Group("/api")
	{
		// Health check alias
		api.GET("/health", healthHandler)

		// Public Routes
		api.POST("/auth/login", middleware.LoginRateLimiter(), h.Auth.Login)
		api.POST("/webhooks/xendit", middleware.WebhookRateLimiter(), h.Webhook.HandleXenditWebhook)
		api.GET("/branding", h.Settings.GetBranding)
		// Public Loyalty Card & Customer Feedback (QR scan pelanggan) - Vetted by AI
		api.GET("/loyalty/:token", h.Loyalty.GetPublicLoyaltyCard)
		api.POST("/loyalty/:token/feedback", h.Loyalty.SubmitFeedback)
		api.POST("/loyalty/register-or-find", h.Loyalty.RegisterOrFindCustomer)

		// Public Self-Order (Mobile Ordering Smartphone) - Vetted by AI - Manual Review Required by Senior Engineer/Manager
		api.GET("/public/menu", h.PublicOrder.GetPublicMenu)
		api.POST("/public/orders", middleware.RequestBodySizeLimiter(64*1024), middleware.SelfOrderRateLimiter(), h.PublicOrder.CreatePublicOrder)
		api.GET("/public/orders/track/:token", h.PublicOrder.GetPublicOrderStatus)

	// Protected Routes
	protected := api.Group("/")
	protected.Use(middleware.APIRateLimiter())
	protected.Use(middleware.AuthMiddleware(db))
	{
			// Auth
			protected.PUT("/auth/profile", middleware.RoleMiddleware("owner"), h.Auth.UpdateProfile)
			protected.POST("/auth/change-password", middleware.RoleMiddleware("owner"), h.Auth.ChangePassword)
			protected.POST("/auth/logout", h.Auth.Logout)

			// User Management
			protected.GET("/users", middleware.RoleMiddleware("owner"), h.Auth.GetUsers)
			protected.POST("/users", middleware.RoleMiddleware("owner"), h.Auth.Register)
			protected.PUT("/users/:id", middleware.RoleMiddleware("owner"), h.Auth.UpdateUser)
			protected.DELETE("/users/:id", middleware.RoleMiddleware("owner"), h.Auth.DeleteUser)

			// Products
			protected.GET("/products", h.Product.GetProducts)
			protected.POST("/products", middleware.RoleMiddleware("owner", "manager"), h.Product.CreateProduct)
			protected.PUT("/products/:id", middleware.RoleMiddleware("owner", "manager"), h.Product.UpdateProduct)
			protected.DELETE("/products/:id", middleware.RoleMiddleware("owner", "manager"), h.Product.DeleteProduct)
			protected.POST("/products/upload-image", middleware.RoleMiddleware("owner", "manager"), h.Product.UploadProductImage)

			// Orders & Kitchen Display System (KDS) - Vetted by AI
			protected.GET("/orders", h.Order.GetOrders)
			protected.POST("/orders", h.Order.CreateOrder)
			protected.GET("/orders/queue", h.Order.GetKitchenQueue)
			protected.GET("/orders/unpaid", h.Order.GetUnpaidOrders)
			protected.PATCH("/orders/:id/kitchen-status", h.Order.UpdateKitchenStatus)
			protected.POST("/orders/queue/clear-old", h.Order.ClearActiveKitchenQueue)
			protected.POST("/orders/:id/complete", h.Order.CompleteOrder)
			protected.POST("/orders/:id/void", middleware.RoleMiddleware("owner", "manager"), h.Order.VoidOrder)
			protected.PUT("/orders/:id/payment-method", middleware.RoleMiddleware("owner"), h.Order.UpdatePaymentMethod)

			// Loyalty & Customer Feedback - Vetted by AI
			protected.GET("/customers", h.Loyalty.GetCustomers)
			protected.GET("/loyalty/programs", h.Loyalty.GetPrograms)
			protected.POST("/loyalty/programs", middleware.RoleMiddleware("owner"), h.Loyalty.CreateProgram)
			protected.PUT("/loyalty/programs/:id", middleware.RoleMiddleware("owner"), h.Loyalty.UpdateProgram)
			protected.POST("/loyalty/redeem", h.Loyalty.RedeemReward)
			protected.GET("/feedback", middleware.RoleMiddleware("owner", "manager"), h.Loyalty.GetFeedbacks)
			protected.POST("/feedback/:id/reply", middleware.RoleMiddleware("owner", "manager"), h.Loyalty.ReplyFeedback)

			// Inventory
			protected.GET("/ingredients", h.Inventory.GetIngredients)
			// Vetted by AI - Manual Review Required by Senior Engineer/Manager
			protected.GET("/inventory/low-stock", h.Inventory.GetLowStockAlerts)
			protected.POST("/ingredients", middleware.RoleMiddleware("owner", "manager"), h.Inventory.CreateIngredient)
			protected.PUT("/ingredients/:id", middleware.RoleMiddleware("owner", "manager"), h.Inventory.UpdateIngredient)
			protected.DELETE("/ingredients/:id", middleware.RoleMiddleware("owner", "manager"), h.Inventory.DeleteIngredient)
			protected.GET("/ingredients/:id/history", middleware.RoleMiddleware("owner", "manager"), h.Inventory.GetStockHistory)
			protected.POST("/inventory/mutation", middleware.RoleMiddleware("owner", "manager"), h.Inventory.UpdateStock)
			// Transfer stok antar lokasi (gudang ↔ kedai) — Vetted by AI - Manual Review Required by Senior Engineer/Manager
			protected.POST("/inventory/transfer", middleware.RoleMiddleware("owner", "manager"), h.Inventory.TransferStock)

			// Reports & Dashboard
			protected.GET("/dashboard/summary", h.Report.GetDashboardSummary)
			protected.GET("/reports/profit-loss", middleware.RoleMiddleware("owner", "manager"), h.Report.GetProfitLoss)
			protected.GET("/reports/sales-summary", middleware.RoleMiddleware("owner", "manager"), h.Report.GetSalesSummary)
			protected.GET("/reports/profit-loss/export/csv", middleware.RoleMiddleware("owner", "manager"), h.Report.ExportProfitLossCSV)
			protected.GET("/reports/profit-loss/export/pdf", middleware.RoleMiddleware("owner", "manager"), h.Report.ExportProfitLossPDF)
			protected.GET("/reports/product-performance", middleware.RoleMiddleware("owner", "manager"), h.Report.GetProductPerformance)
			protected.GET("/integrations/logs", middleware.RoleMiddleware("owner"), h.Webhook.GetWebhookLogs)

			// Settings
			protected.GET("/settings", h.Settings.GetSettings)
			protected.POST("/settings", middleware.RoleMiddleware("owner"), h.Settings.UpdateSettings)
			protected.POST("/settings/upload-logo", middleware.RoleMiddleware("owner"), h.Settings.UploadLogo)
			// Expenses
			protected.GET("/expenses", middleware.RoleMiddleware("owner", "manager"), h.Expense.GetExpenses)
			protected.GET("/expenses/summary", middleware.RoleMiddleware("owner", "manager"), h.Expense.GetExpenseSummary)
			protected.POST("/expenses", middleware.RoleMiddleware("owner", "manager"), h.Expense.CreateExpense)
			protected.PUT("/expenses/:id", middleware.RoleMiddleware("owner", "manager"), h.Expense.UpdateExpense)
			protected.PUT("/expenses/:id/cost-type", middleware.RoleMiddleware("owner"), h.Expense.UpdateCostType)
			protected.DELETE("/expenses/:id", middleware.RoleMiddleware("owner"), h.Expense.DeleteExpense)

			// Barista Cashbons (Owner & Manager)
			// Vetted by AI - Manual Review Required by Senior Engineer/Manager
			protected.GET("/cashbons", middleware.RoleMiddleware("owner", "manager"), h.Cashbon.GetCashbons)
			protected.GET("/cashbons/:id", middleware.RoleMiddleware("owner", "manager"), h.Cashbon.GetCashbonByID)
			protected.POST("/cashbons", middleware.RoleMiddleware("owner", "manager"), h.Cashbon.CreateCashbon)
			protected.PUT("/cashbons/:id", middleware.RoleMiddleware("owner", "manager"), h.Cashbon.UpdateCashbon)
			protected.DELETE("/cashbons/:id", middleware.RoleMiddleware("owner"), h.Cashbon.DeleteCashbon)

			// Master Data Barista (Owner & Manager)
			// Vetted by AI - Manual Review Required by Senior Engineer/Manager
			protected.GET("/baristas", middleware.RoleMiddleware("owner", "manager"), h.Barista.GetAll)
			protected.GET("/baristas/:id", middleware.RoleMiddleware("owner", "manager"), h.Barista.GetByID)
			protected.POST("/baristas", middleware.RoleMiddleware("owner", "manager"), h.Barista.Create)
			protected.PUT("/baristas/:id", middleware.RoleMiddleware("owner", "manager"), h.Barista.Update)
			protected.DELETE("/baristas/:id", middleware.RoleMiddleware("owner"), h.Barista.Delete)

			// Cash Register — Cashier opens cash float on login
			protected.POST("/cash-registers/open", h.CashRegister.OpenCashRegister)
			protected.POST("/cash-registers/close", h.CashRegister.CloseCashRegister)
			protected.GET("/cash-registers/suggested-opening", h.CashRegister.GetSuggestedOpening)
			// BUG FIX: manager boleh GET riwayat kas outlet mereka (outlet_id auto-scope via JWT).
			// Edit dan Delete tetap hanya owner untuk menjaga integritas data.
			protected.GET("/cash-registers", middleware.RoleMiddleware("owner", "manager", "cashier"), h.CashRegister.GetCashRegisters)
			protected.PUT("/cash-registers/:id", middleware.RoleMiddleware("owner"), h.CashRegister.UpdateCashRegister)
			protected.DELETE("/cash-registers/:id", middleware.RoleMiddleware("owner"), h.CashRegister.DeleteCashRegister)

			// Buku Kas (Cash Book)
			// Vetted by AI - Manual Review Required by Senior Engineer/Manager
			protected.GET("/cash-book", middleware.RoleMiddleware("owner", "manager", "cashier"), h.CashBook.GetCashBooks)
			protected.POST("/cash-book/sync", middleware.RoleMiddleware("owner", "manager", "cashier"), h.CashBook.SyncFromTransactions)
			protected.POST("/cash-book/exchange", middleware.RoleMiddleware("owner", "manager", "cashier"), h.CashBook.ExchangeCash)
			protected.GET("/cash-book/:id", middleware.RoleMiddleware("owner", "manager", "cashier"), h.CashBook.GetCashBook)
			protected.POST("/cash-book", middleware.RoleMiddleware("owner", "manager", "cashier"), h.CashBook.CreateCashBook)
			protected.PUT("/cash-book/:id", middleware.RoleMiddleware("owner", "manager", "cashier"), h.CashBook.UpdateCashBook)
			protected.DELETE("/cash-book/:id", middleware.RoleMiddleware("owner", "manager"), h.CashBook.DeleteCashBook)

			// BEP (Break-Even Point) — Owner Only
			protected.GET("/reports/bep", middleware.RoleMiddleware("owner"), h.BEP.GetBEP)

			// Outlets — Owner Only
			protected.GET("/outlets", middleware.RoleMiddleware("owner"), h.Outlet.GetOutlets)
			protected.GET("/outlets/:id", middleware.RoleMiddleware("owner"), h.Outlet.GetOutlet)
			protected.POST("/outlets", middleware.RoleMiddleware("owner"), h.Outlet.CreateOutlet)
			protected.PUT("/outlets/:id", middleware.RoleMiddleware("owner"), h.Outlet.UpdateOutlet)
			protected.DELETE("/outlets/:id", middleware.RoleMiddleware("owner"), h.Outlet.DeleteOutlet)

			// Backup (Owner Only)
			protected.POST("/backup", middleware.RoleMiddleware("owner"), h.Backup.CreateBackup)
			protected.POST("/backup/restore", middleware.RoleMiddleware("owner"), h.Backup.RestoreBackup)
			protected.GET("/backup/history", middleware.RoleMiddleware("owner"), h.Backup.GetBackupHistory)
			protected.GET("/backup/status", middleware.RoleMiddleware("owner"), h.Backup.GetBackupStatus)

			// Production Targets & Requirements
			// GET targets dan requirements dapat diakses manager (view-only untuk perencanaan belanja).
			// Hanya Owner yang bisa EDIT target produksi.
			protected.GET("/production-targets", middleware.RoleMiddleware("owner"), h.ProductionTarget.GetTargets)
			protected.PUT("/production-targets", middleware.RoleMiddleware("owner"), h.ProductionTarget.SaveTargets)
			protected.GET("/inventory/requirements", middleware.RoleMiddleware("owner", "manager"), h.ProductionTarget.GetRequirements)
			protected.GET("/reports/daily-target", middleware.RoleMiddleware("owner", "manager"), h.ProductionTarget.GetDailyTarget)
			protected.GET("/backup/download/:name", middleware.RoleMiddleware("owner"), h.Backup.DownloadBackup)
			protected.POST("/backup/upload", middleware.RoleMiddleware("owner"), h.Backup.UploadBackup)

			// Sync (Owner Only) — forward backup to/from production server
			protected.POST("/backup/push", middleware.RoleMiddleware("owner"), h.Sync.PushBackup)
			protected.POST("/backup/pull", middleware.RoleMiddleware("owner"), h.Sync.PullBackup)

			// Profit Sharing — Owner Only
			protected.GET("/profit-sharing", middleware.RoleMiddleware("owner"), h.ProfitSharing.GetAll)
			protected.GET("/profit-sharing/preview", middleware.RoleMiddleware("owner"), h.ProfitSharing.Preview)
			// Pratinjau read-only untuk manajer (K4: tanpa simpan draft)
			protected.GET("/profit-sharing/preview-readonly", middleware.RoleMiddleware("owner", "manager"), h.ProfitSharing.PreviewReadOnly)
			// Vetted by AI - Manual Review Required by Senior Engineer/Manager
			// Simpan draft eksplisit (idempotent, tanpa harus finalize)
			protected.POST("/profit-sharing/draft", middleware.RoleMiddleware("owner"), h.ProfitSharing.SaveDraft)
			protected.POST("/profit-sharing/:id/finalize", middleware.RoleMiddleware("owner"), h.ProfitSharing.Finalize)
			protected.POST("/profit-sharing/:id/mark-paid", middleware.RoleMiddleware("owner"), h.ProfitSharing.MarkAsPaid)
			protected.POST("/profit-sharing/:id/recalculate", middleware.RoleMiddleware("owner"), h.ProfitSharing.Recalculate)
			protected.DELETE("/profit-sharing/:id", middleware.RoleMiddleware("owner"), h.ProfitSharing.Delete)
			protected.GET("/profit-sharing/:id/people", middleware.RoleMiddleware("owner"), h.ProfitSharing.GetPeople)
			protected.POST("/profit-sharing/:id/people", middleware.RoleMiddleware("owner"), h.ProfitSharing.AddPerson)
			protected.DELETE("/profit-sharing/:id/people/:personId", middleware.RoleMiddleware("owner"), h.ProfitSharing.RemovePerson)
			protected.PUT("/profit-sharing/:id/leave", middleware.RoleMiddleware("owner"), h.ProfitSharing.SetLeave)
			protected.PUT("/profit-sharing/:id/attendance", middleware.RoleMiddleware("owner"), h.ProfitSharing.SetAttendance)

			// Jadwal barista — Owner & Manajer (C1)
			protected.GET("/schedules", middleware.RoleMiddleware("owner", "manager"), h.Schedule.GetByDate)
			protected.POST("/schedules", middleware.RoleMiddleware("owner", "manager"), h.Schedule.Create)
			protected.DELETE("/schedules/:id", middleware.RoleMiddleware("owner", "manager"), h.Schedule.Delete)
			protected.POST("/schedules/copy-week", middleware.RoleMiddleware("owner", "manager"), h.Schedule.CopyWeek)

			// Kehadiran — Owner & Manajer (C2). Kasir diblokir total.
			protected.POST("/attendances", middleware.RoleMiddleware("owner", "manager"), h.Attendance.Record)
			protected.GET("/attendances/pending", middleware.RoleMiddleware("owner", "manager"), h.Attendance.ListPending)
			protected.POST("/attendances/:id/approve", middleware.RoleMiddleware("owner", "manager"), h.Attendance.Approve)
			protected.POST("/attendances/:id/reject", middleware.RoleMiddleware("owner", "manager"), h.Attendance.Reject)

			// Shift operasional + daftar tugas — Owner & Manajer (C3/C7)
			protected.GET("/shift-instances", middleware.RoleMiddleware("owner", "manager"), h.ShiftInstance.GetByDate)
			protected.POST("/shift-instances", middleware.RoleMiddleware("owner", "manager"), h.ShiftInstance.Create)
			protected.PUT("/shift-instances/:id/status", middleware.RoleMiddleware("owner", "manager"), h.ShiftInstance.SetStatus)
			protected.POST("/shift-instances/:id/close", middleware.RoleMiddleware("owner", "manager"), h.ShiftInstance.Close)
			protected.GET("/ops/tasks", middleware.RoleMiddleware("owner", "manager"), h.ShiftInstance.GetTasks)

			// Shift Config Management — baca: owner+manajer (template untuk operasional);
			// tulis (buat/ubah/hapus): owner only.
			protected.GET("/profit-sharing/shift-configs", middleware.RoleMiddleware("owner", "manager"), h.ShiftConfig.GetShifts)
			protected.POST("/profit-sharing/shift-configs", middleware.RoleMiddleware("owner"), h.ShiftConfig.CreateShift)
			protected.GET("/profit-sharing/shift-configs/:id", middleware.RoleMiddleware("owner"), h.ShiftConfig.GetShiftByID)
			protected.PUT("/profit-sharing/shift-configs/:id", middleware.RoleMiddleware("owner"), h.ShiftConfig.UpdateShift)
			protected.DELETE("/profit-sharing/shift-configs/:id", middleware.RoleMiddleware("owner"), h.ShiftConfig.DeleteShift)

			// PSAK — Chart of Accounts
			// Vetted by AI - Manual Review Required by Senior Engineer/Manager
			// Kasir diblokir total; Manajer hanya boleh akses dengan persetujuan Owner via AccountingAccessMiddleware
			protected.GET("/psak/accounts", middleware.AccountingAccessMiddleware(db), h.Account.GetAccounts)
			protected.GET("/psak/accounts/:id", middleware.AccountingAccessMiddleware(db), h.Account.GetAccount)
			protected.POST("/psak/accounts", middleware.RoleMiddleware("owner"), h.Account.CreateAccount)
			protected.PUT("/psak/accounts/:id", middleware.RoleMiddleware("owner"), h.Account.UpdateAccount)
			protected.DELETE("/psak/accounts/:id", middleware.RoleMiddleware("owner"), h.Account.DeleteAccount)
			protected.POST("/psak/accounts/seed", middleware.RoleMiddleware("owner"), h.Account.SeedAccounts)

			// PSAK — Journal Entries
			protected.GET("/psak/journals", middleware.AccountingAccessMiddleware(db), h.Journal.GetJournals)
			protected.GET("/psak/journals/:id", middleware.AccountingAccessMiddleware(db), h.Journal.GetJournal)
			protected.POST("/psak/journals", middleware.AccountingAccessMiddleware(db), h.Journal.CreateJournal)
			protected.POST("/psak/journals/:id/post", middleware.RoleMiddleware("owner"), h.Journal.PostJournal)
			protected.POST("/psak/journals/:id/void", middleware.RoleMiddleware("owner"), h.Journal.VoidJournal)

			// PSAK — Reports
			protected.GET("/psak/reports/trial-balance", middleware.AccountingAccessMiddleware(db), h.Journal.GetTrialBalance)
			protected.GET("/psak/reports/balance-sheet", middleware.AccountingAccessMiddleware(db), h.Journal.GetBalanceSheet)
			protected.GET("/psak/reports/income-statement", middleware.AccountingAccessMiddleware(db), h.Journal.GetIncomeStatement)
			protected.GET("/psak/reports/cash-flow", middleware.AccountingAccessMiddleware(db), h.Journal.GetCashFlow)
			protected.GET("/psak/reports/general-ledger", middleware.AccountingAccessMiddleware(db), h.Journal.GetGeneralLedger)
		}
	}

	r.Static("/uploads", "./uploads")
}
