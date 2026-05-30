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

	c.JSON(http.StatusOK, settings)
}

func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	var req request.UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	if err := h.settingsUsecase.Update(entity.SettingMap(req)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated successfully"})
}

func (h *SettingsHandler) UploadLogo(c *gin.Context) {
	file, err := c.FormFile("logo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
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

func (h *SettingsHandler) UploadMobileApp(c *gin.Context) {
	file, err := c.FormFile("apk")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No APK file uploaded"})
		return
	}

	if file.Size > 200<<20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large (max 200MB)"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".apk" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only APK allowed"})
		return
	}

	savePath := filepath.Join("uploads/mobile", "singgah-pos-android.apk")
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save APK"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "APK uploaded successfully",
		"size":    file.Size,
	})
}

func (h *SettingsHandler) DownloadMobileApp(c *gin.Context) {
	apkPath := "./uploads/mobile/singgah-pos-android.apk"
	if _, err := http.Dir("./uploads/mobile").Open("singgah-pos-android.apk"); err == nil {
		c.File(apkPath)
		return
	}
	c.Redirect(http.StatusFound, "https://github.com/emoajib/SINGGAH-COFFE/releases/latest/download/singgah-pos-android.apk")
}
