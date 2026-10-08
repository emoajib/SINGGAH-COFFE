package handler

import (
	"net/http"
	"strconv"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type ScheduleHandler struct{ usecase *usecase.ScheduleUsecase }

func NewScheduleHandler(uc *usecase.ScheduleUsecase) *ScheduleHandler {
	return &ScheduleHandler{usecase: uc}
}

type scheduleRequest struct {
	BaristaID     uint   `json:"barista_id" binding:"required"`
	Tanggal       string `json:"tanggal" binding:"required"`
	ShiftConfigID uint   `json:"shift_config_id" binding:"required"`
	Status        string `json:"status"`
	JamKerja      string `json:"jam_kerja"`
	Catatan       string `json:"catatan"`
}

func (h *ScheduleHandler) Create(c *gin.Context) {
	var req scheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	tgl, err := time.Parse("2006-01-02", req.Tanggal)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "format tanggal harus YYYY-MM-DD"})
		return
	}
	uid, _ := getUserID(c)
	s := &entity.Schedule{
		OutletID: getOutletID(c), BaristaID: req.BaristaID, Tanggal: tgl,
		ShiftConfigID: req.ShiftConfigID, Status: req.Status,
		JamKerja: req.JamKerja, Catatan: req.Catatan, DibuatOleh: uid,
	}
	if err := h.usecase.Create(s, uid, getUserName(c)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, s)
}

func (h *ScheduleHandler) GetByDate(c *gin.Context) {
	list, err := h.usecase.GetByDate(c.Query("tanggal"), getOutletID(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}

func (h *ScheduleHandler) Delete(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	uid, _ := getUserID(c)
	if err := h.usecase.Delete(uint(id), getOutletID(c), uid, getUserName(c)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "jadwal dihapus"})
}

func (h *ScheduleHandler) CopyWeek(c *gin.Context) {
	uid, _ := getUserID(c)
	disalin, dilewati, err := h.usecase.CopyWeek(getOutletID(c), c.Query("dari"), c.Query("ke"), uid, getUserName(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"disalin": disalin, "dilewati": dilewati})
}
