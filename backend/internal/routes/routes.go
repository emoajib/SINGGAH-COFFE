package routes

import (
	"singgah-pos-backend/internal/handlers"
	"singgah-pos-backend/internal/middleware"
	"singgah-pos-backend/internal/services" // Import Services

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupRoutes(r *gin.Engine, db *gorm.DB) {
	// Services
	inventoryService := services.NewInventoryService(db)
	paymentService := services.NewPaymentService()

	// Handlers
	authHandler := handlers.NewAuthHandler(db)
	productHandler := handlers.NewProductHandler(db)
	orderHandler := handlers.NewOrderHandler(db, inventoryService, paymentService) // Inject Payment Service
	inventoryHandler := handlers.NewInventoryHandler(inventoryService)
	webhookHandler := handlers.NewWebhookHandler(db)

	api := r.Group("/api")
	{
		// Public Routes
		api.POST("/auth/login", authHandler.Login)
		api.POST("/webhooks/xendit", webhookHandler.HandleXenditWebhook)

		// Protected Routes
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			// Auth
			protected.PUT("/auth/profile", middleware.RoleMiddleware("owner"), authHandler.UpdateProfile)
			protected.POST("/auth/change-password", middleware.RoleMiddleware("owner"), authHandler.ChangePassword)

			// User Management (Owner Only)
			protected.GET("/users", middleware.RoleMiddleware("owner"), authHandler.GetUsers)
			protected.POST("/users", middleware.RoleMiddleware("owner"), authHandler.Register)
			protected.PUT("/users/:id", middleware.RoleMiddleware("owner"), authHandler.UpdateUser)
			protected.DELETE("/users/:id", middleware.RoleMiddleware("owner"), authHandler.DeleteUser)

			// Products
			protected.GET("/products", productHandler.GetProducts)
			protected.POST("/products", middleware.RoleMiddleware("owner", "manager"), productHandler.CreateProduct)
			protected.PUT("/products/:id", middleware.RoleMiddleware("owner", "manager"), productHandler.UpdateProduct)
			protected.DELETE("/products/:id", middleware.RoleMiddleware("owner", "manager"), productHandler.DeleteProduct)
			protected.POST("/products/upload-image", middleware.RoleMiddleware("owner", "manager"), productHandler.UploadProductImage)

			// Orders
			protected.GET("/orders", orderHandler.GetOrders)
			protected.POST("/orders", orderHandler.CreateOrder)
			protected.POST("/orders/:id/void", middleware.RoleMiddleware("owner", "manager"), orderHandler.VoidOrder)

			// Inventory
			protected.GET("/ingredients", inventoryHandler.GetIngredients)
			protected.POST("/ingredients", middleware.RoleMiddleware("owner", "manager"), inventoryHandler.CreateIngredient)
			protected.PUT("/ingredients/:id", middleware.RoleMiddleware("owner", "manager"), inventoryHandler.UpdateIngredient)
			protected.DELETE("/ingredients/:id", middleware.RoleMiddleware("owner", "manager"), inventoryHandler.DeleteIngredient)
			protected.GET("/ingredients/:id/history", inventoryHandler.GetStockHistory) // New Endpoint
			protected.POST("/inventory/mutation", middleware.RoleMiddleware("owner", "manager"), inventoryHandler.UpdateStock)

			// Reports & Dashboard
			reportHandler := handlers.NewReportHandler(db)
			protected.GET("/dashboard/summary", reportHandler.GetDashboardSummary)

			// Settings
			settingsHandler := handlers.NewSettingsHandler(db)
			protected.GET("/settings", settingsHandler.GetSettings)
			protected.POST("/settings", middleware.RoleMiddleware("owner"), settingsHandler.UpdateSettings)
			protected.POST("/settings/upload-logo", middleware.RoleMiddleware("owner"), settingsHandler.UploadLogo)

			// Expenses
			expenseHandler := handlers.NewExpenseHandler(db)
			protected.GET("/expenses", expenseHandler.GetExpenses)
			protected.POST("/expenses", middleware.RoleMiddleware("owner", "manager"), expenseHandler.CreateExpense)
			protected.DELETE("/expenses/:id", middleware.RoleMiddleware("owner"), expenseHandler.DeleteExpense)
		}
	}

	r.Static("/uploads", "./uploads")
}
