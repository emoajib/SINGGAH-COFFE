package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"singgah-pos-backend/internal/config"

	"github.com/gin-gonic/gin"
)

// SyncHandler forwards backup data between the local backend and the
// remote production server (SYNC_SERVER_URL) using the website's own API.
type SyncHandler struct {
	cfg       *config.Config
	serverURL string
	ownerMail string
	ownerPass string
	client    *http.Client
}

func NewSyncHandler(cfg *config.Config) *SyncHandler {
	return &SyncHandler{
		cfg:       cfg,
		serverURL: os.Getenv("SYNC_SERVER_URL"),
		ownerMail: os.Getenv("SYNC_OWNER_EMAIL"),
		ownerPass: os.Getenv("SYNC_OWNER_PASSWORD"),
		client:    &http.Client{Timeout: 120 * time.Second},
	}
}

type syncRequest struct {
	Type string `json:"type"`
}

// login obtains a JWT from the remote server using owner credentials.
func (h *SyncHandler) login() (string, error) {
	if h.serverURL == "" || h.ownerMail == "" || h.ownerPass == "" {
		return "", fmt.Errorf("SYNC_SERVER_URL, SYNC_OWNER_EMAIL, SYNC_OWNER_PASSWORD must be set")
	}
	body, _ := json.Marshal(map[string]string{
		"email":    h.ownerMail,
		"password": h.ownerPass,
	})
	req, err := http.NewRequest(http.MethodPost, h.serverURL+"/api/auth/login", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := h.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("login request failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("remote login failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(b)))
	}
	var result struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", fmt.Errorf("invalid login response: %w", err)
	}
	if result.Token == "" {
		return "", fmt.Errorf("remote login returned empty token")
	}
	return result.Token, nil
}

// dbBackup dumps the local database to backups/ and returns the file name.
func (h *SyncHandler) dbBackup() (string, error) {
	backupDir := filepath.Join(".", "backups")
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return "", err
	}
	user, pass, host, port, dbname, err := h.cfgDbConfig()
	if err != nil {
		return "", err
	}
	ts := time.Now().Format("20060102_150405")
	outFile := filepath.Join(backupDir, fmt.Sprintf("db_%s.sql.gz", ts))
	dumpCmd := fmt.Sprintf("set -o pipefail; mysqldump -u%s -p%s -h%s -P%s --single-transaction --quick --lock-tables=false %s | gzip > %s",
		user, pass, host, port, dbname, outFile)
	cmd := exec.Command("bash", "-c", dumpCmd)
	if out, e := cmd.CombinedOutput(); e != nil {
		os.Remove(outFile)
		return "", fmt.Errorf("mysqldump failed: %s", string(out))
	}
	if fileSizeBytes(outFile) <= 20 {
		os.Remove(outFile)
		return "", fmt.Errorf("mysqldump produced an empty archive")
	}
	return filepath.Base(outFile), nil
}

// cfgDbConfig mirrors BackupHandler.parseDBConfig, returning the local DB
// connection parts used by external commands (mysqldump/mysql).
func (h *SyncHandler) cfgDbConfig() (user, pass, host, port, dbname string, err error) {
	return parseDBDSN(h.cfg.DatabaseURL)
}

// uploadBackup sends a local backup file to the remote /api/backup/upload endpoint.
func (h *SyncHandler) uploadBackup(token, fileName string) error {
	fullPath := filepath.Join(".", "backups", fileName)
	fh, err := os.Open(fullPath)
	if err != nil {
		return err
	}
	defer fh.Close()

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	fw, err := mw.CreateFormFile("file", fileName)
	if err != nil {
		return err
	}
	if _, err := io.Copy(fw, fh); err != nil {
		return err
	}
	mw.Close()

	req, err := http.NewRequest(http.MethodPost, h.serverURL+"/api/backup/upload", &buf)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := h.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("remote upload failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(b)))
	}
	return nil
}

// restoreRemote asks the remote server to restore the given file.
func (h *SyncHandler) restoreRemote(token, fileName, typ string) error {
	body, _ := json.Marshal(map[string]string{
		"file": fileName,
		"type": typ,
	})
	req, err := http.NewRequest(http.MethodPost, h.serverURL+"/api/backup/restore", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := h.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("remote restore failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(b)))
	}
	return nil
}

// PushBackup creates a local backup and forwards it to the production server.
// type: "db", "uploads", or "all".
func (h *SyncHandler) PushBackup(c *gin.Context) {
	var req syncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Type == "" {
		req.Type = "db"
	}

	token, err := h.login()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var results []gin.H
	status := "success"

	if req.Type == "db" || req.Type == "all" {
		fileName, err := h.dbBackup()
		if err != nil {
			status = "partial"
			results = append(results, gin.H{"type": "db", "status": "failed", "error": err.Error()})
		} else if err := h.uploadBackup(token, fileName); err != nil {
			status = "partial"
			results = append(results, gin.H{"type": "db", "status": "failed", "error": err.Error()})
		} else if err := h.restoreRemote(token, fileName, "db"); err != nil {
			status = "partial"
			results = append(results, gin.H{"type": "db", "status": "failed", "error": err.Error()})
		} else {
			results = append(results, gin.H{"type": "db", "status": "ok", "file": fileName})
		}
	}

	if req.Type == "uploads" || req.Type == "all" {
		fileName := ""
		// uploads dir may not exist locally; report skipped instead of failing
		upDir := filepath.Join(".", "uploads")
		if _, err := os.Stat(upDir); os.IsNotExist(err) {
			status = "partial"
			results = append(results, gin.H{"type": "uploads", "status": "skipped", "reason": "uploads dir not found"})
		} else {
			ts := time.Now().Format("20060102_150405")
			fileName = fmt.Sprintf("uploads_%s.tar.gz", ts)
			outFile := filepath.Join(".", "backups", fileName)
			cmd := exec.Command("tar", "czf", outFile, "-C", ".", "uploads")
			if out, e := cmd.CombinedOutput(); e != nil {
				status = "partial"
				results = append(results, gin.H{"type": "uploads", "status": "failed", "error": string(out)})
			} else if err := h.uploadBackup(token, fileName); err != nil {
				status = "partial"
				results = append(results, gin.H{"type": "uploads", "status": "failed", "error": err.Error()})
			} else if err := h.restoreRemote(token, fileName, "uploads"); err != nil {
				status = "partial"
				results = append(results, gin.H{"type": "uploads", "status": "failed", "error": err.Error()})
			} else {
				results = append(results, gin.H{"type": "uploads", "status": "ok", "file": fileName})
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": status, "timestamp": time.Now().Format("20060102_150405"), "results": results})
}

// PullBackup downloads the latest remote backup and restores it locally.
// type: "db", "uploads", or "all".
func (h *SyncHandler) PullBackup(c *gin.Context) {
	var req syncRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Type == "" {
		req.Type = "db"
	}

	token, err := h.login()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// List remote backups
	histReq, err := http.NewRequest(http.MethodGet, h.serverURL+"/api/backup/history", nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	histReq.Header.Set("Authorization", "Bearer "+token)
	histResp, err := h.client.Do(histReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "fetch remote history failed: " + err.Error()})
		return
	}
	defer histResp.Body.Close()
	if histResp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(histResp.Body)
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("remote history failed (%d): %s", histResp.StatusCode, strings.TrimSpace(string(b)))})
		return
	}
	var hist struct {
		Backups []backupFile `json:"backups"`
	}
	if err := json.NewDecoder(histResp.Body).Decode(&hist); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid remote history: " + err.Error()})
		return
	}

	backupDir := filepath.Join(".", "backups")
	os.MkdirAll(backupDir, 0755)
	var results []gin.H
	status := "success"

	desired := map[string]bool{}
	if req.Type == "db" || req.Type == "all" {
		desired["database"] = true
	}
	if req.Type == "uploads" || req.Type == "all" {
		desired["uploads"] = true
	}

	for _, bf := range hist.Backups {
		if !desired[bf.Type] {
			continue
		}
		desired[bf.Type] = false

		dlReq, err := http.NewRequest(http.MethodGet, h.serverURL+"/api/backup/download/"+bf.Name, nil)
		if err != nil {
			status = "partial"
			results = append(results, gin.H{"type": bf.Type, "status": "failed", "error": err.Error()})
			continue
		}
		dlReq.Header.Set("Authorization", "Bearer "+token)
		dlResp, err := h.client.Do(dlReq)
		if err != nil {
			status = "partial"
			results = append(results, gin.H{"type": bf.Type, "status": "failed", "error": err.Error()})
			continue
		}
		if dlResp.StatusCode != http.StatusOK {
			dlResp.Body.Close()
			status = "partial"
			results = append(results, gin.H{"type": bf.Type, "status": "failed", "error": "download returned " + dlResp.Status})
			continue
		}

		dst := filepath.Join(backupDir, bf.Name)
		out, err := os.Create(dst)
		if err != nil {
			dlResp.Body.Close()
			status = "partial"
			results = append(results, gin.H{"type": bf.Type, "status": "failed", "error": err.Error()})
			continue
		}
		_, copyErr := io.Copy(out, dlResp.Body)
		out.Close()
		dlResp.Body.Close()
		if copyErr != nil {
			os.Remove(dst)
			status = "partial"
			results = append(results, gin.H{"type": bf.Type, "status": "failed", "error": copyErr.Error()})
			continue
		}

		restoreType := bf.Type
		if restoreType == "database" {
			restoreType = "db"
		}
		if err := h.restoreLocal(bf.Name, restoreType); err != nil {
			status = "partial"
			results = append(results, gin.H{"type": bf.Type, "status": "failed", "error": err.Error()})
			continue
		}
		results = append(results, gin.H{"type": bf.Type, "status": "ok", "file": bf.Name})
	}

	for typ, wanted := range desired {
		if wanted {
			status = "partial"
			results = append(results, gin.H{"type": typ, "status": "skipped", "reason": "no remote backup available"})
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": status, "timestamp": time.Now().Format("20060102_150405"), "results": results})
}

// restoreLocal applies a downloaded backup file to the local database/uploads.
func (h *SyncHandler) restoreLocal(fileName, typ string) error {
	backupDir := filepath.Join(".", "backups")
	srcFile := filepath.Join(backupDir, fileName)
	if _, err := os.Stat(srcFile); os.IsNotExist(err) {
		return fmt.Errorf("backup file not found")
	}
	if typ == "db" {
		user, pass, host, port, dbname, err := h.cfgDbConfig()
		if err != nil {
			return err
		}
		restoreCmd := fmt.Sprintf("gunzip -c %s | mysql -u%s -p%s -h%s -P%s %s",
			srcFile, user, pass, host, port, dbname)
		cmd := exec.Command("bash", "-c", restoreCmd)
		if out, e := cmd.CombinedOutput(); e != nil {
			return fmt.Errorf("restore failed: %s", string(out))
		}
		return nil
	}
	if typ == "uploads" {
		upDir := filepath.Join(".", "uploads")
		os.MkdirAll(upDir, 0755)
		cmd := exec.Command("bash", "-c", fmt.Sprintf("tar xzf %s -C %s", srcFile, upDir))
		if out, e := cmd.CombinedOutput(); e != nil {
			return fmt.Errorf("restore failed: %s", string(out))
		}
		return nil
	}
	return fmt.Errorf("invalid restore type, use 'db' or 'uploads'")
}
