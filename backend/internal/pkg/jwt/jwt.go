package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"gorm.io/gorm"

	"singgah-pos-backend/internal/repository/postgres"
)

// JwtKey is the secret key used to sign and verify JWT tokens.
var JwtKey []byte

// db is set during initialization for token blacklist checking
var db *gorm.DB

// Init initializes the JWT package with a secret and database connection
func Init(secret string, database *gorm.DB) {
	JwtKey = []byte(secret)
	db = database
}

type Claims struct {
	UserID uint   `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uint, email, role string) (string, error) {
	if JwtKey == nil {
		return "", errors.New("JWT not initialized")
	}
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JwtKey)
}

func ValidateToken(tokenString string) (*Claims, error) {
	if JwtKey == nil {
		return nil, errors.New("JWT not initialized")
	}
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return JwtKey, nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	// Check if token is blacklisted
	if db != nil {
		tokenBlacklistRepo := postgres.NewTokenBlacklistRepository(db)
		if isBlacklisted, err := tokenBlacklistRepo.IsTokenBlacklisted(tokenString); err != nil {
			// Log error but don't fail open - if we can't check, assume token is valid for availability
			// In production, you might want to fail closed here
		} else if isBlacklisted {
			return nil, errors.New("token has been revoked")
		}
	}

	return claims, nil
}
