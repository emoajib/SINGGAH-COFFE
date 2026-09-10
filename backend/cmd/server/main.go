package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"encoding/json"
	"singgah-pos-backend/internal/config"
	"singgah-pos-backend/internal/database"
	"singgah-pos-backend/internal/delivery/handler"
	"singgah-pos-backend/internal/pkg/jwt"
	"singgah-pos-backend/internal/routes"
	"singgah-pos-backend/internal/usecase"
	"strings"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func main() {
	port := flag.String("port", "8080", "Port to run the server on")
	staticDir := flag.String("static-dir", "./web", "Directory containing static frontend files")
	flag.Parse()

	os.MkdirAll("uploads/logo", 0755)
	os.MkdirAll("uploads/products", 0755)
	handler.EnsureDefaultPWAIcon(filepath.Join("uploads/logo", "pwa-icon.png"))

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
		cashRegisterUsecase := usecase.NewCashRegisterUsecase(db)
		cashBookUsecase := usecase.NewCashBookUsecase(db)
		productionTargetUsecase := usecase.NewProductionTargetUsecase(db)
		profitSharingUsecase := usecase.NewProfitSharingUsecase(db)

	// Context for graceful background worker shutdowns
	bgCtx, bgCancel := context.WithCancel(context.Background())
	defer bgCancel()

	// Start background cleanup of expired tokens every hour
	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-bgCtx.Done():
				return
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
		Auth:          handler.NewAuthHandler(authUsecase),
		Product:       handler.NewProductHandler(productUsecase),
		Order:         handler.NewOrderHandler(orderUsecase),
		Inventory:     handler.NewInventoryHandler(inventoryUsecase),
		Report:        handler.NewReportHandler(reportUsecase),
		Expense:       handler.NewExpenseHandler(expenseUsecase),
		Settings:      handler.NewSettingsHandler(settingsUsecase),
		Webhook:       handler.NewWebhookHandler(webhookUsecase),
		BEP:           handler.NewBEPHandler(bepUsecase),
		Outlet:        handler.NewOutletHandler(outletUsecase),
		CashRegister:  handler.NewCashRegisterHandler(cashRegisterUsecase),
		CashBook:      handler.NewCashBookHandler(cashBookUsecase),
		Backup:        handler.NewBackupHandler(db, &cfg),
		Sync:          handler.NewSyncHandler(&cfg),
		ProductionTarget: handler.NewProductionTargetHandler(productionTargetUsecase),
		ProfitSharing:    handler.NewProfitSharingHandler(profitSharingUsecase),
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
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-Outlet-ID")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		// Security headers
		c.Writer.Header().Set("X-Content-Type-Options", "nosniff")
		c.Writer.Header().Set("X-Frame-Options", "DENY")
		c.Writer.Header().Set("X-XSS-Protection", "0")
		c.Writer.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	routes.SetupRoutes(r, handlers, db)

	// Serve static frontend files for SPA — all non-API routes serve static file or index.html
	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		staticFile := *staticDir + path

		// For manifest.webmanifest: inject dynamic PWA colors from settings
		// and version-bust the icon URL so the browser always fetches the latest logo.
		if strings.HasSuffix(path, "/manifest.webmanifest") || path == "manifest.webmanifest" {
			if data, err := os.ReadFile(staticFile); err == nil {
				iconPath := filepath.Join("uploads", "logo", "pwa-icon.png")
				if info, err := os.Stat(iconPath); err == nil {
					v := fmt.Sprintf("%d", info.ModTime().Unix())
					data = []byte(strings.ReplaceAll(string(data), "/uploads/logo/pwa-icon.png", "/uploads/logo/pwa-icon.png?v="+v))
				}

				// Inject owner's PWA colors from settings
				var manifest map[string]interface{}
				if json.Unmarshal(data, &manifest) == nil {
					if bgColor := getSettingValue(db, "pwa_background_color"); bgColor != "" {
						manifest["background_color"] = bgColor
					}
					if themeColor := getSettingValue(db, "pwa_theme_color"); themeColor != "" {
						manifest["theme_color"] = themeColor
					}
					if data, err = json.Marshal(manifest); err == nil {
						c.Data(http.StatusOK, "application/manifest+json", data)
						return
					}
				}

				c.Data(http.StatusOK, "application/manifest+json", data)
				return
			}
		}

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

// getSettingValue reads a single setting value by key from the database.
// Returns empty string on error so callers can fall back to defaults.
func getSettingValue(db *gorm.DB, key string) string {
	var value string
	if err := db.Model(&struct{}{}).Table("settings").Select("value").Where("`key` = ?", key).Scan(&value).Error; err != nil {
		return ""
	}
	return value
}
