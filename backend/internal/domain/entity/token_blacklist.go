// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// Technical Assumptions: Using GORM model for token blacklist with automatic cleanup of expired tokens

package entity

import (
	"time"
)

// TokenBlacklist represents a revoked JWT token
type TokenBlacklist struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Jti       string         `json:"jti" gorm:"unique;not null"` // JWT ID claim
	UserID    uint           `json:"user_id" gorm:"index"`
	Token     string         `json:"token" gorm:"not null"`      // Hashed token for security
	RevokedAt time.Time      `json:"revoked_at" gorm:"autoCreateTime"`
	ExpiresAt time.Time      `json:"expires_at" gorm:"index"`    // Token expiration time for cleanup
}

// TableName specifies the table name for TokenBlacklist
func (TokenBlacklist) TableName() string {
	return "token_blacklist"
}