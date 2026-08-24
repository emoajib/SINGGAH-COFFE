package usecase

import (
	"strconv"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type OrderUsecase struct {
	db             *gorm.DB
	orderRepo      repository.OrderRepository
	orderItemRepo  repository.OrderItemRepository
	productRepo    repository.ProductRepository
	ingredientRepo repository.IngredientRepository
	mutationRepo   repository.StockMutationRepository
	settingRepo    repository.SettingRepository
}

func NewOrderUsecase(db *gorm.DB) *OrderUsecase {
	return &OrderUsecase{
		db:             db,
		orderRepo:      postgres.NewOrderRepository(db),
		orderItemRepo:  postgres.NewOrderItemRepository(db),
		productRepo:    postgres.NewProductRepository(db),
		ingredientRepo: postgres.NewIngredientRepository(db),
		mutationRepo:   postgres.NewStockMutationRepository(db),
		settingRepo:    postgres.NewSettingRepository(db),
	}
}

type CreateOrderRequest struct {
	OrderNumber   string `json:"order_number"`
	PaymentMethod string `json:"payment_method"`
	CashierName   string `json:"cashier_name"`
	CustomerEmail string `json:"customer_email"`
	Items         []struct {
		ProductID uint `json:"product_id"`
		Quantity  int  `json:"quantity"`
	} `json:"items"`
}

type CreateOrderResponse struct {
	Order      entity.OrderResponse `json:"order"`
	InvoiceURL string               `json:"invoice_url"`
}

func (uc *OrderUsecase) GetAll(limit, offset int, outletID ...uint) ([]entity.OrderResponse, error) {
	orders, err := uc.orderRepo.FindAll(limit, offset, outletID...)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.OrderResponse, len(orders))
	for i, o := range orders {
		resp[i] = o.ToResponse()
	}
	return resp, nil
}

func (uc *OrderUsecase) GetByID(id uint) (*entity.OrderResponse, error) {
	order, err := uc.orderRepo.FindByIDWithItems(id)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("order")
	}
	resp := order.ToResponse()
	return &resp, nil
}

func (uc *OrderUsecase) Create(req CreateOrderRequest, userID uint, cashierName string, outletID ...uint) (*CreateOrderResponse, error) {
	var result CreateOrderResponse

	err := uc.db.Transaction(func(tx *gorm.DB) error {
		orderRepo := postgres.NewOrderRepository(tx)
		orderItemRepo := postgres.NewOrderItemRepository(tx)
		productRepo := postgres.NewProductRepository(tx)
		ingredientRepo := postgres.NewIngredientRepository(tx)
		mutationRepo := postgres.NewStockMutationRepository(tx)
		settingRepo := postgres.NewSettingRepository(tx)

		var totalAmount float64
		var orderItems []entity.OrderItem

		oid := uint(0)
		if len(outletID) > 0 {
			oid = outletID[0]
		}

		for _, itemInput := range req.Items {
			product, err := productRepo.FindByIDWithRecipeForUpdate(itemInput.ProductID)
			if err != nil {
				return err
			}

			// Validate stock availability
			if len(product.Recipe) > 0 {
				for _, recipeItem := range product.Recipe {
					needed := recipeItem.Quantity * float64(itemInput.Quantity)
					ingredient, err := ingredientRepo.FindByIDForUpdate(recipeItem.IngredientID)
					if err != nil {
						return err
					}
					if ingredient.CurrentStock < needed {
						return domainErrors.NewInsufficientStockError(ingredient.Name)
					}
				}
			} else {
				if float64(product.Stock) < float64(itemInput.Quantity) {
					return domainErrors.NewInsufficientStockError(product.Name)
				}
			}

			itemTotal := product.Price * float64(itemInput.Quantity)
			totalAmount += itemTotal

			orderItems = append(orderItems, entity.OrderItem{
				ProductID: product.ID,
				Quantity:  itemInput.Quantity,
				Price:     product.Price,
				Cost:      product.Cost,
			})

			// Deduct stock
			if len(product.Recipe) > 0 {
				for _, recipeItem := range product.Recipe {
					deductionAmount := recipeItem.Quantity * float64(itemInput.Quantity)
					if err := ingredientRepo.UpdateStockAtomic(recipeItem.IngredientID, deductionAmount, "sub"); err != nil {
						return err
					}
				mutationRepo.Create(&entity.StockMutation{
					IngredientID: recipeItem.IngredientID,
					Type:         string(entity.MutationOut),
					Quantity:     deductionAmount,
					ReferenceID:  req.OrderNumber,
					Notes:        "Sales Deduction",
					OutletID:     oid,
				})
				}
			} else {
				if err := productRepo.UpdateStockAtomic(product.ID, float64(itemInput.Quantity), "sub"); err != nil {
					return err
				}
			}
		}

		// Get tax & service charge settings
		taxRate := 0.0
		serviceRate := 0.0
		if taxSetting, err := settingRepo.FindByKey("tax_percentage"); err == nil {
			taxRate, _ = strconv.ParseFloat(taxSetting.Value, 64)
		}
		if serviceSetting, err := settingRepo.FindByKey("service_charge"); err == nil {
			serviceRate, _ = strconv.ParseFloat(serviceSetting.Value, 64)
		}

		serviceAmount := totalAmount * (serviceRate / 100)
		taxAmount := (totalAmount + serviceAmount) * (taxRate / 100)
		finalTotal := totalAmount + serviceAmount + taxAmount

		orderNumber := req.OrderNumber
		if orderNumber == "" {
			orderNumber = "ORD-" + time.Now().Format("20060102150405")
		}

		order := &entity.Order{
			OrderNumber:   orderNumber,
			TotalAmount:   finalTotal,
			PaymentMethod: req.PaymentMethod,
			PaymentStatus: "Paid",
			Status:        "Completed",
			UserID:        userID,
			CashierName:   cashierName,
			OrderTime:     time.Now(),
			OutletID:      oid,
		}

		// If QRIS, set as pending payment
		if req.PaymentMethod == "QRIS" {
			order.PaymentStatus = "Unpaid"
			order.Status = "Pending"
		}

		if err := orderRepo.Create(order); err != nil {
			return err
		}

		for i := range orderItems {
			orderItems[i].OrderID = order.ID
		}
		if err := orderItemRepo.Create(orderItems); err != nil {
			return err
		}

		loaded, err := orderRepo.FindByIDWithItems(order.ID)
		if err != nil {
			return err
		}
		result.Order = loaded.ToResponse()
		return nil
	})

	if err != nil {
		return nil, err
	}

	return &result, nil
}

func (uc *OrderUsecase) Void(id uint, outletID ...uint) (*entity.OrderResponse, error) {
	err := uc.db.Transaction(func(tx *gorm.DB) error {
		orderRepo := postgres.NewOrderRepository(tx)
		productRepo := postgres.NewProductRepository(tx)
		ingredientRepo := postgres.NewIngredientRepository(tx)
		mutationRepo := postgres.NewStockMutationRepository(tx)

		order, err := orderRepo.FindByIDWithItems(id)
		if err != nil {
			return domainErrors.NewNotFoundError("order")
		}

		if order.Status == "Void" {
			return domainErrors.ErrOrderAlreadyVoided
		}

		oid := uint(0)
		if len(outletID) > 0 {
			oid = outletID[0]
		}

		for _, item := range order.OrderItems {
			product, err := productRepo.FindByIDWithRecipeForUpdate(item.ProductID)
			if err != nil {
				continue
			}

			if len(product.Recipe) > 0 {
				for _, recipeItem := range product.Recipe {
					restoreAmount := recipeItem.Quantity * float64(item.Quantity)
					if _, err := ingredientRepo.FindByIDForUpdate(recipeItem.IngredientID); err != nil {
						return err
					}
					if err := ingredientRepo.UpdateStockAtomic(recipeItem.IngredientID, restoreAmount, "add"); err != nil {
						return err
					}
					if err := mutationRepo.Create(&entity.StockMutation{
						IngredientID: recipeItem.IngredientID,
						Type:         string(entity.MutationIn),
						Quantity:     restoreAmount,
						ReferenceID:  order.OrderNumber,
						Notes:        "Void Return",
						OutletID:     oid,
					}); err != nil {
						return err
					}
				}
			} else {
				if err := productRepo.UpdateStockAtomic(product.ID, float64(item.Quantity), "add"); err != nil {
					return err
				}
			}
		}

		order.Status = "Void"
		return orderRepo.Update(order)
	})

	if err != nil {
		return nil, err
	}

	updated, err := uc.orderRepo.FindByIDWithItems(id)
	if err != nil {
		return nil, err
	}
	resp := updated.ToResponse()
	return &resp, nil
}

// CompletePayment marks a pending/unpaid order as paid and completed manually.
func (uc *OrderUsecase) CompletePayment(id uint, outletID ...uint) (*entity.OrderResponse, error) {
	order, err := uc.orderRepo.FindByIDWithItems(id)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("order")
	}

	if order.Status == "Void" {
		return nil, domainErrors.ErrOrderAlreadyVoided
	}

	order.PaymentStatus = "Paid"
	order.Status = "Completed"

	if err := uc.orderRepo.Update(order); err != nil {
		return nil, err
	}

	resp := order.ToResponse()
	return &resp, nil
}

