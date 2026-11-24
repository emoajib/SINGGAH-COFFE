package config

import (
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	DatabaseURL  string
	JWTSecret    string
	CORSOrigins  string
}

func LoadConfig() Config {
	err := godotenv.Load()
	if err != nil {
		// handle error if .env file is not present, use defaults
	}

	secret := getEnv("JWT_SECRET", "")
	if secret == "" {
		panic("JWT_SECRET environment variable is required")
	}
	if len(secret) < 32 {
		panic("JWT_SECRET must be at least 32 characters long")
	}

	return Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "root:password@tcp(127.0.0.1:3306)/singgah_pos?charset=utf8mb4&parseTime=True&loc=Local"),
		JWTSecret:   secret,
		CORSOrigins: getEnv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8081,http://localhost:5173,http://localhost:8080"),
	}
}

// UploadsDir returns the uploads directory, unified via UPLOADS_DIR env with fallback.
func UploadsDir() string {
	if v := os.Getenv("UPLOADS_DIR"); strings.TrimSpace(v) != "" {
		return strings.TrimSpace(v)
	}
	return "./uploads"
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
