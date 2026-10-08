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
		var reqPeople []profitSharingPersonRequest
		if err := json.Unmarshal([]byte(peopleJSON), &reqPeople); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "format people tidak valid"})
			return
		}
		people = make([]entity.ProfitSharingPerson, len(reqPeople))
		for i, p := range reqPeople {
			people[i] = p.toEntity()
		}
	}

	preview, err := h.usecase.Preview(start, end, outletID, ratio, basisType, ownerPct, people)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, preview)
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
// profitSharingPersonRequest is the request representation of a person (excludes Cashbons which causes JSON parse issues).
type profitSharingPersonRequest struct {
	ID                uint     `json:"id"`
	PeriodID          uint     `json:"period_id"`
	Name              string   `json:"name"`
	Role              string   `json:"role"`
	SharePct          float64  `json:"share_pct"`
	GrossAmount       float64  `json:"gross_amount"`
	LeaveReduction    float64  `json:"leave_reduction"`
	CashbonReduction  float64  `json:"cashbon_reduction"`
	Amount            float64  `json:"amount"`
	IsOnLeave         bool     `json:"is_on_leave"`
	LeaveDays         int      `json:"leave_days"`
	LeaveDates        string   `json:"leave_dates"`
	RemainingBalance  float64  `json:"remaining_balance"`
	Attendance        string   `json:"attendance,omitempty"`
	ShiftIDs          []uint   `json:"shift_ids,omitempty"`
	ShiftNames        []string `json:"shift_names,omitempty"`
	ShiftPoolPcts     []float64 `json:"shift_pool_pcts,omitempty"`
}

// toEntity converts request to domain entity.
func (r *profitSharingPersonRequest) toEntity() entity.ProfitSharingPerson {
	return entity.ProfitSharingPerson{
		ID:                r.ID,
		PeriodID:          r.PeriodID,
		Name:              r.Name,
		Role:              r.Role,
		SharePct:          r.SharePct,
		GrossAmount:       r.GrossAmount,
		LeaveReduction:    r.LeaveReduction,
		CashbonReduction:  r.CashbonReduction,
		Amount:            r.Amount,
		IsOnLeave:         r.IsOnLeave,
		LeaveDays:         r.LeaveDays,
		LeaveDates:        r.LeaveDates,
		RemainingBalance:  r.RemainingBalance,
		Attendance:        r.Attendance,
		ShiftIDs:          r.ShiftIDs,
		ShiftNames:        r.ShiftNames,
		ShiftPoolPcts:     r.ShiftPoolPcts,
	}
}

// saveDraftRequest is the request body for POST /profit-sharing/draft.
type saveDraftRequest struct {
	Start     string                       `json:"start" binding:"required"`
	End       string                       `json:"end" binding:"required"`
	Ratio     float64                      `json:"ratio"`
	BasisType string                       `json:"basis_type"`
	OwnerPct  float64                      `json:"owner_pct"`
	People    []profitSharingPersonRequest `json:"people"`
}

// SaveDraft explicitly persists a profit sharing draft (idempotent, tanpa
// harus finalize). Draft tidak pernah menyentuh Buku Kas / Jurnal PSAK.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (h *ProfitSharingHandler) SaveDraft(c *gin.Context) {
	var req saveDraftRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data tidak valid: " + err.Error()})
		return
	}
	if req.Ratio < 0 || req.Ratio > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ratio harus antara 0 sampai 100"})
		return
	}
	if req.OwnerPct < 0 || req.OwnerPct > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "owner_pct harus antara 0 sampai 100"})
		return
	}
	outletID := getOutletID(c)

	// Convert request people to entity people
	people := make([]entity.ProfitSharingPerson, len(req.People))
	for i, p := range req.People {
		people[i] = p.toEntity()
	}

	period, err := h.usecase.SaveDraft(req.Start, req.End, outletID, req.Ratio, req.BasisType, req.OwnerPct, people)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "draft berhasil disimpan",
		"period":  period,
	})
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

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type setLeaveRequest struct {
	PersonID   uint    `json:"person_id" binding:"required"`
	IsOnLeave  bool    `json:"is_on_leave"`
	LeaveDays  int     `json:"leave_days"`
	LeaveDates string  `json:"leave_dates"`
	Reduction  float64 `json:"reduction"`
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type setAttendanceRequest struct {
	PersonID    uint   `json:"person_id" binding:"required"`
	Attendance  string `json:"attendance" binding:"required"` // JSON: map[date][]shiftID
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

	if err := h.usecase.SetLeave(uint(id), req.PersonID, req.IsOnLeave, req.LeaveDays, req.LeaveDates, req.Reduction); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "status cuti berhasil diupdate"})
}

// SetAttendance updates a barista's per-date per-shift attendance.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (h *ProfitSharingHandler) SetAttendance(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period ID"})
		return
	}

	var req setAttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data tidak valid"})
		return
	}

	if err := h.usecase.SetAttendance(uint(id), req.PersonID, req.Attendance); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "kehadiran berhasil diupdate"})
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
