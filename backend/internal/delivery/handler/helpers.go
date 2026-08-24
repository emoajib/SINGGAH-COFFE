package handler

import (
	"github.com/gin-gonic/gin"
)

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func getOutletID(c *gin.Context) uint {
	if id, exists := c.Get("outlet_id"); exists {
		if outletID, ok := id.(uint); ok {
			return outletID
		}
	}
	return 0
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

