package handler

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"

	"singgah-pos-backend/internal/config"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// validBackupName hanya mengizinkan nama file backup yang aman (anti command injection & traversal).
var validBackupName = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,63}\.(sql\.gz|tar\.gz)$`)

func isValidBackupName(name string) bool {
	return validBackupName.MatchString(name)
}

type BackupHandler struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewBackupHandler(db *gorm.DB, cfg *config.Config) *BackupHandler {
	return &BackupHandler{db: db, cfg: cfg}
}

type backupRequest struct {
	Type string `json:"type" binding:"required"`
}

type backupFile struct {
	Name    string `json:"name"`
	Size    string `json:"size"`
	ModTime string `json:"modified"`
	Type    string `json:"type"`
}

type restoreRequest struct {
	File string `json:"file" binding:"required"`
	Type string `json:"type" binding:"required"`
}

func (h *BackupHandler) CreateBackup(c *gin.Context) {
	var req backupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	backupDir := filepath.Join(".", "backups")
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create backup dir"})
		return
	}

	ts := time.Now().Format("20060102_150405")
	var results []gin.H
	status := "success"

	if req.Type == "db" || req.Type == "all" {
		user, pass, host, port, dbname, err := h.parseDBConfig()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		outFile := filepath.Join(backupDir, fmt.Sprintf("db_%s.sql.gz", ts))
		dumpCmd := fmt.Sprintf("set -o pipefail; mysqldump -u%s -h%s -P%s --single-transaction --quick --lock-tables=false %s | gzip > %s",
			user, host, port, dbname, outFile)
		cmd := exec.Command("bash", "-c", dumpCmd)
		cmd.Env = append(os.Environ(), "MYSQL_PWD="+pass)
		if out, e := cmd.CombinedOutput(); e != nil {
			status = "partial"
			results = append(results, gin.H{"type": "db", "status": "failed", "error": string(out), "details": e.Error()})
			os.Remove(outFile)
		} else {
			sizeBytes := fileSizeBytes(outFile)
			if sizeBytes <= 20 {
				status = "partial"
				results = append(results, gin.H{"type": "db", "status": "failed", "error": "mysqldump produced an empty archive (mysqldump unavailable or failed silently)"})
				os.Remove(outFile)
			} else {
				size, _ := getFileSize(outFile)
				// G1: tulis manifest checksum agar restore bisa memverifikasi integritas.
				_ = writeChecksumManifest(outFile)
				results = append(results, gin.H{"type": "db", "status": "ok", "file": fmt.Sprintf("db_%s.sql.gz", ts), "size": size})
			}
		}
	}

	if req.Type == "uploads" || req.Type == "all" {
		outFile := filepath.Join(backupDir, fmt.Sprintf("uploads_%s.tar.gz", ts))
		upDir := filepath.Join(".", "uploads")
		if _, err := os.Stat(upDir); os.IsNotExist(err) {
			status = "partial"
			results = append(results, gin.H{"type": "uploads", "status": "skipped", "reason": "uploads dir not found"})
		} else {
			cmd := exec.Command("tar", "czf", outFile, "-C", ".", "uploads")
			if out, e := cmd.CombinedOutput(); e != nil {
				status = "partial"
				results = append(results, gin.H{"type": "uploads", "status": "failed", "error": string(out), "details": e.Error()})
				os.Remove(outFile)
			} else {
				size, _ := getFileSize(outFile)
				_ = writeChecksumManifest(outFile)
				results = append(results, gin.H{"type": "uploads", "status": "ok", "file": fmt.Sprintf("uploads_%s.tar.gz", ts), "size": size})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"status":    status,
		"timestamp": ts,
		"results":   results,
	})
}

func (h *BackupHandler) GetBackupHistory(c *gin.Context) {
	backupDir := filepath.Join(".", "backups")
	entries, err := os.ReadDir(backupDir)
	if err != nil {
		if os.IsNotExist(err) {
			c.JSON(http.StatusOK, gin.H{"backups": []backupFile{}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read backup directory"})
		return
	}

	var files []backupFile
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		info, _ := entry.Info()
		var btype string
		switch {
		case strings.HasPrefix(entry.Name(), "db_"):
			btype = "database"
		case strings.HasPrefix(entry.Name(), "uploads_"):
			btype = "uploads"
		default:
			btype = "other"
		}
		files = append(files, backupFile{
			Name:    entry.Name(),
			Size:    formatBytes(info.Size()),
			ModTime: info.ModTime().Format("2006-01-02 15:04:05"),
			Type:    btype,
		})
	}
	sort.Slice(files, func(i, j int) bool {
		return files[i].ModTime > files[j].ModTime
	})
	c.JSON(http.StatusOK, gin.H{"backups": files})
}

func (h *BackupHandler) GetBackupStatus(c *gin.Context) {
	backupDir := filepath.Join(".", "backups")

	dbSize := "unknown"
	if sqlDB, err := h.db.DB(); err == nil {
		var sizeMB float64
		row := sqlDB.QueryRow("SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) FROM information_schema.tables WHERE table_schema = DATABASE()")
		row.Scan(&sizeMB)
		dbSize = fmt.Sprintf("%.1f MB", sizeMB)
	}

	uploadsSize := "0 B"
	upDir := filepath.Join(".", "uploads")
	if _, err := os.Stat(upDir); !os.IsNotExist(err) {
		uploadsSize = formatBytes(dirSize(upDir))
	}

	diskAvail := "unknown"
	if sz, err := getDiskUsage("."); err == nil {
		diskAvail = sz
	}

	_, _, _, _, dbname, _ := h.parseDBConfig()
	if dbname == "" {
		dbname = "unknown"
	}

	var lastBackup string
	if entries, err := os.ReadDir(backupDir); err == nil && len(entries) > 0 {
		sort.Slice(entries, func(i, j int) bool {
			ii, _ := entries[i].Info()
			jj, _ := entries[j].Info()
			return ii.ModTime().After(jj.ModTime())
		})
		if info, err := entries[0].Info(); err == nil {
			lastBackup = info.ModTime().Format("2006-01-02 15:04:05")
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"database":   gin.H{"name": dbname, "size": dbSize},
		"uploads":    gin.H{"path": upDir, "size": uploadsSize},
		"disk":       gin.H{"available": diskAvail, "backupDir": backupDir},
		"lastBackup": lastBackup,
	})
}

func (h *BackupHandler) RestoreBackup(c *gin.Context) {
	var req restoreRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !isValidBackupName(req.File) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid backup filename"})
		return
	}

	backupDir := filepath.Join(".", "backups")
	srcFile := filepath.Join(backupDir, req.File)

	if _, err := os.Stat(srcFile); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "backup file not found"})
		return
	}

	if req.Type == "db" {
		user, pass, host, port, dbname, err := h.parseDBConfig()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// G1 langkah 1: verifikasi checksum (bila manifest tersedia) sebelum
		// menyentuh database. Arsip yang berubah/rusak ditolak lebih awal.
		if err := verifyChecksumManifest(srcFile); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "verifikasi backup gagal", "details": err.Error()})
			return
		}
		// G1 langkah 2: uji integritas gzip sampai habis.
		if err := validateGzipIntegrity(srcFile); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "verifikasi backup gagal", "details": err.Error()})
			return
		}

		// G1 langkah 3: snapshot database saat ini. Tanpa snapshot, restore
		// parsial bisa meninggalkan data rusak tanpa jalan pulang → fail closed.
		snapshotName := fmt.Sprintf("db_pre_restore_%s.sql.gz", time.Now().Format("20060102_150405"))
		snapshotPath := filepath.Join(backupDir, snapshotName)
		if err := dumpDatabase(snapshotPath, user, pass, host, port, dbname); err != nil {
			os.Remove(snapshotPath)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error":   "restore dibatalkan: gagal membuat snapshot pengaman",
				"details": err.Error(),
			})
			return
		}
		if fileSizeBytes(snapshotPath) <= 20 {
			os.Remove(snapshotPath)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "restore dibatalkan: snapshot pengaman kosong (mysqldump tidak tersedia?)",
			})
			return
		}
		_ = writeChecksumManifest(snapshotPath)

		// G1 langkah 4: eksekusi restore.
		if err := restoreDatabaseDump(srcFile, user, pass, host, port, dbname); err != nil {
			// G1 langkah 5: restore gagal di tengah → pulihkan snapshot (sekali coba).
			rollbackState := "ok"
			rollbackErr := restoreDatabaseDump(snapshotPath, user, pass, host, port, dbname)
			if rollbackErr != nil {
				rollbackState = "failed"
			}
			resp := gin.H{
				"error":    "restore gagal",
				"details":  err.Error(),
				"snapshot": snapshotName,
				"rollback": rollbackState,
			}
			if rollbackErr != nil {
				resp["rollback_error"] = rollbackErr.Error()
			}
			c.JSON(http.StatusInternalServerError, resp)
			return
		}

		// G1 langkah 6: verifikasi skema hasil restore.
		if err := h.verifyRestoredSchema(); err != nil {
			rollbackState := "ok"
			rollbackErr := restoreDatabaseDump(snapshotPath, user, pass, host, port, dbname)
			if rollbackErr != nil {
				rollbackState = "failed"
			}
			resp := gin.H{
				"error":             "verifikasi restore gagal, snapshot dipulihkan",
				"details":           err.Error(),
				"snapshot":          snapshotName,
				"rollback":          rollbackState,
				"restore_cancelled": true,
			}
			if rollbackErr != nil {
				resp["rollback_error"] = rollbackErr.Error()
			}
			c.JSON(http.StatusInternalServerError, resp)
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":   "ok",
			"message":  "database restored from " + req.File,
			"snapshot": snapshotName,
		})
		return
	}

	if req.Type == "uploads" {
		upDir := filepath.Join(".", "uploads")
		// G1: verifikasi checksum arsip uploads (bila manifest tersedia).
		if err := verifyChecksumManifest(srcFile); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "verifikasi backup gagal", "details": err.Error()})
			return
		}
		// G2: ekstraksi tervalidasi (anti path traversal) + staging atomik.
		if err := restoreUploadsArchive(srcFile, upDir); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "restore uploads gagal", "details": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok", "message": "uploads restored from " + req.File})
		return
	}

	c.JSON(http.StatusBadRequest, gin.H{"error": "invalid restore type, use 'db' or 'uploads'"})
}

// verifyRestoredSchema memastikan tabel inti benar-benar ada setelah restore.
// Ini menangkap kasus dump terpotong/rusak yang tetap membuat exit code 0.
func (h *BackupHandler) verifyRestoredSchema() error {
	if h.db == nil {
		return nil
	}
	required := []string{"users", "orders", "order_items", "ingredients", "cash_books"}
	for _, table := range required {
		var count int64
		if err := h.db.Raw(
			"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
			table,
		).Scan(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			return fmt.Errorf("tabel wajib '%s' tidak ditemukan setelah restore", table)
		}
	}
	return nil
}

func (h *BackupHandler) DownloadBackup(c *gin.Context) {
	name := c.Param("name")
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "filename required"})
		return
	}
	if !isValidBackupName(name) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid filename"})
		return
	}
	filePath := filepath.Join(".", "backups", name)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
		return
	}
	c.FileAttachment(filePath, name)
}

func (h *BackupHandler) UploadBackup(c *gin.Context) {
	backupDir := filepath.Join(".", "backups")
	os.MkdirAll(backupDir, 0755)

	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to parse form"})
		return
	}
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !isValidBackupName(file.Filename) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid filename"})
		return
	}
	// Simpan dengan nama server-generated agar nama klien tidak dipercaya.
	safeName := fmt.Sprintf("%s_%s", time.Now().Format("20060102_150405"), file.Filename)
	dst := filepath.Join(backupDir, safeName)
	if err := c.SaveUploadedFile(file, dst); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save file"})
		return
	}
	info, _ := os.Stat(dst)
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
		"file":   safeName,
		"size":   formatBytes(info.Size()),
	})
}

func (h *BackupHandler) parseDBConfig() (user, pass, host, port, dbname string, err error) {
	return parseDBDSN(h.cfg.DatabaseURL)
}

// parseDBDSN extracts user, password, host, port, dbname from a go-sql-driver
// DSN. Passwords may contain '@', so the split point is the '@tcp(' marker
// (matching go-sql-driver/mysql, which uses the last '@' before the protocol).
func parseDBDSN(dsn string) (user, pass, host, port, dbname string, err error) {
	atIdx := strings.Index(dsn, "@tcp(")
	if atIdx < 0 {
		return "", "", "", "", "", fmt.Errorf("invalid DATABASE_URL: missing @tcp(")
	}
	creds := strings.SplitN(dsn[:atIdx], ":", 2)
	if len(creds) != 2 {
		return "", "", "", "", "", fmt.Errorf("invalid DATABASE_URL: missing password")
	}
	user, pass = creds[0], creds[1]

	tcpPart := dsn[atIdx+len("@tcp("):]
	closeParen := strings.Index(tcpPart, ")")
	if closeParen < 0 {
		return "", "", "", "", "", fmt.Errorf("invalid DATABASE_URL: missing closing paren")
	}
	hostPort := tcpPart[:closeParen]
	parts := strings.Split(hostPort, ":")
	host = parts[0]
	port = "3306"
	if len(parts) > 1 {
		port = parts[1]
	}

	rest := strings.TrimPrefix(tcpPart[closeParen+1:], "/")
	if dbIdx := strings.Index(rest, "?"); dbIdx >= 0 {
		rest = rest[:dbIdx]
	}
	return user, pass, host, port, rest, nil
}

func getFileSize(path string) (string, error) {
	info, err := os.Stat(path)
	if err != nil {
		return "", err
	}
	return formatBytes(info.Size()), nil
}

func fileSizeBytes(path string) int64 {
	info, err := os.Stat(path)
	if err != nil {
		return -1
	}
	return info.Size()
}

func formatBytes(size int64) string {
	const unit = 1024
	if size < unit {
		return fmt.Sprintf("%d B", size)
	}
	div, exp := int64(unit), 0
	for n := size / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(size)/float64(div), "KMGTPE"[exp])
}

func dirSize(path string) int64 {
	var size int64
	filepath.Walk(path, func(_ string, info os.FileInfo, err error) error {
		if err == nil && !info.IsDir() {
			size += info.Size()
		}
		return nil
	})
	return size
}

func getDiskUsage(path string) (string, error) {
	cmd := exec.Command("df", "-h", path)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", err
	}
	lines := strings.Split(string(output), "\n")
	if len(lines) >= 2 {
		fields := strings.Fields(lines[1])
		if len(fields) >= 4 {
			return fields[3] + " available", nil
		}
	}
	return "", nil
}
