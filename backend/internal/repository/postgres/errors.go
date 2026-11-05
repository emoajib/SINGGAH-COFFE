package postgres

import (
	"errors"
	"strings"

	"gorm.io/gorm"
)

// IsDuplicateKey reports whether err represents a unique-constraint /
// duplicate-key violation (MySQL error 1062, SQLite 1555/2067, etc.).
// GORM's drivers translate these into gorm.ErrDuplicatedKey; we also
// fall back to a message-based check for drivers/paths that do not.
func IsDuplicateKey(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "duplicate") ||
		strings.Contains(msg, "unique constraint") ||
		strings.Contains(msg, "constraint failed")
}