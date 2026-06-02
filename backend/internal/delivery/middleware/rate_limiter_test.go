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