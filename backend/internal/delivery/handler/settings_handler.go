package handler

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"
	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type SettingsHandler struct {
	settingsUsecase *usecase.SettingsUsecase
}

func NewSettingsHandler(settingsUsecase *usecase.SettingsUsecase) *SettingsHandler {
	return &SettingsHandler{settingsUsecase: settingsUsecase}
}

func (h *SettingsHandler) GetSettings(c *gin.Context) {
	group := c.Query("group")
	settings, err := h.settingsUsecase.GetAll(group)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}

	role, _ := c.Get("user_role")
	roleStr, ok := role.(string)
	if !ok || roleStr == "" {
		roleStr = "cashier"
	}

	c.JSON(http.StatusOK, filterSettingsByRole(roleStr, settings))
}

var cashierAllowedSettings = map[string]bool{
	"outlet_name":         true,
	"outlet_phone":        true,
	"outlet_address":      true,
	"outlet_description":  true,
	"outlet_logo_url":     true,
	"tax_percentage":      true,
	"service_charge":      true,
	"printer_connection":  true,
	"printer_ip":          true,
	"printer_bluetooth_address": true,
	"printer_width":       true,
	"auto_print":          true,
	"enable_stock_alerts": true,
}

func filterSettingsByRole(role string, settings []entity.Setting) []entity.Setting {
	out := make([]entity.Setting, 0, len(settings))
	for _, s := range settings {
		switch role {
		case "owner":
			out = append(out, s)
		case "manager":
			if strings.HasPrefix(s.Key, "xendit_") {
				continue
			}
			out = append(out, s)
		default:
			if cashierAllowedSettings[s.Key] {
				out = append(out, s)
			}
		}
	}
	return out
}

func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	var req request.UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if err := h.settingsUsecase.Update(entity.SettingMap{req.Key: req.Value}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated successfully"})
}

func (h *SettingsHandler) UploadLogo(c *gin.Context) {
	file, err := c.FormFile("logo")
	if err != nil {
		ct := c.GetHeader("Content-Type")
		cl := c.GetHeader("Content-Length")
		fmt.Printf("[upload-logo] err=%v | Content-Type=%q | Content-Length=%s\n", err, ct, cl)
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("No file uploaded: %v", err)})
		return
	}

	if file.Size > 2<<20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large (max 2MB)"})
		return
	}

	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}
	defer f.Close()

	buf := make([]byte, 512)
	if _, err := f.Read(buf); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	mimeType := http.DetectContentType(buf)
	allowedLogoTypes := map[string]bool{"image/jpeg": true, "image/png": true, "image/webp": true}
	if !allowedLogoTypes[mimeType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only JPEG, PNG, WebP allowed"})
		return
	}

	extension := filepath.Ext(file.Filename)
	ext := strings.ToLower(extension)
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowedExts[ext] {
		ext = ".png"
	}

	newFilename := fmt.Sprintf("logo_%d%s", time.Now().Unix(), ext)
	savePath := filepath.Join("uploads/logo", newFilename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	url := fmt.Sprintf("/uploads/logo/%s", newFilename)
	c.JSON(http.StatusOK, gin.H{
		"message": "Logo uploaded successfully",
		"url":     url,
	})
}

