package usecase

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"singgah-pos-backend/internal/models"
)

func setupWebhookTestDB(migrateWebhook bool) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to database: " + err.Error())
	}
	if migrateWebhook {
		db.AutoMigrate(&models.ProcessedWebhook{}, &models.Setting{})
	} else {
		db.AutoMigrate(&models.Setting{})
	}
	// seed callback token
	db.Create(&models.Setting{Key: "xendit_callback_token", Value: "secret"})
	return db
}

func TestWebhook_DuplicateKeyTreatedAsReplay(t *testing.T) {
	db := setupWebhookTestDB(true)
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()

	uc := NewWebhookUsecase(db)
	payload := XenditCallback{ID: "wh-dup-1", ExternalID: "ORD-NOTFOUND", Status: "PAID"}

	// first call inserts webhook row
	err := uc.ProcessXenditWebhook("secret", payload)
	assert.NoError(t, err)

	// second call with same webhook id is a duplicate -> should be treated as replay, no error
	err = uc.ProcessXenditWebhook("secret", payload)
	assert.NoError(t, err)
}

func TestWebhook_NonDuplicateDBErrorPropagates(t *testing.T) {
	// ProcessedWebhook table missing -> Create fails with non-duplicate error -> must propagate
	db := setupWebhookTestDB(false)
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()

	uc := NewWebhookUsecase(db)
	payload := XenditCallback{ID: "wh-err-1", ExternalID: "ORD-NOTFOUND", Status: "PAID"}

	err := uc.ProcessXenditWebhook("secret", payload)
	assert.Error(t, err)
}