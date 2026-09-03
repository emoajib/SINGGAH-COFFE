package middleware

import (
	"net/http"
	"strconv"
	"strings"

	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/pkg/jwt"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
func AuthMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		claims, err := jwt.ValidateToken(tokenString)
		if err != nil {
			if err.Error() == "token has been revoked" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Token has been revoked"})
			} else if err.Error() == "unable to verify token" {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to verify token"})
			} else {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			}
			c.Abort()
			return
		}

		outletID := claims.OutletID

		if claims.Role == "owner" {
			headerOutlet := c.GetHeader("X-Outlet-ID")
			if headerOutlet != "" {
				parsedID, err := strconv.ParseUint(strings.TrimSpace(headerOutlet), 10, 64)
				if err != nil || parsedID == 0 {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid X-Outlet-ID header"})
					c.Abort()
					return
				}
				var exists int64
				if err := db.Model(&models.Outlet{}).Where("id = ?", parsedID).Count(&exists).Error; err != nil || exists == 0 {
					c.JSON(http.StatusBadRequest, gin.H{"error": "Outlet not found"})
					c.Abort()
					return
				}
				outletID = uint(parsedID)
			}
		} else if outletID == 0 {
			var defID uint
			if err := db.Model(&models.Outlet{}).Order("id ASC").Limit(1).Pluck("id", &defID).Error; err != nil || defID == 0 {
				c.JSON(http.StatusForbidden, gin.H{"error": "No outlet is assigned to your account"})
				c.Abort()
				return
			}
			outletID = defID
		}

		c.Set("user_id", claims.UserID)
		c.Set("user_name", claims.Name)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Set("outlet_id", outletID)
		c.Next()
	}
}

func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		roleStr, ok := userRole.(string)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid role type"})
			c.Abort()
			return
		}

		userRoleClean := strings.ToLower(strings.TrimSpace(roleStr))
		for _, role := range allowedRoles {
			if userRoleClean == strings.ToLower(strings.TrimSpace(role)) {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: Insufficient permissions"})
		c.Abort()
	}
}
