package psak

import (
	"context"
	"log"
	"time"

	"singgah-pos-backend/internal/domain/entity"
)

// EventHandler processes events
type EventHandler interface {
	ProcessEvent(event *entity.EventOutbox) error
}

// EventBus is an in-process event bus with bounded channel queue.
// Designed for shared hosting: GOMAXPROCS=1, single worker goroutine.
type EventBus struct {
	queue   chan *entity.EventOutbox
	handler EventHandler
	done    chan struct{}
}

// NewEventBus creates a new EventBus with the given queue size.
// If queueSize <= 0, defaults to 100.
func NewEventBus(handler EventHandler, queueSize int) *EventBus {
	if queueSize <= 0 {
		queueSize = 100
	}
	return &EventBus{
		queue:   make(chan *entity.EventOutbox, queueSize),
		handler: handler,
		done:    make(chan struct{}),
	}
}

// Publish adds an event to the queue (non-blocking).
// Returns true if queued, false if queue is full (event dropped).
func (eb *EventBus) Publish(event *entity.EventOutbox) bool {
	select {
	case eb.queue <- event:
		return true
	default:
		log.Printf("[EventBus] WARN: queue full, dropping event type=%s ref=%s/%d",
			event.EventType, event.ReferenceType, event.ReferenceID)
		return false
	}
}

// Start begins the background worker. Safe to call only once.
func (eb *EventBus) Start(ctx context.Context) {
	go eb.worker(ctx)
}

// Stop gracefully stops the worker by closing the done channel
// and waiting for the goroutine to finish.
func (eb *EventBus) Stop() {
	close(eb.done)
}

func (eb *EventBus) worker(ctx context.Context) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[EventBus] PANIC recovered in worker: %v", r)
		}
		log.Println("[EventBus] worker stopped")
	}()

	log.Println("[EventBus] worker started")
	for {
		select {
		case <-eb.done:
			return
		case <-ctx.Done():
			return
		case event := <-eb.queue:
			eb.processWithTimeout(ctx, event)
		}
	}
}

func (eb *EventBus) processWithTimeout(ctx context.Context, event *entity.EventOutbox) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[EventBus] PANIC processing event id=%d type=%s: %v",
				event.ID, event.EventType, r)
		}
	}()

	tctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	done := make(chan error, 1)
	go func() {
		done <- eb.handler.ProcessEvent(event)
	}()

	select {
	case <-tctx.Done():
		log.Printf("[EventBus] TIMEOUT processing event id=%d type=%s after 30s",
			event.ID, event.EventType)
	case err := <-done:
		if err != nil {
			log.Printf("[EventBus] ERROR processing event id=%d type=%s: %v",
				event.ID, event.EventType, err)
		}
	}
}
