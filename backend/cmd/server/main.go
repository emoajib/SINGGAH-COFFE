package main

import (
	"log"
	"os"
	"singgah-pos-backend/internal/auth"
	"singgah-pos-backend/internal/config"
	"singgah-pos-backend/internal/database"
	"singgah-pos-backend/internal/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	// Ensure upload directories exist
	os.MkdirAll("uploads/logo", 0755)
	os.MkdirAll("uploads/products", 0755)

	// Load Configuration
	cfg := config.LoadConfig()

	// Initialize Auth
	auth.Init(cfg.JWTSecret)

	// Connect to Database
	db := database.Connect(cfg)

	// Initialize Router
	r := gin.Default()

	// CORS Middleware
	// CORS Middleware
	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Setup Routes
	routes.SetupRoutes(r, db)

	// Start Server
	log.Printf("Server starting on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
