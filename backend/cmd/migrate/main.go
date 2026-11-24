package main

import (
	"log"
	"os"

	"singgah-pos-backend/internal/config"
	"singgah-pos-backend/internal/database"
)

func main() {
	os.Setenv("RUN_MIGRATIONS", "1")
	cfg := config.LoadConfig()
	db := database.Connect(cfg)
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("failed to get sql.DB: %v", err)
	}
	defer sqlDB.Close()
	log.Println("migrations applied (DB-01)")
}
