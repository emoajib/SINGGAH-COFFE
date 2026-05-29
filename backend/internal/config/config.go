package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	DatabaseURL  string
	JWTSecret    string
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
		DatabaseURL: getEnv("DATABASE_URL", "host=localhost user=postgres password=postgres dbname=singgah_pos port=5432 sslmode=disable"),
		JWTSecret:   secret,
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
