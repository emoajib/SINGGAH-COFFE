package handler

import (
	"github.com/gin-gonic/gin"
)

func getOutletID(c *gin.Context) uint {
	if id, exists := c.Get("outlet_id"); exists {
		if outletID, ok := id.(uint); ok {
			return outletID
		}
	}
	return 0
}
