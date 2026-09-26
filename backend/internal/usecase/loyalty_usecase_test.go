// Vetted by AI - Manual Review Required by Senior Engineer/Manager
package usecase

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
)

func setupLoyaltyTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to database: " + err.Error())
	}
	db.AutoMigrate(
		&models.Customer{},
		&models.LoyaltyProgram{},
		&models.LoyaltyStamp{},
		&models.LoyaltyRedemption{},
		&models.CustomerFeedback{},
		&models.Expense{},
		&models.Setting{},
	)
	return db
}

func TestLoyaltyUsecase_FindOrCreateCustomer(t *testing.T) {
	db := setupLoyaltyTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := NewLoyaltyUsecase(db)

	cust, err := uc.FindOrCreateCustomer("+6281234567890", "Kak Rani", 1)
	assert.NoError(t, err)
	assert.NotNil(t, cust)
	assert.Equal(t, "081234567890", cust.Phone)
	assert.Equal(t, "Kak Rani", cust.Name)
	assert.NotEmpty(t, cust.LoyaltyToken)
	assert.Len(t, cust.LoyaltyToken, 12)

	// Memanggil lagi dengan nomor sama harus mengembalikan pelanggan yang sama
	sameCust, err := uc.FindOrCreateCustomer("0812-3456-7890", "", 1)
	assert.NoError(t, err)
	assert.Equal(t, cust.ID, sameCust.ID)
	assert.Equal(t, "Kak Rani", sameCust.Name)
}

func TestLoyaltyUsecase_StampsAndRedemptionFlow(t *testing.T) {
	db := setupLoyaltyTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := NewLoyaltyUsecase(db)

	// 1. Buat program loyalty: 3 stempel = 1 Kopi Gratis
	prog := &entity.LoyaltyProgram{
		OutletID:       1,
		Name:           "Kartu Kopi Singgah",
		ThresholdType:  "order_count",
		ThresholdValue: 3,
		RewardType:     "free_menu",
		RewardNote:     "Gratis 1 Kopi Susu",
		IsActive:       true,
	}
	err := uc.CreateProgram(prog)
	assert.NoError(t, err)

	// 2. Transaksi 1
	cust, err := uc.ProcessOrderLoyalty("08987654321", "Budi", 101, 25000, 1)
	assert.NoError(t, err)

	// Cek stempel via QR Card publik
	card, err := uc.GetPublicLoyaltyCard(cust.LoyaltyToken)
	assert.NoError(t, err)
	assert.Equal(t, "0898****321", card.PhoneMasked)
	assert.Len(t, card.Programs, 1)
	assert.Equal(t, 1, card.Programs[0].CurrentStamps)
	assert.False(t, card.Programs[0].IsEligible)

	// 3. Transaksi 2
	_, _ = uc.ProcessOrderLoyalty("08987654321", "Budi", 102, 30000, 1)

	// 4. Transaksi 3 (mencapai threshold 3 stempel)
	_, _ = uc.ProcessOrderLoyalty("08987654321", "Budi", 103, 20000, 1)

	cardAfter3, _ := uc.GetPublicLoyaltyCard(cust.LoyaltyToken)
	assert.Equal(t, 3, cardAfter3.Programs[0].CurrentStamps)
	assert.True(t, cardAfter3.Programs[0].IsEligible, "Pelanggan harus berhak klaim reward")

	// 5. Tukar Reward (Redeem)
	red, err := uc.RedeemReward(cust.ID, prog.ID, 1, "Kopi Susu Gula Aren", 15000, "Klaim reward 3 stempel", 1)
	assert.NoError(t, err)
	assert.NotNil(t, red)
	assert.Equal(t, 3, red.StampsUsed)

	// 6. Verifikasi stempel kembali ke 0 setelah penukaran
	cardAfterRedeem, _ := uc.GetPublicLoyaltyCard(cust.LoyaltyToken)
	assert.Equal(t, 0, cardAfterRedeem.Programs[0].CurrentStamps, "Stempel harus reset ke 0 setelah reward ditukar")
	assert.False(t, cardAfterRedeem.Programs[0].IsEligible)
}

func TestLoyaltyUsecase_CustomerFeedback(t *testing.T) {
	db := setupLoyaltyTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := NewLoyaltyUsecase(db)

	cust, _ := uc.FindOrCreateCustomer("081122334455", "Siti", 1)

	// Kirim feedback via QR token
	fb, err := uc.SubmitFeedback(cust.LoyaltyToken, 5, "minuman", "Kopi susunya enak banget, baristanya ramah!")
	assert.NoError(t, err)
	assert.Equal(t, 5, fb.Rating)
	assert.Equal(t, "new", fb.Status)

	// Owner membalas feedback
	err = uc.ReplyFeedback(fb.ID, "Terima kasih banyak Kak Siti, kami tunggu kedatangannya lagi!", 1)
	assert.NoError(t, err)

	feedbacks, err := uc.GetFeedbacks(10, 0, "", 1)
	assert.NoError(t, err)
	assert.Len(t, feedbacks, 1)
	assert.Equal(t, "replied", feedbacks[0].Status)
	assert.Contains(t, feedbacks[0].OwnerReply, "Terima kasih banyak")
}
