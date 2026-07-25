package handler

import (
	"net/http"
	"strconv"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type OutletHandler struct {
	outletUsecase *usecase.OutletUsecase
}

func NewOutletHandler(outletUsecase *usecase.OutletUsecase) *OutletHandler {
	return &OutletHandler{outletUsecase: outletUsecase}
}

func (h *OutletHandler) GetOutlets(c *gin.Context) {
	outlets, err := h.outletUsecase.GetAll()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch outlets"})
		return
	}
	c.JSON(http.StatusOK, outlets)
}

func (h *OutletHandler) GetOutlet(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid outlet ID"})
		return
	}
	outlet, err := h.outletUsecase.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Outlet not found"})
		return
	}
	c.JSON(http.StatusOK, outlet)
}

func (h *OutletHandler) CreateOutlet(c *gin.Context) {
	var req struct {
		Name    string `json:"name" binding:"required"`
		Address string `json:"address"`
		Phone   string `json:"phone"`
		Code    string `json:"code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	outlet := &entity.Outlet{
		Name:    req.Name,
		Address: req.Address,
		Phone:   req.Phone,
		Code:    req.Code,
	}
	result, err := h.outletUsecase.Create(outlet)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create outlet"})
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *OutletHandler) UpdateOutlet(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid outlet ID"})
		return
	}
	var req struct {
		Name    string `json:"name"`
		Address string `json:"address"`
		Phone   string `json:"phone"`
		Code    string `json:"code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	outlet := &entity.Outlet{
		Name:    req.Name,
		Address: req.Address,
		Phone:   req.Phone,
		Code:    req.Code,
	}
	result, err := h.outletUsecase.Update(uint(id), outlet)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update outlet"})
		return
	}
	c.JSON(http.StatusOK, result)
}

func (h *OutletHandler) DeleteOutlet(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid outlet ID"})
		return
	}
	if err := h.outletUsecase.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete outlet"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Outlet deleted"})
}
