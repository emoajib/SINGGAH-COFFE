// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// Technical Assumptions: Using GORM for database operations

package postgres

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/repository"

	"gorm.io/gorm"
)

// tokenBlacklistRepo implements TokenBlacklistRepository using GORM
type tokenBlacklistRepo struct {
	db *gorm.DB
}

// NewTokenBlacklistRepository creates a new token blacklist repository
func NewTokenBlacklistRepository(db *gorm.DB) repository.TokenBlacklistRepository {
	return &tokenBlacklistRepo{db: db}
}

// Create adds a token to the blacklist
func (r *tokenBlacklistRepo) Create(blacklist *entity.TokenBlacklist) error {
	return r.db.Create(blacklist).Error
}

// FindByJti finds a blacklisted token by its JWT ID (jti)
func (r *tokenBlacklistRepo) FindByJti(jti string) (*entity.TokenBlacklist, error) {
	var blacklist entity.TokenBlacklist
	err := r.db.Where("jti = ?", jti).First(&blacklist).Error
	if err != nil {
		return nil, err
	}
	return &blacklist, nil
}

// FindByTokenHash finds a blacklisted token by its hash (we store the hashed token)
func (r *tokenBlacklistRepo) FindByTokenHash(tokenHash string) (*entity.TokenBlacklist, error) {
	var blacklist entity.TokenBlacklist
	err := r.db.Where("token = ?", tokenHash).First(&blacklist).Error
	if err != nil {
		return nil, err
	}
	return &blacklist, nil
}

// DeleteExpired removes expired tokens from the blacklist
func (r *tokenBlacklistRepo) DeleteExpired() error {
	return r.db.Where("expires_at < ?", time.Now()).Delete(&entity.TokenBlacklist{}).Error
}

// IsJtiBlacklisted checks if a token is in the blacklist by its JTI
func (r *tokenBlacklistRepo) IsJtiBlacklisted(jti string) (bool, error) {
	var count int64
	err := r.db.Model(&entity.TokenBlacklist{}).Where("jti = ?", jti).Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}