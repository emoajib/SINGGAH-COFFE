package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestAPIRateLimiter(t *testing.T) {
	// Set gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a router
	r := gin.New()
	r.Use(APIRateLimiter())

	// Add a simple test endpoint
	r.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "ok"})
	})

	// Test normal requests (should pass)
	for i := 0; i < 5; i++ {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodGet, "/test", nil)
		req.RemoteAddr = "192.168.1.100:12345"
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code, "Request %d should succeed", i+1)
	}

	// Test that cleanup doesn't break anything
	time.Sleep(100 * time.Millisecond)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/test", nil)
	req.RemoteAddr = "192.168.1.100:12345"
	r.ServeHTTP(w, req)
	assert.Equal(t, http.StatusOK, w.Code, "Request after pause should succeed")
}

func TestAPIRateLimiterConcurrent(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(APIRateLimiter())
	r.GET("/concurrent", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	done := make(chan bool)
	for i := 0; i < 20; i++ {
		go func(id int) {
			w := httptest.NewRecorder()
			req, _ := http.NewRequest(http.MethodGet, "/concurrent", nil)
			req.RemoteAddr = "10.0.0.1:54321"
			r.ServeHTTP(w, req)
			assert.Contains(t, []int{http.StatusOK, http.StatusTooManyRequests}, w.Code)
			if w.Code == http.StatusTooManyRequests {
				assert.NotEmpty(t, w.Header().Get("Retry-After"))
			}
			done <- true
		}(i)
	}

	for i := 0; i < 20; i++ {
		<-done
	}
}