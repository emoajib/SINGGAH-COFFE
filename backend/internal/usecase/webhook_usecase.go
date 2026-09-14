package usecase

import (
	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type WebhookUsecase struct {
	db          *gorm.DB
	webhookRepo repository.WebhookRepository
	orderRepo   repository.OrderRepository
	settingRepo repository.SettingRepository
}

func NewWebhookUsecase(db *gorm.DB) *WebhookUsecase {
	return &WebhookUsecase{
		db:          db,
		webhookRepo: postgres.NewWebhookRepository(db),
		orderRepo:   postgres.NewOrderRepository(db),
		settingRepo: postgres.NewSettingRepository(db),
	}
}

// XenditCallback represents the payload received from Xendit payment callback.
type XenditCallback struct {
	ID         string  `json:"id"`
	ExternalID string  `json:"external_id"`
	Status     string  `json:"status"`
	PaidAmount float64 `json:"paid_amount"`
}

func (uc *WebhookUsecase) GetWebhookLogs(limit int) ([]entity.ProcessedWebhook, error) {
	if limit <= 0 {
		limit = 20
	}
	return uc.webhookRepo.FindAll(limit)
}

// ProcessXenditWebhook processes an incoming Xendit payment callback.
// It verifies the callback token, ensures idempotency, and updates the
// corresponding order's payment status.
func (uc *WebhookUsecase) ProcessXenditWebhook(callbackToken string, payload XenditCallback) error {
	// Verify callback token (fail closed)
	if callbackToken == "" {
		return domainErrors.NewUnauthorizedError("missing callback token")
	}

	expectedToken, err := uc.settingRepo.FindByKey("xendit_callback_token")
	if err != nil || expectedToken == nil || expectedToken.Value == "" {
		return domainErrors.NewInvalidInputError("callback token is not configured")
	}

	if callbackToken != expectedToken.Value {
		return domainErrors.NewUnauthorizedError("invalid callback token")
	}

	return uc.db.Transaction(func(tx *gorm.DB) error {
		webhookRepo := postgres.NewWebhookRepository(tx)
		orderRepo := postgres.NewOrderRepository(tx)

		// Idempotency check: skip if this webhook ID was already processed
		existing, _ := webhookRepo.FindByWebhookID(payload.ID)
		if existing != nil {
			return nil
		}

		// Record the processed webhook
		webhookRepo.Create(&entity.ProcessedWebhook{
			WebhookID: payload.ID,
			Status:    payload.Status,
		})

		// Find order by external_id (which maps to OrderNumber)
		type orderRow struct {
			ID uint
		}
		var found orderRow
		tx.Raw("SELECT id FROM orders WHERE order_number = ?", payload.ExternalID).Scan(&found)
		if found.ID == 0 {
			return nil
		}

		loadedOrder, err := orderRepo.FindByIDWithItems(found.ID)
		if err != nil || loadedOrder == nil {
			return nil
		}

		// Vetted by AI - Manual Review Required by Senior Engineer/Manager
		switch payload.Status {
		case "PAID", "SETTLED":
			if loadedOrder.PaymentStatus == "Paid" {
				return nil
			}
			loadedOrder.PaymentStatus = "Paid"
			loadedOrder.Status = "Completed"

			// Potong stok saat pembayaran QRIS terkonfirmasi (sebelumnya ditunda saat checkout)
			productRepo := postgres.NewProductRepository(tx)
			ingredientRepo := postgres.NewIngredientRepository(tx)
			mutationRepo := postgres.NewStockMutationRepository(tx)
			oid := loadedOrder.OutletID

			for _, item := range loadedOrder.OrderItems {
				product, err := productRepo.FindByIDWithRecipeForUpdate(item.ProductID)
				if err != nil {
					continue
				}
				if len(product.Recipe) > 0 {
					for _, recipeItem := range product.Recipe {
						deductionAmount := recipeItem.Quantity * float64(item.Quantity)
						if err := ingredientRepo.UpdateStockAtomic(recipeItem.IngredientID, deductionAmount, "sub"); err != nil {
							return err
						}
						_ = mutationRepo.Create(&entity.StockMutation{
							IngredientID: recipeItem.IngredientID,
							Type:         string(entity.MutationOut),
							Quantity:     deductionAmount,
							ReferenceID:  loadedOrder.OrderNumber,
							Notes:        "QRIS Webhook Payment Confirmed - Sales Deduction",
							OutletID:     oid,
						})
					}
				} else {
					if err := productRepo.UpdateStockAtomic(product.ID, float64(item.Quantity), "sub"); err != nil {
						return err
					}
				}
			}

			if err := orderRepo.Update(loadedOrder); err != nil {
				return err
			}

			// PSAK: Create outbox event for journal entry
			outboxRepo := postgres.NewOutboxRepository(tx)
			if err := outboxRepo.Create(&entity.EventOutbox{
				EventType:     "order.completed",
				ReferenceType: "order",
				ReferenceID:   loadedOrder.ID,
				Payload:       mustMarshal(orderEventPayload(loadedOrder)),
				Status:        "pending",
			}); err != nil {
				return err
			}

			return NewCashBookUsecase(tx).EnsureOrderIncome(loadedOrder)

		case "FAILED", "EXPIRED":
			if loadedOrder.PaymentStatus == "Paid" || loadedOrder.Status == "Void" {
				return nil
			}
			loadedOrder.PaymentStatus = "Cancelled"
			loadedOrder.Status = "Void"

			// Catatan: Stok QRIS tidak dipotong saat checkout (pending),
			// sehingga tidak boleh menambahkan stok saat expired/failed untuk mencegah stok fiktif.

			if err := orderRepo.Update(loadedOrder); err != nil {
				return err
			}
			return NewCashBookUsecase(tx).RemoveOrderIncome(loadedOrder.ID)

		default:
			return nil
		}
	})
}
