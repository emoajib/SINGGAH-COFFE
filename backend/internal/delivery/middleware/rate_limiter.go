package middleware

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"

	"github.com/gin-gonic/gin"
)

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type apiLimiter struct {
	mu       sync.Mutex
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	apiLimiters     sync.Map
	loginLimiters   sync.Map
	webhookLimiters sync.Map
	cleanupOnce     sync.Once
)

func init() {
	cleanupOnce.Do(func() {
		go cleanupLoop()
	})
}

func cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		now := time.Now()
		for _, m := range []*sync.Map{&apiLimiters, &loginLimiters, &webhookLimiters} {
			m.Range(func(key, value interface{}) bool {
				ip := key.(string)
				al := value.(*apiLimiter)
				al.mu.Lock()
				idle := now.Sub(al.lastSeen) > 10*time.Minute
				al.mu.Unlock()
				if idle {
					m.Delete(ip)
				}
				return true
			})
		}
	}
}

func getAPILimiter(ip string) *rate.Limiter {
	val, _ := apiLimiters.LoadOrStore(ip, &apiLimiter{
		limiter:  rate.NewLimiter(rate.Every(time.Second/5), 100),
		lastSeen: time.Now(),
	})
	al := val.(*apiLimiter)
	al.mu.Lock()
	al.lastSeen = time.Now()
	al.mu.Unlock()
	return al.limiter
}

func getLoginLimiter(ip string) *rate.Limiter {
	val, _ := loginLimiters.LoadOrStore(ip, &apiLimiter{
		limiter:  rate.NewLimiter(rate.Every(time.Second), 10),
		lastSeen: time.Now(),
	})
	al := val.(*apiLimiter)
	al.mu.Lock()
	al.lastSeen = time.Now()
	al.mu.Unlock()
	return al.limiter
}

func getWebhookLimiter(ip string) *rate.Limiter {
	val, _ := webhookLimiters.LoadOrStore(ip, &apiLimiter{
		limiter:  rate.NewLimiter(rate.Every(50*time.Millisecond), 40),
		lastSeen: time.Now(),
	})
	al := val.(*apiLimiter)
	al.mu.Lock()
	al.lastSeen = time.Now()
	al.mu.Unlock()
	return al.limiter
}

func APIRateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		limiter := getAPILimiter(ip)
		if !limiter.Allow() {
			c.Header("Retry-After", "5")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":       "Rate limit exceeded",
				"retry_after": 5,
			})
			return
		}
		c.Next()
	}
}

func LoginRateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		limiter := getLoginLimiter(ip)
		if !limiter.Allow() {
			c.Header("Retry-After", "30")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":       "Too many login attempts. Please try again later.",
				"retry_after": 30,
			})
			return
		}
		c.Next()
	}
}

func WebhookRateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		limiter := getWebhookLimiter(ip)
		if !limiter.Allow() {
			c.Header("Retry-After", "5")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error":       "Rate limit exceeded",
				"retry_after": 5,
			})
			return
		}
		c.Next()
	}
}
