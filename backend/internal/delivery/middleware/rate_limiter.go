package middleware

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"

	"github.com/gin-gonic/gin"
)

type apiLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

var (
	apiLimiters sync.Map
	cleanupOnce sync.Once
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
		apiLimiters.Range(func(key, value interface{}) bool {
			ip := key.(string)
			al := value.(*apiLimiter)
			if time.Since(al.lastSeen) > 10*time.Minute {
				apiLimiters.Delete(ip)
			}
			return true
		})
	}
}

func getAPILimiter(ip string) *rate.Limiter {
	val, _ := apiLimiters.LoadOrStore(ip, &apiLimiter{
		limiter:  rate.NewLimiter(rate.Every(time.Second/5), 100),
		lastSeen: time.Now(),
	})
	al := val.(*apiLimiter)
	al.lastSeen = time.Now()
	return al.limiter
}

func APIRateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		limiter := getAPILimiter(ip)
		if !limiter.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "Rate limit exceeded"})
			return
		}
		c.Next()
	}
}