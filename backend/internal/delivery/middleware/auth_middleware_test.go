package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/pkg/jwt"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// setupAuthTest membuat DB in-memory dengan 2 outlet dan user owner.
func setupAuthTest(t *testing.T, ownerOutletID uint) (*gorm.DB, string) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	jwt.Init("test-secret-a2", nil)

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.User{}, &models.Outlet{}))

	require.NoError(t, db.Create(&models.Outlet{Name: "Outlet Satu", Code: "satu"}).Error)
	require.NoError(t, db.Create(&models.Outlet{Name: "Outlet Dua", Code: "dua"}).Error)

	user := models.User{
		Name: "Owner", Email: "owner@test.local", Password: "x", Role: "owner", OutletID: ownerOutletID,
	}
	require.NoError(t, db.Create(&user).Error)

	token, err := jwt.GenerateToken(user.ID, user.Name, user.Email, user.Role, ownerOutletID)
	require.NoError(t, err)
	return db, token
}

func doAuthRequest(db *gorm.DB, token, headerOutlet string) (*httptest.ResponseRecorder, uint) {
	r := gin.New()
	var seenOutlet uint
	r.GET("/probe", AuthMiddleware(db), func(c *gin.Context) {
		v, _ := c.Get("outlet_id")
		seenOutlet, _ = v.(uint)
		c.JSON(http.StatusOK, gin.H{"outlet_id": seenOutlet})
	})

	req := httptest.NewRequest(http.MethodGet, "/probe", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	if headerOutlet != "" {
		req.Header.Set("X-Outlet-ID", headerOutlet)
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w, seenOutlet
}

// A2 regression: owner outlet 1 tidak boleh berpindah ke outlet 2.
func TestAuthMiddleware_RejectsOwnerOutletSwitch(t *testing.T) {
	db, token := setupAuthTest(t, 1)

	w, _ := doAuthRequest(db, token, "2")
	assert.Equal(t, http.StatusForbidden, w.Code)
}

// A2: owner boleh memakai outlet miliknya sendiri via header.
func TestAuthMiddleware_AllowsOwnerOwnOutlet(t *testing.T) {
	db, token := setupAuthTest(t, 1)

	w, seen := doAuthRequest(db, token, "1")
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, uint(1), seen)

	// Tanpa header → tetap outlet sendiri.
	w2, seen2 := doAuthRequest(db, token, "")
	assert.Equal(t, http.StatusOK, w2.Code)
	assert.Equal(t, uint(1), seen2)
}

// A2: owner global (outlet_id = 0) tetap boleh memilih outlet mana pun.
func TestAuthMiddleware_AllowsGlobalOwnerSwitch(t *testing.T) {
	db, token := setupAuthTest(t, 0)

	w, seen := doAuthRequest(db, token, "2")
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, uint(2), seen)
}

// A2: outlet yang tidak ada tetap ditolak.
func TestAuthMiddleware_RejectsUnknownOutlet(t *testing.T) {
	db, token := setupAuthTest(t, 0)

	w, _ := doAuthRequest(db, token, "99")
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
