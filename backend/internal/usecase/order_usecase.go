package usecase

import (
	"fmt"
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

func (uc *OrderUsecase) GetAllFiltered(start, end, status string, limit, offset int, outletID ...uint) ([]entity.OrderResponse, error) {
	orders, err := uc.orderRepo.FindAllFiltered(start, end, status, limit, offset, outletID...)
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

			// Cash: deduct stock immediately.
			// QRIS: defer deduction until CompletePayment to avoid
			// permanent stock loss on abandoned/unpaid orders.
			if req.PaymentMethod == "Cash" {
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
			now := time.Now()
			orderNumber = fmt.Sprintf("ORD-%s%03d", now.Format("20060102150405"), now.Nanosecond()/1e6)
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
		if err := NewCashBookUsecase(tx).EnsureOrderIncome(loaded); err != nil {
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

		// Only restore stock if it was actually deducted.
		// Cash orders: stock always deducted at creation.
		// QRIS Completed: stock deducted at CompletePayment.
		// QRIS Pending: stock NEVER deducted → skip restoration.
		needsStockRestore := order.PaymentMethod == "Cash" || order.Status == "Completed"

		if needsStockRestore {
			for _, item := range order.OrderItems {
				product, err := productRepo.FindByIDWithRecipeForUpdate(item.ProductID)
				if err != nil {
					return fmt.Errorf("gagal mengembalikan stok untuk item order: produk ID %d tidak ditemukan", item.ProductID)
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
		}

		order.Status = "Void"
		if err := orderRepo.Update(order); err != nil {
			return err
		}
		return NewCashBookUsecase(tx).RemoveOrderIncome(order.ID)
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

// UpdatePaymentMethod allows the owner to correct a payment method mistake
// (e.g. cashier typed QRIS instead of Cash). Adjusts PaymentStatus, Status,
// and syncs the Cash Book entry accordingly.
func (uc *OrderUsecase) UpdatePaymentMethod(id uint, newMethod string, outletID ...uint) (*entity.OrderResponse, error) {
	if newMethod != "Cash" && newMethod != "QRIS" {
		return nil, fmt.Errorf("metode pembayaran tidak valid: %s", newMethod)
	}

	var result entity.OrderResponse

	err := uc.db.Transaction(func(tx *gorm.DB) error {
		orderRepo := postgres.NewOrderRepository(tx)
		order, err := orderRepo.FindByIDWithItems(id)
		if err != nil {
			return domainErrors.NewNotFoundError("order")
		}
		if order.Status == "Void" {
			return domainErrors.ErrOrderAlreadyVoided
		}

		// Same method — nothing to do
		if order.PaymentMethod == newMethod {
			result = order.ToResponse()
			return nil
		}

		// Remove old Cash Book entry
		cashBookUC := NewCashBookUsecase(tx)
		if err := cashBookUC.RemoveOrderIncome(order.ID); err != nil {
			return err
		}

		// Update order fields
		oldMethod := order.PaymentMethod
		order.PaymentMethod = newMethod
		if newMethod == "Cash" {
			order.PaymentStatus = "Paid"
			order.Status = "Completed"
		} else {
			order.PaymentStatus = "Unpaid"
			order.Status = "Pending"
		}

		if err := orderRepo.Update(order); err != nil {
			return err
		}

		// Handle stock adjustment based on method change direction
		productRepo := postgres.NewProductRepository(tx)
		ingredientRepo := postgres.NewIngredientRepository(tx)
		mutationRepo := postgres.NewStockMutationRepository(tx)

		if oldMethod == "QRIS" && newMethod == "Cash" {
			// QRIS (Pending, stock NOT deducted) → Cash: deduct stock now
			for _, item := range order.OrderItems {
				product, err := productRepo.FindByIDWithRecipeForUpdate(item.ProductID)
				if err != nil {
					return fmt.Errorf("produk ID %d tidak ditemukan: %w", item.ProductID, err)
				}
				if len(product.Recipe) > 0 {
					for _, recipeItem := range product.Recipe {
						deductionAmount := recipeItem.Quantity * float64(item.Quantity)
						if err := ingredientRepo.UpdateStockAtomic(recipeItem.IngredientID, deductionAmount, "sub"); err != nil {
							return err
						}
						if err := mutationRepo.Create(&entity.StockMutation{
							IngredientID: recipeItem.IngredientID,
							Type:         string(entity.MutationOut),
							Quantity:     deductionAmount,
							ReferenceID:  order.OrderNumber,
							Notes:        "Payment method corrected to Cash - Sales Deduction",
							OutletID:     order.OutletID,
						}); err != nil {
							return err
						}
					}
				} else {
					if err := productRepo.UpdateStockAtomic(product.ID, float64(item.Quantity), "sub"); err != nil {
						return err
					}
				}
			}
		} else if oldMethod == "Cash" && newMethod == "QRIS" {
			// Cash (Completed, stock deducted) → QRIS: restore stock
			for _, item := range order.OrderItems {
				product, err := productRepo.FindByIDWithRecipeForUpdate(item.ProductID)
				if err != nil {
					continue
				}
				if len(product.Recipe) > 0 {
					for _, recipeItem := range product.Recipe {
						restoreAmount := recipeItem.Quantity * float64(item.Quantity)
						if err := ingredientRepo.UpdateStockAtomic(recipeItem.IngredientID, restoreAmount, "add"); err != nil {
							return err
						}
						if err := mutationRepo.Create(&entity.StockMutation{
							IngredientID: recipeItem.IngredientID,
							Type:         string(entity.MutationIn),
							Quantity:     restoreAmount,
							ReferenceID:  order.OrderNumber,
							Notes:        "Payment method corrected to QRIS - Stock Restore",
							OutletID:     order.OutletID,
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
		}

		// Create new Cash Book entry with correct method
		if newMethod == "Cash" {
			if err := cashBookUC.EnsureOrderIncome(order); err != nil {
				return err
			}
		}
		// QRIS: no Cash Book entry until CompletePayment is called

		result = order.ToResponse()
		return nil
	})

	if err != nil {
		return nil, err
	}
	return &result, nil
}

// CompletePayment marks a pending/unpaid order as paid and completed manually.
// For QRIS orders, this is also where stock is actually deducted (deferred from Create).
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

	if err := uc.db.Transaction(func(tx *gorm.DB) error {
		orderRepo := postgres.NewOrderRepository(tx)
		productRepo := postgres.NewProductRepository(tx)
		ingredientRepo := postgres.NewIngredientRepository(tx)
		mutationRepo := postgres.NewStockMutationRepository(tx)

		if err := orderRepo.Update(order); err != nil {
			return err
		}

		// QRIS orders: stock was NOT deducted at creation.
		// Deduct now that payment is confirmed.
		if order.PaymentMethod == "QRIS" {
			oid := order.OutletID
			for _, item := range order.OrderItems {
				product, err := productRepo.FindByIDWithRecipeForUpdate(item.ProductID)
				if err != nil {
					return fmt.Errorf("produk ID %d tidak ditemukan saat deduct stok: %w", item.ProductID, err)
				}
				if len(product.Recipe) > 0 {
					for _, recipeItem := range product.Recipe {
						deductionAmount := recipeItem.Quantity * float64(item.Quantity)
						if err := ingredientRepo.UpdateStockAtomic(recipeItem.IngredientID, deductionAmount, "sub"); err != nil {
							return err
						}
						if err := mutationRepo.Create(&entity.StockMutation{
							IngredientID: recipeItem.IngredientID,
							Type:         string(entity.MutationOut),
							Quantity:     deductionAmount,
							ReferenceID:  order.OrderNumber,
							Notes:        "QRIS Payment Confirmed - Sales Deduction",
							OutletID:     oid,
						}); err != nil {
							return err
						}
					}
				} else {
					if err := productRepo.UpdateStockAtomic(product.ID, float64(item.Quantity), "sub"); err != nil {
						return err
					}
				}
			}
		}

		return NewCashBookUsecase(tx).EnsureOrderIncome(order)
	}); err != nil {
		return nil, err
	}

	resp := order.ToResponse()
	return &resp, nil
}

