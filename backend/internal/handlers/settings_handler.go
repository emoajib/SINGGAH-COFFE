package handlers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"singgah-pos-backend/internal/models"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SettingsHandler struct {
	DB *gorm.DB
}

func NewSettingsHandler(db *gorm.DB) *SettingsHandler {
	return &SettingsHandler{DB: db}
}

func (h *SettingsHandler) GetSettings(c *gin.Context) {
	var settings []models.Setting
	group := c.Query("group")

	query := h.DB
	if group != "" {
		query = query.Where("setting_group = ?", group)
	}

	if err := query.Find(&settings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}

	// Transform to map for easier frontend consumption
	settingsMap := make(map[string]string)
	for _, s := range settings {
		settingsMap[s.Key] = s.Value
	}

	c.JSON(http.StatusOK, settingsMap)
}

func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	var body map[string]string
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	for key, value := range body {
		var setting models.Setting
		result := h.DB.Where("key = ?", key).First(&setting)

		if result.Error == gorm.ErrRecordNotFound {
			// Create new if not exists
			newSetting := models.Setting{
				Key:          key,
				Value:        value,
				SettingGroup: "general", // Default group if not specified
			}
			h.DB.Create(&newSetting)
		} else if result.Error == nil {
			// Update existing
			setting.Value = value
			h.DB.Save(&setting)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settings updated successfully"})
}

func (h *SettingsHandler) UploadLogo(c *gin.Context) {
	file, err := c.FormFile("logo")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	// Create a unique filename
	extension := filepath.Ext(file.Filename)
	newFilename := fmt.Sprintf("logo_%d%s", time.Now().Unix(), extension)
	savePath := filepath.Join("uploads/logo", newFilename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	// Return the accessible URL
	url := fmt.Sprintf("/uploads/logo/%s", newFilename)
	c.JSON(http.StatusOK, gin.H{
		"message": "Logo uploaded successfully",
		"url":     url,
	})
}
