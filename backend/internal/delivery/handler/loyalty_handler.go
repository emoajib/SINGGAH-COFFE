// Vetted by AI - Manual Review Required by Senior Engineer/Manager
package handler

import (
	"net/http"
	"strconv"
	"strings"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type LoyaltyHandler struct {
	loyaltyUsecase *usecase.LoyaltyUsecase
}

func NewLoyaltyHandler(loyaltyUsecase *usecase.LoyaltyUsecase) *LoyaltyHandler {
	return &LoyaltyHandler{loyaltyUsecase: loyaltyUsecase}
}

// ================= PUBLIC ENDPOINTS (QR SCAN PELANGGAN) =================

// GetPublicLoyaltyCard mengembalikan data stempel & program untuk halaman QR publik
func (h *LoyaltyHandler) GetPublicLoyaltyCard(c *gin.Context) {
	token := c.Param("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token loyalitas tidak valid"})
		return
	}

	card, err := h.loyaltyUsecase.GetPublicLoyaltyCard(token)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, card)
}

// SubmitFeedback menangani kiriman kritik dan saran dari formulir QR
func (h *LoyaltyHandler) SubmitFeedback(c *gin.Context) {
	token := c.Param("token")
	var req struct {
		Rating   int    `json:"rating" binding:"required"`
		Category string `json:"category"`
		Message  string `json:"message" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Rating dan pesan saran wajib diisi"})
		return
	}

	fb, err := h.loyaltyUsecase.SubmitFeedback(token, req.Rating, req.Category, req.Message)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Terima kasih atas saran dan masukan Anda!", "feedback": fb})
}

// RegisterOrFindCustomer menangani pencarian atau registrasi kartu pelanggan mandiri dari scan meja
func (h *LoyaltyHandler) RegisterOrFindCustomer(c *gin.Context) {
	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	var req struct {
		Phone    string `json:"phone" binding:"required"`
		Name     string `json:"name"`
		OutletID uint   `json:"outlet_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nomor WhatsApp/HP pelanggan wajib diisi"})
		return
	}

	cleanPhone := usecase.CleanPhoneNumber(req.Phone)
	if len(cleanPhone) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Nomor WhatsApp/HP tidak valid (minimal 8 digit angka)"})
		return
	}

	if req.OutletID == 0 {
		req.OutletID = 1
	}

	cust, err := h.loyaltyUsecase.FindOrCreateCustomer(cleanPhone, strings.TrimSpace(req.Name), req.OutletID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses kartu pelanggan: " + err.Error()})
		return
	}

	// Ambil data kartu loyalitas publik untuk token ini
	card, err := h.loyaltyUsecase.GetPublicLoyaltyCard(cust.LoyaltyToken)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"token":    cust.LoyaltyToken,
			"customer": cust,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": cust.LoyaltyToken,
		"card":  card,
	})
}

// ================= PROTECTED ENDPOINTS (KASIR & OWNER) =================

// GetCustomers mengembalikan daftar pelanggan untuk kasir/owner
func (h *LoyaltyHandler) GetCustomers(c *gin.Context) {
	outletID := getOutletID(c)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	customers, err := h.loyaltyUsecase.GetCustomers(limit, offset, outletID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data pelanggan"})
		return
	}

	c.JSON(http.StatusOK, customers)
}

// GetPrograms mengembalikan program loyalitas yang ada di outlet
func (h *LoyaltyHandler) GetPrograms(c *gin.Context) {
	outletID := getOutletID(c)
	programs, err := h.loyaltyUsecase.GetPrograms(outletID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil program loyalitas"})
		return
	}
	c.JSON(http.StatusOK, programs)
}

// CreateProgram membuat program loyalitas baru (owner only)
func (h *LoyaltyHandler) CreateProgram(c *gin.Context) {
	outletID := getOutletID(c)
	var p entity.LoyaltyProgram
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data program tidak valid: " + err.Error()})
		return
	}
	p.OutletID = outletID
	if err := h.loyaltyUsecase.CreateProgram(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, p)
}

// UpdateProgram memperbarui program loyalitas (owner only)
func (h *LoyaltyHandler) UpdateProgram(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID program tidak valid"})
		return
	}

	var p entity.LoyaltyProgram
	if err := c.ShouldBindJSON(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data program tidak valid: " + err.Error()})
		return
	}
	p.ID = uint(id)
	if err := h.loyaltyUsecase.UpdateProgram(&p); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, p)
}

// RedeemReward menukarkan stempel dengan reward (kasir / owner)
func (h *LoyaltyHandler) RedeemReward(c *gin.Context) {
	outletID := getOutletID(c)
	userID, _ := getUserID(c)

	var req struct {
		CustomerID   uint    `json:"customer_id" binding:"required"`
		ProgramID    uint    `json:"program_id" binding:"required"`
		RewardDetail string  `json:"reward_detail" binding:"required"`
		RewardCost   float64 `json:"reward_cost"`
		Notes        string  `json:"notes"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data penukaran reward tidak valid: " + err.Error()})
		return
	}

	red, err := h.loyaltyUsecase.RedeemReward(req.CustomerID, req.ProgramID, userID, req.RewardDetail, req.RewardCost, req.Notes, outletID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Reward berhasil ditukar!", "redemption": red})
}

// GetFeedbacks mengembalikan daftar feedback untuk dibaca owner/manager
func (h *LoyaltyHandler) GetFeedbacks(c *gin.Context) {
	outletID := getOutletID(c)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	status := c.Query("status")

	fbs, err := h.loyaltyUsecase.GetFeedbacks(limit, offset, status, outletID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar feedback"})
		return
	}
	c.JSON(http.StatusOK, fbs)
}

// ReplyFeedback membalas saran pelanggan (owner/manager)
func (h *LoyaltyHandler) ReplyFeedback(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID feedback tidak valid"})
		return
	}

	userID, _ := getUserID(c)
	var req struct {
		Reply string `json:"reply" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Balasan tidak boleh kosong"})
		return
	}

	if err := h.loyaltyUsecase.ReplyFeedback(uint(id), req.Reply, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Balasan berhasil dikirim ke pelanggan"})
}
