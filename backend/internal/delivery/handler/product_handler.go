package handler

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

type ProductHandler struct {
	productUsecase *usecase.ProductUsecase
}

func NewProductHandler(productUsecase *usecase.ProductUsecase) *ProductHandler {
	return &ProductHandler{productUsecase: productUsecase}
}

func (h *ProductHandler) GetProducts(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	products, err := h.productUsecase.GetAll(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch products"})
		return
	}

	role, _ := c.Get("user_role")
	if role != "owner" && role != "manager" {
		for i := range products {
			products[i].Cost = 0
			for j := range products[i].Recipe {
				products[i].Recipe[j].Ingredient.CostPerUnit = 0
			}
		}
	}

	c.JSON(http.StatusOK, products)
}

func (h *ProductHandler) CreateProduct(c *gin.Context) {
	var req request.CreateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	ucReq := usecase.CreateProductRequest{
		Name:        req.Name,
		Category:    req.Category,
		Price:       req.Price,
		Stock:       req.Stock,
		Sku:         req.Sku,
		Description: req.Description,
		ImageURL:    req.ImageURL,
	}
	for _, r := range req.Recipe {
		ucReq.Recipe = append(ucReq.Recipe, struct {
			IngredientID uint    `json:"ingredient_id"`
			Quantity     float64 `json:"quantity"`
		}{IngredientID: r.IngredientID, Quantity: r.Quantity})
	}

	result, err := h.productUsecase.Create(ucReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create product"})
		return
	}

	c.JSON(http.StatusCreated, result)
}

func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	var req request.UpdateProductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	ucReq := usecase.CreateProductRequest{
		Name:        req.Name,
		Category:    req.Category,
		Price:       req.Price,
		Stock:       req.Stock,
		Sku:         req.Sku,
		Description: req.Description,
		ImageURL:    req.ImageURL,
	}
	for _, r := range req.Recipe {
		ucReq.Recipe = append(ucReq.Recipe, struct {
			IngredientID uint    `json:"ingredient_id"`
			Quantity     float64 `json:"quantity"`
		}{IngredientID: r.IngredientID, Quantity: r.Quantity})
	}

	result, err := h.productUsecase.Update(uint(id), ucReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update product"})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	if err := h.productUsecase.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete product"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Product deleted successfully"})
}

var allowedImageTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

func (h *ProductHandler) UploadProductImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	if file.Size > 10<<20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File too large (max 10MB)"})
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
	if !allowedImageTypes[mimeType] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file type. Only JPEG, PNG, WebP allowed"})
		return
	}

	extension := filepath.Ext(file.Filename)
	ext := strings.ToLower(extension)
	allowedExts := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowedExts[ext] {
		ext = ".jpg"
	}

	newFilename := fmt.Sprintf("product_%d%s", time.Now().Unix(), ext)
	savePath := filepath.Join("uploads/products", newFilename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	url := fmt.Sprintf("/uploads/products/%s", newFilename)
	c.JSON(http.StatusOK, gin.H{
		"message": "Image uploaded successfully",
		"url":     url,
	})
}

// DownloadRecipeTemplate returns CSV template of products with recipes.
func (h *ProductHandler) DownloadRecipeTemplate(c *gin.Context) {
	products, err := h.productUsecase.GetRecipeTemplate()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load recipes"})
		return
	}
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=recipes-template.csv")
	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{"product_id", "product_name", "ingredient_id", "ingredient_name", "quantity", "unit"})
	for _, p := range products {
		if len(p.Recipe) == 0 {
			_ = w.Write([]string{strconv.Itoa(int(p.ID)), p.Name, "", "", "0", ""})
			continue
		}
		for _, r := range p.Recipe {
			_ = w.Write([]string{
				strconv.Itoa(int(p.ID)),
				p.Name,
				strconv.Itoa(int(r.IngredientID)),
				r.Ingredient.Name,
				fmt.Sprintf("%g", r.Quantity),
				r.Ingredient.Unit,
			})
		}
	}
	w.Flush()
}

// ImportRecipePreview parses uploaded CSV and validates.
func (h *ProductHandler) ImportRecipePreview(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required"})
		return
	}
	f, err := file.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot open file"})
		return
	}
	defer f.Close()
	reader := csv.NewReader(f)
	rows, err := reader.ReadAll()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid csv"})
		return
	}
	start := 0
	if len(rows) > 0 && rows[0][0] == "product_id" {
		start = 1
	}
	var parsed []usecase.RecipeImportRow
	for i := start; i < len(rows); i++ {
		if len(rows[i]) < 5 {
			continue
		}
		pid, _ := strconv.Atoi(rows[i][0])
		iid, _ := strconv.Atoi(rows[i][2])
		qty, _ := strconv.ParseFloat(rows[i][4], 64)
		parsed = append(parsed, usecase.RecipeImportRow{
			ProductID:      uint(pid),
			ProductName:    rows[i][1],
			IngredientID:   uint(iid),
			IngredientName: rows[i][3],
			Quantity:       qty,
			Unit:           rows[i][5],
		})
	}
	preview, err := h.productUsecase.PreviewRecipeImport(parsed)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to validate"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"preview": preview})
}

// ImportRecipeConfirm saves validated recipes.
func (h *ProductHandler) ImportRecipeConfirm(c *gin.Context) {
	var req struct {
		Rows []usecase.RecipeImportRow `json:"rows"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}
	if err := h.productUsecase.ConfirmRecipeImport(req.Rows); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save recipes"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Imported"})
}
