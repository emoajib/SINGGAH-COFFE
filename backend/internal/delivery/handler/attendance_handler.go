package handler

import (
	"net/http"
	"strconv"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type AttendanceHandler struct{ usecase *usecase.AttendanceUsecase }

func NewAttendanceHandler(uc *usecase.AttendanceUsecase) *AttendanceHandler {
	return &AttendanceHandler{usecase: uc}
}

type attendanceRequest struct {
	ScheduleID      *uint  `json:"schedule_id"`
	ShiftInstanceID uint   `json:"shift_instance_id" binding:"required"`
	BaristaID       uint   `json:"barista_id" binding:"required"`
	BaristaName     string `json:"barista_name"`
	Status          string `json:"status" binding:"required"`
	Alasan          string `json:"alasan"`
}

func (h *AttendanceHandler) Record(c *gin.Context) {
	var req attendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	uid, _ := getUserID(c)
	a := &entity.Attendance{
		OutletID: getOutletID(c), ScheduleID: req.ScheduleID,
		ShiftInstanceID: req.ShiftInstanceID, BaristaID: req.BaristaID,
		BaristaName: req.BaristaName, Status: req.Status, Alasan: req.Alasan,
	}
	if err := h.usecase.Record(a, uid, getUserName(c)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, a)
}

func (h *AttendanceHandler) Approve(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	uid, _ := getUserID(c)
	if err := h.usecase.Approve(uint(id), getOutletID(c), uid, getUserName(c)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "kehadiran disahkan"})
}

func (h *AttendanceHandler) Reject(c *gin.Context) {
	id, _ := strconv.ParseUint(c.Param("id"), 10, 32)
	var body struct {
		Alasan string `json:"alasan" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	uid, _ := getUserID(c)
	if err := h.usecase.Reject(uint(id), getOutletID(c), uid, getUserName(c), body.Alasan); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "kehadiran ditolak"})
}

func (h *AttendanceHandler) ListPending(c *gin.Context) {
	list, err := h.usecase.ListPending(getOutletID(c))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, list)
}
