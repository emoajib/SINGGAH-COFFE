package usecase

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/pkg/jwt"
	"singgah-pos-backend/internal/pkg/password"
	"singgah-pos-backend/internal/models"
)

// Helper function to create a test database for auth tests
func setupAuthTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to database: " + err.Error())
	}
	
	// Initialize JWT for testing
	jwt.Init("test-secret-key-for-testing-only", db)
	
	// Migrate the schema
	db.AutoMigrate(&models.User{})
	return db
}

// Helper function to create a test usecase for auth tests
func createAuthUsecase(db *gorm.DB) *AuthUsecase {
	return NewAuthUsecase(db)
}

func TestAuthUsecase_LoginSuccess(t *testing.T) {
	// Setup
	db := setupAuthTestDB()
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	
	uc := createAuthUsecase(db)

	// Seed test data
	hashedPwd, err := password.HashPassword("password123")
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}
	userModel := &models.User{
		Name:     "Test User",
		Email:    "test@example.com",
		Password: hashedPwd,
		Role:     "owner",
	}
	db.Create(userModel)

	// Execute
	req := LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	}
	resp, err := uc.Login(req)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.NotEmpty(t, resp.Token)
	assert.Equal(t, "Test User", resp.User.Name)
	assert.Equal(t, "test@example.com", resp.User.Email)
}

func TestAuthUsecase_LoginInvalidCredentials(t *testing.T) {
	// Setup
	db := setupAuthTestDB()
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	
	uc := createAuthUsecase(db)

	// Execute
	req := LoginRequest{
		Email:    "nonexistent@example.com",
		Password: "wrongpassword",
	}
	_, err := uc.Login(req)

	// Assert
	assert.Error(t, err)
	assert.ErrorIs(t, err, errors.ErrUnauthorized)
}

func TestAuthUsecase_RegisterSuccess(t *testing.T) {
	// Setup
	db := setupAuthTestDB()
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	
	uc := createAuthUsecase(db)

	// Execute
	resp, err := uc.Register("John Doe", "john@example.com", "password123", "cashier")

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, "John Doe", resp.Name)
	assert.Equal(t, "john@example.com", resp.Email)
	assert.Equal(t, "cashier", resp.Role)
}

func TestAuthUsecase_GetUsers(t *testing.T) {
	// Setup
	db := setupAuthTestDB()
	defer func() {
		sqlDB, _ := db.DB()
		sqlDB.Close()
	}()
	
	uc := createAuthUsecase(db)

	// Seed test data
	hashedPwd, err := password.HashPassword("password123")
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}
	users := []models.User{
		{Name: "User One", Email: "user1@example.com", Password: hashedPwd, Role: "cashier"},
		{Name: "User Two", Email: "user2@example.com", Password: hashedPwd, Role: "manager"},
	}
	for _, u := range users {
		db.Create(&u)
	}

	// Execute
	resp, err := uc.GetUsers()

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Len(t, resp, 2)
	assert.Equal(t, "User One", resp[0].Name)
	assert.Equal(t, "User Two", resp[1].Name)
}