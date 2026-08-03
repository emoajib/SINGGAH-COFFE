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
		api.POST("/auth/login", h.Auth.Login)
		api.POST("/webhooks/xendit", h.Webhook.HandleXenditWebhook)

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
			protected.POST("/orders/:id/void", middleware.RoleMiddleware("owner", "manager"), h.Order.VoidOrder)

			// Inventory
			protected.GET("/ingredients", h.Inventory.GetIngredients)
			protected.GET("/inventory/low-stock", h.Inventory.GetLowStockAlerts)
			protected.POST("/ingredients", middleware.RoleMiddleware("owner", "manager"), h.Inventory.CreateIngredient)
			protected.PUT("/ingredients/:id", middleware.RoleMiddleware("owner", "manager"), h.Inventory.UpdateIngredient)
			protected.DELETE("/ingredients/:id", middleware.RoleMiddleware("owner", "manager"), h.Inventory.DeleteIngredient)
			protected.GET("/ingredients/:id/history", h.Inventory.GetStockHistory)
			protected.POST("/inventory/mutation", middleware.RoleMiddleware("owner", "manager"), h.Inventory.UpdateStock)

			// Reports & Dashboard
			protected.GET("/dashboard/summary", h.Report.GetDashboardSummary)
			protected.GET("/reports/profit-loss", h.Report.GetProfitLoss)
			protected.GET("/reports/sales-summary", h.Report.GetSalesSummary)
			protected.GET("/reports/profit-loss/export/csv", h.Report.ExportProfitLossCSV)
			protected.GET("/reports/profit-loss/export/pdf", h.Report.ExportProfitLossPDF)
			protected.GET("/integrations/logs", h.Webhook.GetWebhookLogs)

			// Settings
			protected.GET("/settings", h.Settings.GetSettings)
			protected.POST("/settings", middleware.RoleMiddleware("owner"), h.Settings.UpdateSettings)
			protected.POST("/settings/upload-logo", middleware.RoleMiddleware("owner"), h.Settings.UploadLogo)
			// Expenses
			protected.GET("/expenses", h.Expense.GetExpenses)
			protected.POST("/expenses", middleware.RoleMiddleware("owner", "manager"), h.Expense.CreateExpense)
			protected.PUT("/expenses/:id", middleware.RoleMiddleware("owner", "manager"), h.Expense.UpdateExpense)
			protected.PUT("/expenses/:id/cost-type", middleware.RoleMiddleware("owner"), h.Expense.UpdateCostType)
			protected.DELETE("/expenses/:id", middleware.RoleMiddleware("owner"), h.Expense.DeleteExpense)

			// Cash Register — Cashier opens cash float on login
			protected.POST("/cash-registers/open", h.CashRegister.OpenCashRegister)
			protected.POST("/cash-registers/close", h.CashRegister.CloseCashRegister)
			protected.GET("/cash-registers", middleware.RoleMiddleware("owner"), h.CashRegister.GetCashRegisters)
			protected.PUT("/cash-registers/:id", middleware.RoleMiddleware("owner"), h.CashRegister.UpdateCashRegister)
			protected.DELETE("/cash-registers/:id", middleware.RoleMiddleware("owner"), h.CashRegister.DeleteCashRegister)

			// BEP (Break-Even Point) — Owner Only
			protected.GET("/reports/bep", middleware.RoleMiddleware("owner"), h.BEP.GetBEP)

			// Outlets — Owner Only
			protected.GET("/outlets", middleware.RoleMiddleware("owner"), h.Outlet.GetOutlets)
			protected.GET("/outlets/:id", middleware.RoleMiddleware("owner"), h.Outlet.GetOutlet)
			protected.POST("/outlets", middleware.RoleMiddleware("owner"), h.Outlet.CreateOutlet)
			protected.PUT("/outlets/:id", middleware.RoleMiddleware("owner"), h.Outlet.UpdateOutlet)
			protected.DELETE("/outlets/:id", middleware.RoleMiddleware("owner"), h.Outlet.DeleteOutlet)
		}
	}

	r.Static("/uploads", "./uploads")
}
