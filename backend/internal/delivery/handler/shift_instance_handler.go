package handler

import (
	"net/http"
	"strconv"

	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type ShiftInstanceHandler struct{ usecase *usecase.ShiftInstanceUsecase }

func NewShiftInstanceHandler(uc *usecase.ShiftInstanceUsecase) *ShiftInstanceHandler {
	return &ShiftInstanceHandler{usecase: uc}
}

func (h *ShiftInstanceHandler) Create(c *gin.Context) {
	var body struct {
		ShiftConfigID uint   `json:"shift_config_id" binding:"required"`
		Tanggal       string `json:"tanggal" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	uid, _ := getUserID(c)
	s, err := h.usecase.Create(getOutletID(c), body.ShiftConfigID, body.Tanggal, uid, getUserName(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, s)
}

func (h *ShiftInstanceHandler) GetByDate(c *gin.Context) {
	list, err := h.usecase.GetByDate(getOutletID(c), c.Query("tanggal"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *ShiftInstanceHandler) SetStatus(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var body struct {
		Status string `json:"status" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	uid, _ := getUserID(c)
	if err := h.usecase.SetStatus(uint(id), getOutletID(c), body.Status, uid, getUserName(c)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "status shift diperbarui"})
}

func (h *ShiftInstanceHandler) Close(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	uid, _ := getUserID(c)
	warnings, err := h.usecase.Close(uint(id), getOutletID(c),
		c.DefaultQuery("basis_type", "net"), 60, uid, getUserName(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "shift ditutup", "warnings": warnings})
}

func (h *ShiftInstanceHandler) GetTasks(c *gin.Context) {
	t, err := h.usecase.GetTasks(getOutletID(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, t)
}
