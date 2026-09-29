package usecase

import (
	crand "crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/models"
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
	OrderNumber      string `json:"order_number"`
	PaymentMethod    string `json:"payment_method"`
	CashierName      string `json:"cashier_name"`
	CustomerEmail    string `json:"customer_email"`
	CustomerName     string `json:"customer_name"`
	CustomerPhone    string `json:"customer_phone"`
	PreparationNotes string `json:"preparation_notes"`
	Items            []struct {
		ProductID uint `json:"product_id"`
		Quantity  int  `json:"quantity"`
	} `json:"items"`
}

type CreateOrderResponse struct {
	Order        entity.OrderResponse `json:"order"`
	InvoiceURL   string               `json:"invoice_url"`
	LoyaltyToken string               `json:"loyalty_token,omitempty"`
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

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
var validPaymentMethods = map[string]bool{
	"Cash": true, "QRIS": true, "Lainnya": true, "Transfer": true, "Unpaid": true, "Belum Bayar": true,
}

func (uc *OrderUsecase) Create(req CreateOrderRequest, userID uint, cashierName string, outletID ...uint) (*CreateOrderResponse, error) {
	if !validPaymentMethods[req.PaymentMethod] {
		return nil, domainErrors.NewInvalidInputError(
			fmt.Sprintf("metode pembayaran tidak valid: %s. Pilih: Cash, QRIS, Lainnya, Transfer, Unpaid", req.PaymentMethod))
	}

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

			// Cash & Unpaid (Barista Quick Order): deduct stock immediately.
			// QRIS: defer deduction until CompletePayment to avoid
			// permanent stock loss on abandoned/unpaid orders.
			if req.PaymentMethod != "QRIS" {
				if len(product.Recipe) > 0 {
					for _, recipeItem := range product.Recipe {
						deductionAmount := recipeItem.Quantity * float64(itemInput.Quantity)
						// Vetted by AI - Manual Review Required by Senior Engineer/Manager
						if err := ingredientRepo.UpdateStockAtomic(recipeItem.IngredientID, deductionAmount, "sub"); err != nil {
							return err
						}
						if err := ingredientRepo.UpdateStockAtomicByLocation(recipeItem.IngredientID, deductionAmount, "sub", "kedai"); err != nil {
							return err
						}
						mutationRepo.Create(&entity.StockMutation{
							IngredientID: recipeItem.IngredientID,
							Type:         string(entity.MutationOut),
							Location:     "kedai",
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

		now := time.Now()
		orderNumber := req.OrderNumber
		if orderNumber == "" {
			orderNumber = fmt.Sprintf("ORD-%s%03d", now.Format("20060102150405"), now.Nanosecond()/1e6)
		}

		// Vetted by AI - Manual Review Required by Senior Engineer/Manager
		// Hitung antrian hari ini (reset jam 00:00:00 setiap hari)
		startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		var todayCount int64
		tx.Model(&models.Order{}).Where("outlet_id = ? AND order_time >= ?", oid, startOfDay).Count(&todayCount)
		queueNumber := int(todayCount) + 1

		kitchenStatus := "queued"
		var queuedAt *time.Time = &now
		if req.PaymentMethod == "QRIS" {
			kitchenStatus = "unpaid" // Barista baru meracik setelah pembayaran QRIS terkonfirmasi
			queuedAt = nil
		}

		order := &entity.Order{
			OrderNumber:      orderNumber,
			TotalAmount:      finalTotal,
			PaymentMethod:    req.PaymentMethod,
			PaymentStatus:    "Paid",
			Status:           "Completed",
			UserID:           userID,
			CashierName:      cashierName,
			OrderTime:        now,
			OutletID:         oid,
			CustomerName:     req.CustomerName,
			QueueNumber:      queueNumber,
			KitchenStatus:    kitchenStatus,
			PreparationNotes: req.PreparationNotes,
			QueuedAt:         queuedAt,
		}

		// If QRIS or Unpaid (Barista Open Bill), set as pending payment
		if req.PaymentMethod == "QRIS" || req.PaymentMethod == "Unpaid" || req.PaymentMethod == "Belum Bayar" {
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
		// Vetted by AI - Manual Review Required by Senior Engineer/Manager
		// PSAK & Cash Book: hanya proses jika order sudah lunas & selesai (bukan pending QRIS)
		if loaded.Status == "Completed" && loaded.PaymentStatus == "Paid" {
			if err := NewCashBookUsecase(tx).EnsureOrderIncome(loaded); err != nil {
				return err
			}
			outboxRepo := postgres.NewOutboxRepository(tx)
			if err := outboxRepo.Create(&entity.EventOutbox{
				EventType:     "order.completed",
				ReferenceType: "order",
				ReferenceID:   loaded.ID,
				Payload:       mustMarshal(orderEventPayload(loaded)),
				Status:        "pending",
			}); err != nil {
				return err
			}
			// Loyalty & Stempel: proses jika ada nomor HP pelanggan
			if req.CustomerPhone != "" {
				loyaltyUC := NewLoyaltyUsecase(tx)
				cust, errLoyalty := loyaltyUC.ProcessOrderLoyalty(req.CustomerPhone, req.CustomerName, loaded.ID, loaded.TotalAmount, oid)
				if errLoyalty == nil && cust != nil {
					result.LoyaltyToken = cust.LoyaltyToken
				}
			}
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
						// Vetted by AI - Manual Review Required by Senior Engineer/Manager
						if err := ingredientRepo.UpdateStockAtomic(recipeItem.IngredientID, restoreAmount, "add"); err != nil {
							return err
						}
						if err := ingredientRepo.UpdateStockAtomicByLocation(recipeItem.IngredientID, restoreAmount, "add", "kedai"); err != nil {
							return err
						}
						if err := mutationRepo.Create(&entity.StockMutation{
							IngredientID: recipeItem.IngredientID,
							Type:         string(entity.MutationIn),
							Location:     "kedai",
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
		if err := NewCashBookUsecase(tx).RemoveOrderIncome(order.ID); err != nil {
			return err
		}
		// PSAK: Create outbox event for void reversal (full payload for journal reversal)
		outboxRepo := postgres.NewOutboxRepository(tx)
		if err := outboxRepo.Create(&entity.EventOutbox{
			EventType:     "order.voided",
			ReferenceType: "order",
			ReferenceID:   order.ID,
			Payload:       mustMarshal(orderEventPayload(order)),
			Status:        "pending",
		}); err != nil {
			return err
		}
		return nil
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
	if !validPaymentMethods[newMethod] {
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
						// Vetted by AI - Manual Review Required by Senior Engineer/Manager
						if err := ingredientRepo.UpdateStockAtomic(recipeItem.IngredientID, deductionAmount, "sub"); err != nil {
							return err
						}
						if err := ingredientRepo.UpdateStockAtomicByLocation(recipeItem.IngredientID, deductionAmount, "sub", "kedai"); err != nil {
							return err
						}
						if err := mutationRepo.Create(&entity.StockMutation{
							IngredientID: recipeItem.IngredientID,
							Type:         string(entity.MutationOut),
							Location:     "kedai",
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
						if err := ingredientRepo.UpdateStockAtomicByLocation(recipeItem.IngredientID, restoreAmount, "add", "kedai"); err != nil {
							return err
						}
						if err := mutationRepo.Create(&entity.StockMutation{
							IngredientID: recipeItem.IngredientID,
							Type:         string(entity.MutationIn),
							Location:     "kedai",
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

		// Vetted by AI - Manual Review Required by Senior Engineer/Manager
		// Update Cash Book & PSAK outbox sesuai status pembayaran baru
		if newMethod == "Cash" {
			if err := cashBookUC.EnsureOrderIncome(order); err != nil {
				return err
			}
			outboxRepo := postgres.NewOutboxRepository(tx)
			if err := outboxRepo.Create(&entity.EventOutbox{
				EventType:     "order.completed",
				ReferenceType: "order",
				ReferenceID:   order.ID,
				Payload:       mustMarshal(orderEventPayload(order)),
				Status:        "pending",
			}); err != nil {
				return err
			}
		} else if oldMethod == "Cash" && newMethod == "QRIS" {
			// Reverse previous Cash order journal entry since it is now Unpaid/Pending
			outboxRepo := postgres.NewOutboxRepository(tx)
			if err := outboxRepo.Create(&entity.EventOutbox{
				EventType:     "order.voided",
				ReferenceType: "order",
				ReferenceID:   order.ID,
				Payload:       mustMarshal(orderEventPayload(order)),
				Status:        "pending",
			}); err != nil {
				return err
			}
		}

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
	return uc.CompletePaymentWithMethod(id, "", outletID...)
}

// CompletePaymentWithMethod marks a pending/unpaid order as paid and completed with optional actual payment method (Cash / QRIS).
func (uc *OrderUsecase) CompletePaymentWithMethod(id uint, actualMethod string, outletID ...uint) (*entity.OrderResponse, error) {
	order, err := uc.orderRepo.FindByIDWithItems(id)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("order")
	}

	if order.Status == "Void" {
		return nil, domainErrors.ErrOrderAlreadyVoided
	}

	previousMethod := order.PaymentMethod
	previousStatus := order.PaymentStatus
	if actualMethod != "" {
		order.PaymentMethod = actualMethod
	} else if order.PaymentMethod == "Unpaid" || order.PaymentMethod == "Belum Bayar" {
		order.PaymentMethod = "Cash"
	}

	order.PaymentStatus = "Paid"
	order.Status = "Completed"
	if order.KitchenStatus == "" || order.KitchenStatus == "unpaid" || order.KitchenStatus == "waiting_payment" {
		order.KitchenStatus = "queued"
		now := time.Now()
		order.QueuedAt = &now
	}

	if err := uc.db.Transaction(func(tx *gorm.DB) error {
		orderRepo := postgres.NewOrderRepository(tx)
		productRepo := postgres.NewProductRepository(tx)
		ingredientRepo := postgres.NewIngredientRepository(tx)
		mutationRepo := postgres.NewStockMutationRepository(tx)

		// Vetted by AI - Manual Review Required by Senior Engineer/Manager
		// Assign QueueNumber jika belum ada (misal self_order yang dibuat dengan queue_number = 0)
		if order.QueueNumber == 0 {
			now := time.Now()
			startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
			var queueCount int64
			tx.Model(&models.Order{}).Where("outlet_id = ? AND order_time >= ? AND queue_number > 0", order.OutletID, startOfDay).Count(&queueCount)
			order.QueueNumber = int(queueCount) + 1
		}

		if err := orderRepo.Update(order); err != nil {
			return err
		}

		// QRIS, Self-Order, or previously Unpaid orders: stock was NOT deducted at creation.
		// Deduct now that payment is confirmed.
		if previousMethod == "QRIS" || order.OrderSource == "self_order" || previousMethod == "Belum Bayar" || previousMethod == "Unpaid" || previousStatus == "Unpaid" {
			oid := order.OutletID
			for _, item := range order.OrderItems {
				product, err := productRepo.FindByIDWithRecipeForUpdate(item.ProductID)
				if err != nil {
					return fmt.Errorf("produk ID %d tidak ditemukan saat deduct stok: %w", item.ProductID, err)
				}
				if len(product.Recipe) > 0 {
					for _, recipeItem := range product.Recipe {
						deductionAmount := recipeItem.Quantity * float64(item.Quantity)
						// Vetted by AI - Manual Review Required by Senior Engineer/Manager
						if err := ingredientRepo.UpdateStockAtomic(recipeItem.IngredientID, deductionAmount, "sub"); err != nil {
							return err
						}
						if err := ingredientRepo.UpdateStockAtomicByLocation(recipeItem.IngredientID, deductionAmount, "sub", "kedai"); err != nil {
							return err
						}
						if err := mutationRepo.Create(&entity.StockMutation{
							IngredientID: recipeItem.IngredientID,
							Type:         string(entity.MutationOut),
							Location:     "kedai",
							Quantity:     deductionAmount,
							ReferenceID:  order.OrderNumber,
							Notes:        "Payment Confirmed - Sales Deduction",
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

		// PSAK: Create outbox event for journal entry when order is paid
		outboxRepo := postgres.NewOutboxRepository(tx)
		if err := outboxRepo.Create(&entity.EventOutbox{
			EventType:     "order.completed",
			ReferenceType: "order",
			ReferenceID:   order.ID,
			Payload:       mustMarshal(orderEventPayload(order)),
			Status:        "pending",
		}); err != nil {
			return err
		}

		// Vetted by AI - Manual Review Required by Senior Engineer/Manager
		// Loyalty & Stempel: proses jika ada nomor HP pelanggan saat pelunasan (termasuk pesanan self-order QR)
		if order.CustomerPhone != "" {
			loyaltyUC := NewLoyaltyUsecase(tx)
			_, _ = loyaltyUC.ProcessOrderLoyalty(order.CustomerPhone, order.CustomerName, order.ID, order.TotalAmount, order.OutletID)
		}

		return NewCashBookUsecase(tx).EnsureOrderIncome(order)
	}); err != nil {
		return nil, err
	}

	resp := order.ToResponse()
	return &resp, nil
}

// GetUnpaidOrders mengembalikan semua pesanan yang belum lunas (Open Bills) untuk KDS & Kasir
func (uc *OrderUsecase) GetUnpaidOrders(outletID ...uint) ([]entity.OrderResponse, error) {
	orders, err := uc.orderRepo.FindUnpaidOrders(outletID...)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.OrderResponse, len(orders))
	for i, o := range orders {
		resp[i] = o.ToResponse()
	}
	return resp, nil
}

func orderEventPayload(order *entity.Order) map[string]interface{} {
	items := make([]map[string]interface{}, len(order.OrderItems))
	var totalCOGS float64
	for i, item := range order.OrderItems {
		cogs := item.Cost * float64(item.Quantity)
		items[i] = map[string]interface{}{
			"product_id": item.ProductID,
			"quantity":   item.Quantity,
			"price":      item.Price,
			"cost":       cogs,
		}
		totalCOGS += cogs
	}
	return map[string]interface{}{
		"id":             order.ID,
		"order_number":   order.OrderNumber,
		"total_amount":   order.TotalAmount,
		"payment_method": order.PaymentMethod,
		"outlet_id":      order.OutletID,
		"cashier_name":   order.CashierName,
		"items":          items,
		"total_cogs":     totalCOGS,
	}
}

func mustMarshal(v interface{}) []byte {
	data, _ := json.Marshal(v)
	return data
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
// GetActiveKitchenQueue mengembalikan antrian pesanan aktif untuk barista (queued, preparing, ready)
func (uc *OrderUsecase) GetActiveKitchenQueue(outletID ...uint) ([]entity.OrderResponse, error) {
	orders, err := uc.orderRepo.FindActiveKitchenQueue(outletID...)
	if err != nil {
		return nil, err
	}
	resp := make([]entity.OrderResponse, len(orders))
	for i, o := range orders {
		resp[i] = o.ToResponse()
	}
	return resp, nil
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
// UpdateKitchenStatus memperbarui status pengerjaan pesanan oleh barista atau catatan racikan
func (uc *OrderUsecase) UpdateKitchenStatus(id uint, status string, notes string, outletID ...uint) (*entity.OrderResponse, error) {
	if status != "" {
		validStatuses := map[string]bool{
			"queued": true, "preparing": true, "ready": true, "served": true,
		}
		if !validStatuses[status] {
			return nil, domainErrors.NewInvalidInputError("status dapur tidak valid: " + status)
		}
	}

	if err := uc.orderRepo.UpdateKitchenStatus(id, status, notes, outletID...); err != nil {
		return nil, err
	}

	order, err := uc.orderRepo.FindByIDWithItems(id)
	if err != nil {
		return nil, err
	}
	resp := order.ToResponse()
	return &resp, nil
}

// ClearActiveKitchenQueue menandai semua pesanan aktif menjadi served (arsipkan antrian lampau)
func (uc *OrderUsecase) ClearActiveKitchenQueue(outletID ...uint) error {
	return uc.orderRepo.ClearActiveKitchenQueue(outletID...)
}

// PublicOrderCreateResponse returns token, order number and pickup code to the customer smartphone
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type PublicOrderCreateResponse struct {
	OrderNumber   string                   `json:"order_number"`
	PickupCode    string                   `json:"pickup_code"`
	TrackingToken string                   `json:"tracking_token"`
	CustomerName  string                   `json:"customer_name"`
	TotalAmount   float64                  `json:"total_amount"`
	ItemCount     int                      `json:"item_count"`
	Status        string                   `json:"status"`
	PaymentStatus string                   `json:"payment_status"`
	KitchenStatus string                   `json:"kitchen_status"`
	OrderTime     time.Time                `json:"order_time"`
	Items         []PublicOrderItemSummary `json:"items"`
}

type PublicOrderItemSummary struct {
	ProductName string  `json:"product_name"`
	Quantity    int     `json:"quantity"`
	Price       float64 `json:"price"`
	Subtotal    float64 `json:"subtotal"`
	Notes       string  `json:"notes"`
}

type PublicOrderStatusResponse struct {
	StoreName     string                   `json:"store_name"`
	LogoURL       string                   `json:"logo_url"`
	OrderNumber   string                   `json:"order_number"`
	PickupCode    string                   `json:"pickup_code"`
	QueueNumber   int                      `json:"queue_number"`
	CustomerName  string                   `json:"customer_name"`
	Status        string                   `json:"status"`
	PaymentStatus string                   `json:"payment_status"`
	KitchenStatus string                   `json:"kitchen_status"`
	TotalAmount   float64                  `json:"total_amount"`
	OrderTime     time.Time                `json:"order_time"`
	Items         []PublicOrderItemSummary `json:"items"`
}

func generateTrackingToken() string {
	b := make([]byte, 16)
	_, _ = crand.Read(b)
	return hex.EncodeToString(b)
}

func generatePickupCode() string {
	b := make([]byte, 2)
	_, _ = crand.Read(b)
	num := (int(b[0])<<8|int(b[1]))%9000 + 1000
	return fmt.Sprintf("%04d", num)
}

// CreatePublicSelfOrder creates an unpaid pending order from smartphone customer
// Server recalculates all prices directly from database (Zero Client Trust)
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *OrderUsecase) CreatePublicSelfOrder(req request.PublicCreateOrderRequest, outletID ...uint) (*PublicOrderCreateResponse, error) {
	oid := uint(0)
	if len(outletID) > 0 {
		oid = outletID[0]
	}

	// 1. Check if self order is enabled by owner/manager
	if setting, err := uc.settingRepo.FindByKey("self_order_enabled"); err == nil {
		if strings.ToLower(strings.TrimSpace(setting.Value)) == "false" {
			return nil, domainErrors.NewInvalidInputError("Pemesanan mandiri sedang dinonaktifkan sementara oleh kedai. Silakan memesan langsung ke kasir.")
		}
	}

	// 2. Anti-spam cap: max 20 pending unpaid self-orders in outlet
	unpaidCount, err := uc.orderRepo.CountActiveUnpaidSelfOrders(oid)
	if err == nil && unpaidCount >= 20 {
		return nil, domainErrors.NewInvalidInputError("Antrean pemesanan mandiri sedang penuh. Silakan langsung memesan ke kasir.")
	}

	// 3. Validate & sanitize CustomerName
	cleanName := strings.TrimSpace(req.CustomerName)
	if len(cleanName) < 2 || len(cleanName) > 40 {
		return nil, domainErrors.NewInvalidInputError("Nama pemesan harus antara 2 hingga 40 karakter.")
	}

	var result PublicOrderCreateResponse

	err = uc.db.Transaction(func(tx *gorm.DB) error {
		orderRepo := postgres.NewOrderRepository(tx)
		orderItemRepo := postgres.NewOrderItemRepository(tx)
		productRepo := postgres.NewProductRepository(tx)
		ingredientRepo := postgres.NewIngredientRepository(tx)
		settingRepo := postgres.NewSettingRepository(tx)

		var totalAmount float64
		var orderItems []entity.OrderItem
		var itemSummaries []PublicOrderItemSummary

		for _, itemInput := range req.Items {
			product, err := productRepo.FindByIDWithRecipeForUpdate(itemInput.ProductID)
			if err != nil {
				return domainErrors.NewNotFoundError("produk")
			}

			// Validate current stock availability (without deducting yet)
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

			subtotal := product.Price * float64(itemInput.Quantity)
			totalAmount += subtotal

			orderItems = append(orderItems, entity.OrderItem{
				ProductID: product.ID,
				Quantity:  itemInput.Quantity,
				Price:     product.Price,
				Cost:      product.Cost,
				Notes:     strings.TrimSpace(itemInput.Notes),
			})

			itemSummaries = append(itemSummaries, PublicOrderItemSummary{
				ProductName: product.Name,
				Quantity:    itemInput.Quantity,
				Price:       product.Price,
				Subtotal:    subtotal,
				Notes:       strings.TrimSpace(itemInput.Notes),
			})
		}

		// Tax & Service rates
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

		now := time.Now()
		pickupCode := generatePickupCode()
		trackingToken := generateTrackingToken()
		orderNumber := fmt.Sprintf("SGH-%s-%s", now.Format("20060102"), pickupCode)

		order := &entity.Order{
			OrderNumber:      orderNumber,
			TotalAmount:      finalTotal,
			PaymentMethod:    "Belum Bayar",
			PaymentStatus:    "Unpaid",
			Status:           "Pending",
			KitchenStatus:    "waiting_payment", // Barista does not brew until paid at cashier
			OrderSource:      "self_order",
			CustomerName:     cleanName,
			CustomerPhone:    strings.TrimSpace(req.CustomerPhone),
			PreparationNotes: strings.TrimSpace(req.Notes),
			TrackingToken:    trackingToken,
			PickupCode:       pickupCode,
			OrderTime:        now,
			OutletID:         oid,
			QueueNumber:      0, // Queue number is officially minted upon payment confirmation
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

		result = PublicOrderCreateResponse{
			OrderNumber:   orderNumber,
			PickupCode:    pickupCode,
			TrackingToken: trackingToken,
			CustomerName:  cleanName,
			TotalAmount:   finalTotal,
			ItemCount:     len(orderItems),
			Status:        order.Status,
			PaymentStatus: order.PaymentStatus,
			KitchenStatus: order.KitchenStatus,
			OrderTime:     now,
			Items:         itemSummaries,
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &result, nil
}

// GetPublicOrderStatus fetches order tracking status using secret tracking token (anti-IDOR)
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *OrderUsecase) GetPublicOrderStatus(trackingToken string) (*PublicOrderStatusResponse, error) {
	order, err := uc.orderRepo.FindByTrackingToken(trackingToken)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("order")
	}

	logoURL := ""
	storeName := "Singgah Coffee"
	if uc.settingRepo != nil {
		if setting, err := uc.settingRepo.FindByKey("outlet_logo_url"); err == nil {
			logoURL = strings.TrimSpace(setting.Value)
		}
		if setting, err := uc.settingRepo.FindByKey("outlet_name"); err == nil {
			if val := strings.TrimSpace(setting.Value); val != "" {
				storeName = val
			}
		}
	}

	var items []PublicOrderItemSummary
	for _, it := range order.OrderItems {
		pName := it.Product.Name
		if pName == "" {
			pName = "Menu Singgah"
		}
		items = append(items, PublicOrderItemSummary{
			ProductName: pName,
			Quantity:    it.Quantity,
			Price:       it.Price,
			Subtotal:    it.Price * float64(it.Quantity),
			Notes:       it.Notes,
		})
	}

	return &PublicOrderStatusResponse{
		StoreName:     storeName,
		LogoURL:       logoURL,
		OrderNumber:   order.OrderNumber,
		PickupCode:    order.PickupCode,
		QueueNumber:   order.QueueNumber,
		CustomerName:  order.CustomerName,
		Status:        order.Status,
		PaymentStatus: order.PaymentStatus,
		KitchenStatus: order.KitchenStatus,
		TotalAmount:   order.TotalAmount,
		OrderTime:     order.OrderTime,
		Items:         items,
	}, nil
}


