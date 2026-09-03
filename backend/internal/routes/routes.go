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
}

func SetupRoutes(r *gin.Engine, h *Handlers, db *gorm.DB) {
	r.GET("/health", func(c *gin.Context) {
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
	})

	api := r.Group("/api")
	{
		// Public Routes
		api.POST("/auth/login", middleware.LoginRateLimiter(), h.Auth.Login)
		api.POST("/webhooks/xendit", middleware.WebhookRateLimiter(), h.Webhook.HandleXenditWebhook)

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

			// Orders
			protected.GET("/orders", h.Order.GetOrders)
			protected.POST("/orders", h.Order.CreateOrder)
			protected.POST("/orders/:id/complete", h.Order.CompleteOrder)
			protected.POST("/orders/:id/void", middleware.RoleMiddleware("owner", "manager"), h.Order.VoidOrder)
			protected.PUT("/orders/:id/payment-method", middleware.RoleMiddleware("owner"), h.Order.UpdatePaymentMethod)

			// Inventory
			protected.GET("/ingredients", h.Inventory.GetIngredients)
			protected.GET("/inventory/low-stock", middleware.RoleMiddleware("owner", "manager"), h.Inventory.GetLowStockAlerts)
			protected.POST("/ingredients", middleware.RoleMiddleware("owner", "manager"), h.Inventory.CreateIngredient)
			protected.PUT("/ingredients/:id", middleware.RoleMiddleware("owner", "manager"), h.Inventory.UpdateIngredient)
			protected.DELETE("/ingredients/:id", middleware.RoleMiddleware("owner", "manager"), h.Inventory.DeleteIngredient)
			protected.GET("/ingredients/:id/history", middleware.RoleMiddleware("owner", "manager"), h.Inventory.GetStockHistory)
			protected.POST("/inventory/mutation", middleware.RoleMiddleware("owner", "manager"), h.Inventory.UpdateStock)

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
			protected.POST("/expenses", middleware.RoleMiddleware("owner", "manager"), h.Expense.CreateExpense)
			protected.PUT("/expenses/:id", middleware.RoleMiddleware("owner", "manager"), h.Expense.UpdateExpense)
			protected.PUT("/expenses/:id/cost-type", middleware.RoleMiddleware("owner"), h.Expense.UpdateCostType)
			protected.DELETE("/expenses/:id", middleware.RoleMiddleware("owner"), h.Expense.DeleteExpense)

			// Cash Register — Cashier opens cash float on login
			protected.POST("/cash-registers/open", h.CashRegister.OpenCashRegister)
			protected.POST("/cash-registers/close", h.CashRegister.CloseCashRegister)
			protected.GET("/cash-registers/suggested-opening", h.CashRegister.GetSuggestedOpening)
			// BUG FIX: manager boleh GET riwayat kas outlet mereka (outlet_id auto-scope via JWT).
			// Edit dan Delete tetap hanya owner untuk menjaga integritas data.
			protected.GET("/cash-registers", middleware.RoleMiddleware("owner", "manager"), h.CashRegister.GetCashRegisters)
			protected.PUT("/cash-registers/:id", middleware.RoleMiddleware("owner"), h.CashRegister.UpdateCashRegister)
			protected.DELETE("/cash-registers/:id", middleware.RoleMiddleware("owner"), h.CashRegister.DeleteCashRegister)

			// Buku Kas (Cash Book)
			// Vetted by AI - Manual Review Required by Senior Engineer/Manager
			protected.GET("/cash-book", middleware.RoleMiddleware("owner", "manager", "cashier"), h.CashBook.GetCashBooks)
			protected.POST("/cash-book/sync", middleware.RoleMiddleware("owner", "manager", "cashier"), h.CashBook.SyncFromTransactions)
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
			protected.POST("/profit-sharing/:id/finalize", middleware.RoleMiddleware("owner"), h.ProfitSharing.Finalize)
			protected.POST("/profit-sharing/:id/mark-paid", middleware.RoleMiddleware("owner"), h.ProfitSharing.MarkAsPaid)
			protected.POST("/profit-sharing/:id/recalculate", middleware.RoleMiddleware("owner"), h.ProfitSharing.Recalculate)
			protected.DELETE("/profit-sharing/:id", middleware.RoleMiddleware("owner"), h.ProfitSharing.Delete)
		}
	}

	r.Static("/uploads", "./uploads")
}
