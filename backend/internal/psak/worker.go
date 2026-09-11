package psak

import (
	"context"
	"log"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/repository"

	"gorm.io/gorm"
)

// Worker polls the outbox table and dispatches events to EventBus.
// Designed for shared hosting: single goroutine, bounded work per cycle.
type Worker struct {
	db          *gorm.DB
	eventBus    *EventBus
	outboxRepo  repository.OutboxRepository
	interval    time.Duration
	done        chan struct{}
	cleanupDays int
}

// NewWorker creates a Worker with default 5s polling and 90-day cleanup.
func NewWorker(db *gorm.DB, eventBus *EventBus, outboxRepo repository.OutboxRepository) *Worker {
	return &Worker{
		db:          db,
		eventBus:    eventBus,
		outboxRepo:  outboxRepo,
		interval:    5 * time.Second,
		done:        make(chan struct{}),
		cleanupDays: 90,
	}
}

// Start begins the polling loop in a single goroutine.
func (w *Worker) Start(ctx context.Context) {
	go w.loop(ctx)
}

// Stop gracefully stops the worker.
func (w *Worker) Stop() {
	close(w.done)
}

func (w *Worker) loop(ctx context.Context) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[Worker] PANIC in polling loop: %v", r)
		}
		log.Println("[Worker] stopped")
	}()

	log.Println("[Worker] started, polling every", w.interval)
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-w.done:
			return
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.pollCycle(ctx)
		}
	}
}

func (w *Worker) pollCycle(ctx context.Context) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[Worker] PANIC in poll cycle: %v", r)
		}
	}()

	// Skip cycle if DB connection is unhealthy
	sqlDB, err := w.db.DB()
	if err != nil {
		log.Printf("[Worker] WARN: cannot get sql.DB: %v, skipping cycle", err)
		return
	}
	if err := sqlDB.PingContext(ctx); err != nil {
		log.Printf("[Worker] WARN: DB ping failed: %v, skipping cycle", err)
		return
	}

	events, err := w.outboxRepo.FindPending(10)
	if err != nil {
		log.Printf("[Worker] ERROR: FindPending: %v", err)
		return
	}

	for i := range events {
		w.processEvent(ctx, &events[i])
	}

	// Cleanup old successful events (>90 days) — non-critical, best effort
	if cleaned, err := w.outboxRepo.Cleanup(w.cleanupDays); err != nil {
		log.Printf("[Worker] WARN: Cleanup: %v", err)
	} else if cleaned > 0 {
		log.Printf("[Worker] Cleaned %d old outbox entries", cleaned)
	}
}

func (w *Worker) processEvent(ctx context.Context, evt *entity.EventOutbox) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[Worker] PANIC processing event id=%d: %v", evt.ID, r)
		}
	}()

	// Claim the event (atomic: pending → processing)
	if err := w.outboxRepo.Claim(evt.ID); err != nil {
		log.Printf("[Worker] WARN: Claim id=%d: %v", evt.ID, err)
		return
	}

	// Dispatch to event bus
	if !w.eventBus.Publish(evt) {
		// Queue full — mark as failed so it retries next cycle
		_ = w.outboxRepo.MarkFailed(evt.ID, "event bus queue full")
		log.Printf("[Worker] WARN: queue full for event id=%d, marked failed", evt.ID)
		return
	}

	// Mark success (event bus will process asynchronously)
	if err := w.outboxRepo.MarkSuccess(evt.ID); err != nil {
		log.Printf("[Worker] ERROR: MarkSuccess id=%d: %v", evt.ID, err)
	}
}
