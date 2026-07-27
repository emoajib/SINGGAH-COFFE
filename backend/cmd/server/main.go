package main

import (
	"context"
	"flag"
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
	"strings"
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
	port := flag.String("port", "8080", "Port to run the server on")
	staticDir := flag.String("static-dir", "./web", "Directory containing static frontend files")
	flag.Parse()

	os.MkdirAll("uploads/logo", 0755)
	os.MkdirAll("uploads/products", 0755)

	cfg := config.LoadConfig()
	if *port != "8080" {
		cfg.Port = *port
	}

	db := database.Connect(cfg)
	jwt.Init(cfg.JWTSecret, db)

	authUsecase := usecase.NewAuthUsecase(db)
	productUsecase := usecase.NewProductUsecase(db)
	orderUsecase := usecase.NewOrderUsecase(db)
	inventoryUsecase := usecase.NewInventoryUsecase(db)
	reportUsecase := usecase.NewReportUsecase(db)
	expenseUsecase := usecase.NewExpenseUsecase(db)
	settingsUsecase := usecase.NewSettingsUsecase(db)
	webhookUsecase := usecase.NewWebhookUsecase(db)
	bepUsecase := usecase.NewBEPUsecase(db)
	outletUsecase := usecase.NewOutletUsecase(db)

	// Start background cleanup of expired tokens every hour
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := authUsecase.CleanupExpiredTokens(); err != nil {
					log.Printf("Error cleaning up expired tokens: %v", err)
				} else {
					log.Println("Expired tokens cleaned up successfully")
				}
			}
		}
	}()

	handlers := &routes.Handlers{
		Auth:      handler.NewAuthHandler(authUsecase),
		Product:   handler.NewProductHandler(productUsecase),
		Order:     handler.NewOrderHandler(orderUsecase),
		Inventory: handler.NewInventoryHandler(inventoryUsecase),
		Report:    handler.NewReportHandler(reportUsecase),
		Expense:   handler.NewExpenseHandler(expenseUsecase),
		Settings:  handler.NewSettingsHandler(settingsUsecase),
		Webhook:   handler.NewWebhookHandler(webhookUsecase),
		BEP:       handler.NewBEPHandler(bepUsecase),
		Outlet:    handler.NewOutletHandler(outletUsecase),
	}

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// Build allowed origins set
	allowedOrigins := make(map[string]bool)
	for _, o := range strings.Split(cfg.CORSOrigins, ",") {
		allowedOrigins[strings.TrimSpace(o)] = true
	}

	// CORS + Security Headers Middleware
	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin == "" || allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		// Security headers
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")
		c.Writer.Header().Set("X-Frame-Options", "DENY")
		c.Writer.Header().Set("X-XSS-Protection", "0")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	routes.SetupRoutes(r, handlers, db)

	// Serve static frontend files for SPA — all non-API routes serve index.html
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api") || strings.HasPrefix(path, "/health") || strings.HasPrefix(path, "/uploads") {
			c.Status(http.StatusNotFound)
			return
		}
		staticFile := *staticDir + path
		if info, err := os.Stat(staticFile); err == nil && !info.IsDir() {
			c.File(staticFile)
			return
		}
		c.File(*staticDir + "/index.html")
	})

	srv := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: r,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("Server starting on port %s, static dir: %s", cfg.Port, *staticDir)
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
