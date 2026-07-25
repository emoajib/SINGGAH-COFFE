package usecase

import (
	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type ProductUsecase struct {
	productRepo    repository.ProductRepository
	ingredientRepo repository.IngredientRepository
}

func NewProductUsecase(db *gorm.DB) *ProductUsecase {
	return &ProductUsecase{
		productRepo:    postgres.NewProductRepository(db),
		ingredientRepo: postgres.NewIngredientRepository(db),
	}
}

type CreateProductRequest struct {
	Name        string  `json:"name"`
	Category    string  `json:"category"`
	Price       float64 `json:"price"`
	Stock       int     `json:"stock"`
	Sku         string  `json:"sku"`
	Description string  `json:"description"`
	ImageURL    string  `json:"image_url"`
	Recipe      []struct {
		IngredientID uint    `json:"ingredient_id"`
		Quantity     float64 `json:"quantity"`
	} `json:"recipe"`
}

func (uc *ProductUsecase) GetAll(limit, offset int) ([]entity.ProductResponse, error) {
	products, err := uc.productRepo.FindAll(limit, offset)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.ProductResponse, len(products))
	for i, p := range products {
		resp[i] = p.ToResponse()
	}
	return resp, nil
}

func (uc *ProductUsecase) GetByID(id uint) (*entity.ProductResponse, error) {
	product, err := uc.productRepo.FindByIDWithRecipe(id)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("product")
	}
	resp := product.ToResponse()
	return &resp, nil
}

func (uc *ProductUsecase) Create(req CreateProductRequest) (*entity.ProductResponse, error) {
	var totalCost float64
	recipeItems := make([]entity.RecipeItem, 0, len(req.Recipe))

	for _, item := range req.Recipe {
		ingredient, err := uc.ingredientRepo.FindByID(item.IngredientID)
		if err != nil {
			continue
		}
		cost := item.Quantity * ingredient.CostPerUnit
		totalCost += cost
		recipeItems = append(recipeItems, entity.RecipeItem{
			IngredientID: item.IngredientID,
			Quantity:     item.Quantity,
		})
	}

	product := &entity.Product{
		Name:        req.Name,
		Category:    req.Category,
		Price:       req.Price,
		Cost:        totalCost,
		Stock:       req.Stock,
		Sku:         req.Sku,
		Description: req.Description,
		ImageURL:    req.ImageURL,
	}

	if err := uc.productRepo.Create(product); err != nil {
		return nil, err
	}

	if len(recipeItems) > 0 {
		for i := range recipeItems {
			recipeItems[i].ProductID = product.ID
		}
		if err := uc.productRepo.CreateRecipeItems(recipeItems); err != nil {
			return nil, err
		}
	}

	created, err := uc.productRepo.FindByIDWithRecipe(product.ID)
	if err != nil {
		return nil, err
	}
	resp := created.ToResponse()
	return &resp, nil
}

func (uc *ProductUsecase) Update(id uint, req CreateProductRequest) (*entity.ProductResponse, error) {
	existing, err := uc.productRepo.FindByID(id)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("product")
	}

	var totalCost float64
	recipeItems := make([]entity.RecipeItem, 0, len(req.Recipe))

	for _, item := range req.Recipe {
		ingredient, err := uc.ingredientRepo.FindByID(item.IngredientID)
		if err != nil {
			continue
		}
		cost := item.Quantity * ingredient.CostPerUnit
		totalCost += cost
		recipeItems = append(recipeItems, entity.RecipeItem{
			ProductID:    existing.ID,
			IngredientID: item.IngredientID,
			Quantity:     item.Quantity,
		})
	}

	existing.Name = req.Name
	existing.Category = req.Category
	existing.Price = req.Price
	existing.Cost = totalCost
	existing.Stock = req.Stock
	existing.Sku = req.Sku
	existing.Description = req.Description
	existing.ImageURL = req.ImageURL

	if err := uc.productRepo.DeleteRecipeByProductID(id); err != nil {
		return nil, err
	}

	if err := uc.productRepo.Update(existing); err != nil {
		return nil, err
	}

	if len(recipeItems) > 0 {
		if err := uc.productRepo.CreateRecipeItems(recipeItems); err != nil {
			return nil, err
		}
	}

	updated, err := uc.productRepo.FindByIDWithRecipe(id)
	if err != nil {
		return nil, err
	}
	resp := updated.ToResponse()
	return &resp, nil
}

func (uc *ProductUsecase) Delete(id uint) error {
	return uc.productRepo.Delete(id)
}
