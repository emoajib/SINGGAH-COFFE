package handler

import (
	"strings"

	"github.com/gin-gonic/gin"
)

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
// getOutletID mengembalikan outlet_id dari context yang diatur oleh AuthMiddleware.
// Mengembalikan 0 jika tidak ditemukan — panggilan harus selalu berasal dari route
// yang已经 melalui AuthMiddleware (yang menyetel outlet_id selalu ada).
func getOutletID(c *gin.Context) uint {
	if id, exists := c.Get("outlet_id"); exists {
		if outletID, ok := id.(uint); ok {
			return outletID
		}
	}
	return 0
}

// idempotencyKeyFromHeader membaca header Idempotency-Key dari client.
// C4: mencegah mutasi stok ganda saat request di-retry (mis. antrean sync offline).
// Nilai dipangkas & dibatasi 191 karakter agar aman untuk kolom unique index.
func idempotencyKeyFromHeader(c *gin.Context) string {
	key := strings.TrimSpace(c.GetHeader("Idempotency-Key"))
	if len(key) > 191 {
		key = key[:191]
	}
	return key
}

func getUserID(c *gin.Context) (uint, bool) {
	if val, exists := c.Get("user_id"); exists {
		if uid, ok := val.(uint); ok {
			return uid, true
		}
	}
	return 0, false
}

func getUserName(c *gin.Context) string {
	if val, exists := c.Get("user_name"); exists {
		if name, ok := val.(string); ok {
			return name
		}
	}
	return ""
}

func getUserRole(c *gin.Context) string {
	if val, exists := c.Get("user_role"); exists {
		if role, ok := val.(string); ok {
			return role
		}
	}
	return ""
}

