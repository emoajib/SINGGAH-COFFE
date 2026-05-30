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

// ProcessXenditWebhook processes an incoming Xendit payment callback.
// It verifies the callback token, ensures idempotency, and updates the
// corresponding order's payment status.
func (uc *WebhookUsecase) ProcessXenditWebhook(callbackToken string, payload XenditCallback) error {
	// Verify callback token
	expectedToken, err := uc.settingRepo.FindByKey("xendit_callback_token")
	if err == nil && expectedToken != nil && callbackToken != "" {
		if callbackToken != expectedToken.Value {
			return domainErrors.NewUnauthorizedError("invalid callback token")
		}
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

		switch payload.Status {
		case "PAID", "SETTLED":
			if loadedOrder.PaymentStatus == "Paid" {
				return nil
			}
			loadedOrder.PaymentStatus = "Paid"
			loadedOrder.Status = "Completed"
		case "FAILED", "EXPIRED":
			if loadedOrder.PaymentStatus == "Paid" {
				return nil
			}
			loadedOrder.PaymentStatus = "Cancelled"
			loadedOrder.Status = "Void"
		default:
			return nil
		}

		return orderRepo.Update(loadedOrder)
	})
}
