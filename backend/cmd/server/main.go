package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"singgah-pos-backend/internal/config"
	"singgah-pos-backend/internal/database"
	"singgah-pos-backend/internal/delivery/handler"
	"singgah-pos-backend/internal/pkg/jwt"
	"singgah-pos-backend/internal/routes"
	"singgah-pos-backend/internal/usecase"
	"sync"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

var (
	loginLimiters sync.Map
)

func getLoginLimiter(ip string) *rate.Limiter {
	limiter, _ := loginLimiters.LoadOrStore(ip, rate.NewLimiter(rate.Every(time.Second), 5))
	return limiter.(*rate.Limiter)
}

func main() {
	os.MkdirAll("uploads/logo", 0755)
	os.MkdirAll("uploads/products", 0755)

	cfg := config.LoadConfig()

	jwt.Init(cfg.JWTSecret)

	db := database.Connect(cfg)

	authUsecase := usecase.NewAuthUsecase(db)
	productUsecase := usecase.NewProductUsecase(db)
	orderUsecase := usecase.NewOrderUsecase(db)
	inventoryUsecase := usecase.NewInventoryUsecase(db)
	reportUsecase := usecase.NewReportUsecase(db)
	expenseUsecase := usecase.NewExpenseUsecase(db)
	settingsUsecase := usecase.NewSettingsUsecase(db)
	webhookUsecase := usecase.NewWebhookUsecase(db)

	handlers := &routes.Handlers{
		Auth:      handler.NewAuthHandler(authUsecase),
		Product:   handler.NewProductHandler(productUsecase),
		Order:     handler.NewOrderHandler(orderUsecase),
		Inventory: handler.NewInventoryHandler(inventoryUsecase),
		Report:    handler.NewReportHandler(reportUsecase),
		Expense:   handler.NewExpenseHandler(expenseUsecase),
		Settings:  handler.NewSettingsHandler(settingsUsecase),
		Webhook:   handler.NewWebhookHandler(webhookUsecase),
	}

	r := gin.Default()

	// CORS Middleware
	allowedOrigins := map[string]bool{
		"http://localhost:3000": true,
		"http://localhost:8081": true,
		"http://localhost:5173": true,
		"http://localhost:8080": true,
	}

	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin == "" || allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	routes.SetupRoutes(r, handlers)

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("Server starting on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	sqlDB, err := db.DB()
	if err == nil {
		sqlDB.Close()
	}

	log.Println("Server exited gracefully")
}
