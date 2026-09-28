package handler

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"

	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

// PublicOrderHandler handles public unauthenticated requests from smartphone customers
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type PublicOrderHandler struct {
	productUsecase *usecase.ProductUsecase
	orderUsecase   *usecase.OrderUsecase
}

func NewPublicOrderHandler(productUsecase *usecase.ProductUsecase, orderUsecase *usecase.OrderUsecase) *PublicOrderHandler {
	return &PublicOrderHandler{
		productUsecase: productUsecase,
		orderUsecase:   orderUsecase,
	}
}

// GetPublicMenu returns public-facing active menu items with ETag HTTP caching
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (h *PublicOrderHandler) GetPublicMenu(c *gin.Context) {
	menu, err := h.productUsecase.GetPublicMenu()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat katalog menu"})
		return
	}

	// Compute lightweight ETag based on product count and names
	rawHash := fmt.Sprintf("%d-%d", len(menu.Products), len(menu.Categories))
	hash := sha256.Sum256([]byte(rawHash))
	etag := `"` + hex.EncodeToString(hash[:8]) + `"`

	if match := c.GetHeader("If-None-Match"); match == etag {
		c.Status(http.StatusNotModified)
		return
	}

	c.Header("ETag", etag)
	c.Header("Cache-Control", "public, max-age=30") // Cache 30 detik di browser
	c.JSON(http.StatusOK, menu)
}

// CreatePublicOrder processes a new pending order submitted from customer smartphone
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (h *PublicOrderHandler) CreatePublicOrder(c *gin.Context) {
	var req request.PublicCreateOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format pesanan tidak valid: pastikan nama dan minimal 1 item terisi."})
		return
	}

	res, err := h.orderUsecase.CreatePublicSelfOrder(req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, res)
}

// GetPublicOrderStatus fetches order tracking status using secret tracking token (anti-IDOR)
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (h *PublicOrderHandler) GetPublicOrderStatus(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token pelacakan tidak valid"})
		return
	}

	res, err := h.orderUsecase.GetPublicOrderStatus(token)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pesanan tidak ditemukan atau telah kedaluwarsa"})
		return
	}

	c.JSON(http.StatusOK, res)
}
