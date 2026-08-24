package handler

import (
	"fmt"
	"image"
	"image/color"
	_ "image/gif"
	_ "image/jpeg"
	"image/png"
	_ "golang.org/x/image/webp"
	"golang.org/x/image/draw"
	"math"
	"net/http"
	"os"
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

	// Generate the Android PWA install icon (512x512 opaque, letterboxed)
	// from the uploaded logo so the home-screen icon matches the owner's brand.
	if err := generatePWAIconFile(savePath, "uploads/logo/pwa-icon.png"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process logo"})
		return
	}

	// Persist atomically so in-app logo + PWA icon stay synchronised in one action.
	if err := h.settingsUsecase.Update(entity.SettingMap{"outlet_logo_url": url}); err != nil {
		fmt.Printf("[upload-logo] failed to persist outlet_logo_url: %v\n", err)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Logo uploaded successfully",
		"url":     url,
	})
}

// pwaIconSize is the required PWA icon dimension (Android maskable).
const pwaIconSize = 512

// generatePWAIconFile decodes an uploaded image (JPEG/PNG/GIF/WebP) and writes a
// 512x512 opaque, letterboxed PNG suitable for the PWA manifest. Decode errors
// surface as a non-nil error so the caller can return 400 instead of 500.
func generatePWAIconFile(srcPath, destPath string) error {
	f, err := os.Open(srcPath)
	if err != nil {
		return err
	}
	defer f.Close()

	srcImg, _, err := image.Decode(f)
	if err != nil {
		return err
	}

	b := srcImg.Bounds()
	w, h := b.Dx(), b.Dy()
	if w == 0 || h == 0 {
		return fmt.Errorf("empty image")
	}

	// Bound memory under shared hosting: downscale very large sources first.
	const maxEdge = 1024
	scale := 1.0
	if maxDim := math.Max(float64(w), float64(h)); maxDim > maxEdge {
		scale = float64(maxEdge) / maxDim
	}
	tmpW, tmpH := int(float64(w)*scale), int(float64(h)*scale)
	tmp := image.NewRGBA(image.Rect(0, 0, tmpW, tmpH))
	draw.CatmullRom.Scale(tmp, tmp.Bounds(), srcImg, b, draw.Src, nil)

	// Opaque brand-coloured canvas (required for maskable purpose).
	canvas := image.NewRGBA(image.Rect(0, 0, pwaIconSize, pwaIconSize))
	bg := color.RGBA{0x4B, 0x36, 0x21, 0xFF}
	draw.Draw(canvas, canvas.Bounds(), &image.Uniform{bg}, image.Point{}, draw.Src)

	// Contain into the 80% safe-zone so nothing is cropped (wide logos stay whole).
	safe := pwaIconSize * 8 / 10
	fit := math.Min(float64(safe)/float64(tmpW), float64(safe)/float64(tmpH))
	fw, fh := int(float64(tmpW)*fit), int(float64(tmpH)*fit)
	offX, offY := (pwaIconSize-fw)/2, (pwaIconSize-fh)/2
	dstRect := image.Rect(offX, offY, offX+fw, offY+fh)
	draw.CatmullRom.Scale(canvas, dstRect, tmp, tmp.Bounds(), draw.Over, nil)

	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()
	return png.Encode(out, canvas)
}

// EnsureDefaultPWAIcon seeds a placeholder PWA icon on startup so the manifest
// never 404s before the owner uploads a real logo.
func EnsureDefaultPWAIcon(path string) {
	if _, err := os.Stat(path); err == nil {
		return
	}
	bg := image.NewRGBA(image.Rect(0, 0, pwaIconSize, pwaIconSize))
	draw.Draw(bg, bg.Bounds(), &image.Uniform{color.RGBA{0x4B, 0x36, 0x21, 0xFF}}, image.Point{}, draw.Src)
	inner := image.Rect(96, 96, pwaIconSize-96, pwaIconSize-96)
	draw.Draw(bg, inner, &image.Uniform{color.RGBA{0x6B, 0x4A, 0x2E, 0xFF}}, image.Point{}, draw.Src)
	_ = generatePWAIconFileFromImage(bg, path)
}

func generatePWAIconFileFromImage(src image.Image, destPath string) error {
	canvas := image.NewRGBA(image.Rect(0, 0, pwaIconSize, pwaIconSize))
	bg := color.RGBA{0x4B, 0x36, 0x21, 0xFF}
	draw.Draw(canvas, canvas.Bounds(), &image.Uniform{bg}, image.Point{}, draw.Src)
	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	safe := pwaIconSize * 8 / 10
	fit := math.Min(float64(safe)/float64(w), float64(safe)/float64(h))
	fw, fh := int(float64(w)*fit), int(float64(h)*fit)
	offX, offY := (pwaIconSize-fw)/2, (pwaIconSize-fh)/2
	dstRect := image.Rect(offX, offY, offX+fw, offY+fh)
	draw.CatmullRom.Scale(canvas, dstRect, src, b, draw.Over, nil)
	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()
	return png.Encode(out, canvas)
}

