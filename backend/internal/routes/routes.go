package routes

import (
	"singgah-pos-backend/internal/delivery/handler"
	"singgah-pos-backend/internal/delivery/middleware"

	"github.com/gin-gonic/gin"
)

type Handlers struct {
	Auth      *handler.AuthHandler
	Product   *handler.ProductHandler
	Order     *handler.OrderHandler
	Inventory *handler.InventoryHandler
	Report    *handler.ReportHandler
	Expense   *handler.ExpenseHandler
	Settings  *handler.SettingsHandler
	Webhook   *handler.WebhookHandler
}

func SetupRoutes(r *gin.Engine, h *Handlers) {
	api := r.Group("/api")
	{
		// Public Routes
		api.POST("/auth/login", h.Auth.Login)
		api.POST("/webhooks/xendit", h.Webhook.HandleXenditWebhook)

		// Protected Routes
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			// Auth
			protected.PUT("/auth/profile", middleware.RoleMiddleware("owner"), h.Auth.UpdateProfile)
			protected.POST("/auth/change-password", middleware.RoleMiddleware("owner"), h.Auth.ChangePassword)

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
			protected.POST("/ingredients", middleware.RoleMiddleware("owner", "manager"), h.Inventory.CreateIngredient)
			protected.PUT("/ingredients/:id", middleware.RoleMiddleware("owner", "manager"), h.Inventory.UpdateIngredient)
			protected.DELETE("/ingredients/:id", middleware.RoleMiddleware("owner", "manager"), h.Inventory.DeleteIngredient)
			protected.GET("/ingredients/:id/history", h.Inventory.GetStockHistory)
			protected.POST("/inventory/mutation", middleware.RoleMiddleware("owner", "manager"), h.Inventory.UpdateStock)

			// Reports & Dashboard
			protected.GET("/dashboard/summary", h.Report.GetDashboardSummary)

			// Settings
			protected.GET("/settings", h.Settings.GetSettings)
			protected.POST("/settings", middleware.RoleMiddleware("owner"), h.Settings.UpdateSettings)
			protected.POST("/settings/upload-logo", middleware.RoleMiddleware("owner"), h.Settings.UploadLogo)
			protected.POST("/settings/upload-apk", middleware.RoleMiddleware("owner"), h.Settings.UploadMobileApp)

			// Mobile App Download
			protected.GET("/mobile/download", h.Settings.DownloadMobileApp)

			// Expenses
			protected.GET("/expenses", h.Expense.GetExpenses)
			protected.POST("/expenses", middleware.RoleMiddleware("owner", "manager"), h.Expense.CreateExpense)
			protected.DELETE("/expenses/:id", middleware.RoleMiddleware("owner"), h.Expense.DeleteExpense)
		}
	}

	r.Static("/uploads", "./uploads")
}
