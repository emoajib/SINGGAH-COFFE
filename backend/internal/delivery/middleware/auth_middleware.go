package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"singgah-pos-backend/internal/pkg/jwt"
	"singgah-pos-backend/internal/repository/postgres"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

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
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Check if token is blacklisted (fail closed: reject on repo error)
		tokenBlacklistRepo := postgres.NewTokenBlacklistRepository(db)
		if isBlacklisted, err := tokenBlacklistRepo.IsTokenBlacklisted(tokenString); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to verify token"})
			c.Abort()
			return
		} else if isBlacklisted {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token has been revoked"})
			c.Abort()
			return
		}

			// Determine effective outlet_id
		outletID := claims.OutletID

		// Owner can override by passing X-Outlet-ID header
		if claims.Role == "owner" {
			headerOutlet := c.GetHeader("X-Outlet-ID")
			if headerOutlet != "" {
				var parsedID uint
				if _, err := fmt.Sscanf(headerOutlet, "%d", &parsedID); err == nil && parsedID > 0 {
					outletID = parsedID
				}
			}
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

		for _, role := range allowedRoles {
			if roleStr == role {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden: Insufficient permissions"})
		c.Abort()
	}
}
