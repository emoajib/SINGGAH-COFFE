package database

import (
	"embed"
	"fmt"
	"log"
	"sort"
	"strconv"
	"strings"

	"gorm.io/gorm"
)

//go:embed migrations/*.up.sql
var migrationFS embed.FS

// runVersionedMigrations applies pending *.up.sql migrations in version order.
// Each migration is recorded in schema_migrations to avoid re-running.
func runVersionedMigrations(db *gorm.DB) {
	db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version INT PRIMARY KEY,
		name VARCHAR(255) NOT NULL,
		applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
	)`)

	entries, err := migrationFS.ReadDir("migrations")
	if err != nil {
		log.Printf("Migration read dir failed: %v", err)
		return
	}
	type mig struct {
		version int
		name    string
		sql     string
	}
	var migs []mig
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		if !strings.HasSuffix(name, ".up.sql") {
			continue
		}
		parts := strings.SplitN(name, "_", 2)
		v, err := strconv.Atoi(parts[0])
		if err != nil {
			log.Printf("Skip migration with bad version prefix: %s", name)
			continue
		}
		b, err := migrationFS.ReadFile("migrations/" + name)
		if err != nil {
			log.Printf("Read migration %s failed: %v", name, err)
			continue
		}
		migs = append(migs, mig{version: v, name: name, sql: string(b)})
	}
	sort.Slice(migs, func(i, j int) bool { return migs[i].version < migs[j].version })

	for _, m := range migs {
		var count int64
		db.Raw("SELECT COUNT(*) FROM schema_migrations WHERE version = ?", m.version).Scan(&count)
		if count > 0 {
			continue
		}
		tx := db.Begin()
		if err := tx.Exec(m.sql).Error; err != nil {
			tx.Rollback()
			log.Printf("Migration %d (%s) failed: %v", m.version, m.name, err)
			continue
		}
		if err := tx.Exec("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, NOW())", m.version, m.name).Error; err != nil {
			tx.Rollback()
			log.Printf("Migration record %d (%s) failed: %v", m.version, m.name, err)
			continue
		}
		tx.Commit()
		log.Printf("Migration %d (%s) applied", m.version, m.name)
	}
	_ = fmt.Sprintf
}
