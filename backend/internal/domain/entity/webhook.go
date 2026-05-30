package entity

import "time"

type ProcessedWebhook struct {
	ID        uint      `json:"id"`
	WebhookID string    `json:"webhook_id"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}
