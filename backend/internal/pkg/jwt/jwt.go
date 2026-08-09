package jwt

import (
	"crypto/rand"
	"encoding/hex"
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
	UserID   uint   `json:"user_id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	OutletID uint   `json:"outlet_id"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uint, name, email, role string, outletID ...uint) (string, error) {
	if JwtKey == nil {
		return "", errors.New("JWT not initialized")
	}
	oid := uint(0)
	if len(outletID) > 0 {
		oid = outletID[0]
	}

	// Generate JTI (JWT ID) — 16 random bytes hex-encoded, unique per token.
	// Used for token revocation via the blacklist (keyed by jti, not by token).
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	jti := hex.EncodeToString(b) // 32-char hex, unique per token

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID:   userID,
		Name:     name,
		Email:    email,
		Role:     role,
		OutletID: oid,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
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
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
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
		if isBlacklisted, err := tokenBlacklistRepo.IsJtiBlacklisted(claims.ID); err != nil {
			return nil, errors.New("unable to verify token")
		} else if isBlacklisted {
			return nil, errors.New("token has been revoked")
		}
	}

	return claims, nil
}
