package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type ProfitSharingHandler struct {
	usecase *usecase.ProfitSharingUsecase
}

func NewProfitSharingHandler(uc *usecase.ProfitSharingUsecase) *ProfitSharingHandler {
	return &ProfitSharingHandler{usecase: uc}
}

func (h *ProfitSharingHandler) Preview(c *gin.Context) {
	start := c.Query("start")
	end := c.Query("end")
	outletID := getOutletID(c)
	ratioStr := c.DefaultQuery("ratio", "50")
	ratio, err := strconv.ParseFloat(ratioStr, 64)
	if err != nil || ratio < 0 || ratio > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ratio harus antara 0 sampai 100"})
		return
	}

	basisType := c.DefaultQuery("basis_type", "net")

	ownerPctStr := c.DefaultQuery("owner_pct", "60")
	ownerPct, err := strconv.ParseFloat(ownerPctStr, 64)
	if err != nil || ownerPct < 0 || ownerPct > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "owner_pct harus antara 0 sampai 100"})
		return
	}

	var people []entity.ProfitSharingPerson
	peopleJSON := c.Query("people")
	if peopleJSON != "" {
		if err := json.Unmarshal([]byte(peopleJSON), &people); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "format people tidak valid"})
			return
		}
	}

	preview, err := h.usecase.Preview(start, end, outletID, ratio, basisType, ownerPct, people)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, preview)
}

func (h *ProfitSharingHandler) Finalize(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID"})
		return
	}
	outletID := getOutletID(c)
	ratioStr := c.DefaultQuery("ratio", "50")
	ratio, err := strconv.ParseFloat(ratioStr, 64)
	if err != nil || ratio < 0 || ratio > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ratio harus antara 0 sampai 100"})
		return
	}

	if err := h.usecase.Finalize(uint(id), ratio, outletID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "periode berhasil di-finalize"})
}

func (h *ProfitSharingHandler) MarkAsPaid(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID"})
		return
	}
	outletID := getOutletID(c)

	if err := h.usecase.MarkAsPaid(uint(id), outletID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "periode berhasil ditandai sebagai dibayar"})
}

func (h *ProfitSharingHandler) Recalculate(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID"})
		return
	}
	outletID := getOutletID(c)
	ratioStr := c.DefaultQuery("ratio", "50")
	ratio, err := strconv.ParseFloat(ratioStr, 64)
	if err != nil || ratio < 0 || ratio > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ratio harus antara 0 sampai 100"})
		return
	}

	if err := h.usecase.Recalculate(uint(id), ratio, outletID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "periode berhasil dihitung ulang"})
}

func (h *ProfitSharingHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID"})
		return
	}
	outletID := getOutletID(c)

	if err := h.usecase.Delete(uint(id), outletID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "periode berhasil dihapus"})
}

func (h *ProfitSharingHandler) GetAll(c *gin.Context) {
	outletID := getOutletID(c)
	periods, err := h.usecase.GetAll(outletID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, periods)
}

func (h *ProfitSharingHandler) GetPeople(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID"})
		return
	}
	people, err := h.usecase.GetPeople(uint(id))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, people)
}

type setLeaveRequest struct {
	PersonID   uint    `json:"person_id" binding:"required"`
	IsOnLeave  bool    `json:"is_on_leave"`
	Reduction  float64 `json:"reduction"`
}

func (h *ProfitSharingHandler) SetLeave(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID"})
		return
	}

	var req setLeaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data tidak valid"})
		return
	}

	if err := h.usecase.SetLeave(uint(id), req.PersonID, req.IsOnLeave, req.Reduction); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "status cuti berhasil diupdate"})
}

type addPersonRequest struct {
	Name     string  `json:"name" binding:"required"`
	Role     string  `json:"role" binding:"required"`
	SharePct float64 `json:"share_pct" binding:"required"`
}

func (h *ProfitSharingHandler) AddPerson(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID"})
		return
	}

	var req addPersonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data tidak valid"})
		return
	}

	person := entity.ProfitSharingPerson{
		Name:     req.Name,
		Role:     req.Role,
		SharePct: req.SharePct,
	}

	if err := h.usecase.AddPerson(uint(id), person); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "orang berhasil ditambahkan"})
}

func (h *ProfitSharingHandler) RemovePerson(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID"})
		return
	}
	personID, err := strconv.ParseUint(c.Param("personId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid person ID"})
		return
	}

	if err := h.usecase.RemovePerson(uint(id), uint(personID)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "orang berhasil dihapus"})
}
