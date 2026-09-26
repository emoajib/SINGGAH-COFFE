// Vetted by AI - Manual Review Required by Senior Engineer/Manager
package usecase

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"strings"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type LoyaltyUsecase struct {
	db           *gorm.DB
	customerRepo repository.CustomerRepository
	loyaltyRepo  repository.LoyaltyRepository
	feedbackRepo repository.FeedbackRepository
	expenseRepo  repository.ExpenseRepository
	settingRepo  repository.SettingRepository
}

func NewLoyaltyUsecase(db *gorm.DB) *LoyaltyUsecase {
	return &LoyaltyUsecase{
		db:           db,
		customerRepo: postgres.NewCustomerRepository(db),
		loyaltyRepo:  postgres.NewLoyaltyRepository(db),
		feedbackRepo: postgres.NewFeedbackRepository(db),
		expenseRepo:  postgres.NewExpenseRepository(db),
		settingRepo:  postgres.NewSettingRepository(db),
	}
}

// Generate token unik 12 karakter alphanumeric untuk URL QR kartu pelanggan (/loyalty/TOKEN)
func GenerateLoyaltyToken() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 12)
	for i := range b {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		b[i] = chars[num.Int64()]
	}
	return string(b)
}

func CleanPhoneNumber(phone string) string {
	clean := strings.TrimSpace(phone)
	clean = strings.ReplaceAll(clean, "-", "")
	clean = strings.ReplaceAll(clean, " ", "")
	if strings.HasPrefix(clean, "+62") {
		clean = "0" + clean[3:]
	} else if strings.HasPrefix(clean, "62") {
		clean = "0" + clean[2:]
	}
	return clean
}

func MaskPhoneNumber(phone string) string {
	if len(phone) < 8 {
		return phone
	}
	prefix := phone[:4]
	suffix := phone[len(phone)-3:]
	return prefix + "****" + suffix
}

func (uc *LoyaltyUsecase) FindOrCreateCustomer(phone, name string, outletID uint) (*entity.Customer, error) {
	cleanPhone := CleanPhoneNumber(phone)
	if cleanPhone == "" {
		return nil, domainErrors.NewInvalidInputError("nomor HP pelanggan tidak boleh kosong")
	}

	existing, err := uc.customerRepo.FindByPhone(cleanPhone, outletID)
	if err == nil && existing != nil {
		if name != "" && (existing.Name == "" || existing.Name == "Pelanggan") {
			existing.Name = name
			_ = uc.customerRepo.Update(existing)
		}
		return existing, nil
	}

	now := time.Now()
	cust := &entity.Customer{
		OutletID:     outletID,
		Phone:        cleanPhone,
		Name:         name,
		LoyaltyToken: GenerateLoyaltyToken(),
		Tier:         "regular",
		FirstVisit:   &now,
		LastVisit:    &now,
		IsActive:     true,
	}
	if err := uc.customerRepo.Create(cust); err != nil {
		return nil, err
	}
	return cust, nil
}

func (uc *LoyaltyUsecase) AddStampsForOrder(order *entity.Order) error {
	if order == nil || order.CustomerName == "" && order.PaymentStatus != "Paid" {
		return nil
	}

	phone := CleanPhoneNumber(order.OrderNumber) // fallback if not available
	_ = phone

	return nil
}

// ProcessOrderLoyalty menangani penambahan stempel dari transaksi kasir
func (uc *LoyaltyUsecase) ProcessOrderLoyalty(phone, name string, orderID uint, amount float64, outletID uint) (*entity.Customer, error) {
	if phone == "" {
		return nil, nil
	}

	customer, err := uc.FindOrCreateCustomer(phone, name, outletID)
	if err != nil {
		return nil, err
	}

	// Update customer stats
	_ = uc.customerRepo.IncrementStats(customer.ID, amount)

	// Tambahkan stempel untuk semua program aktif
	activePrograms, err := uc.loyaltyRepo.FindActivePrograms(outletID)
	if err == nil {
		now := time.Now()
		for _, prog := range activePrograms {
			stamp := &entity.LoyaltyStamp{
				CustomerID: customer.ID,
				ProgramID:  prog.ID,
				OrderID:    orderID,
				StampValue: 1, // 1 order = 1 stempel
				StampDate:  now,
				IsUsed:     false,
				OutletID:   outletID,
			}
			_ = uc.loyaltyRepo.AddStamp(stamp)
		}
	}

	return customer, nil
}

// GetPublicLoyaltyCard mengembalikan data kartu stempel untuk scan QR pelanggan publik (tanpa login kasir)
func (uc *LoyaltyUsecase) GetPublicLoyaltyCard(token string) (*entity.PublicLoyaltyCardResponse, error) {
	customer, err := uc.customerRepo.FindByToken(token)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("kartu loyalitas pelanggan tidak ditemukan")
	}

	activePrograms, err := uc.loyaltyRepo.FindActivePrograms(customer.OutletID)
	if err != nil {
		activePrograms = []entity.LoyaltyProgram{}
	}

	var progResponses []entity.ProgramProgressResponse
	for _, p := range activePrograms {
		stamps, _ := uc.loyaltyRepo.CountActiveStamps(customer.ID, p.ID)
		thresh := int(p.ThresholdValue)
		if thresh <= 0 {
			thresh = 10
		}
		progress := float64(stamps) / float64(thresh) * 100
		if progress > 100 {
			progress = 100
		}

		progResponses = append(progResponses, entity.ProgramProgressResponse{
			ProgramID:       p.ID,
			ProgramName:     p.Name,
			RewardNote:      p.RewardNote,
			RewardType:      p.RewardType,
			CurrentStamps:   stamps,
			ThresholdValue:  thresh,
			IsEligible:      stamps >= thresh,
			ProgressPercent: progress,
		})
	}

	// Ambil masukan feedback publik
	feedbacks, _ := uc.feedbackRepo.FindByToken(token, 5)
	var fbList []entity.FeedbackPublicResponse
	for _, f := range feedbacks {
		fbList = append(fbList, entity.FeedbackPublicResponse{
			Rating:      f.Rating,
			Message:     f.Message,
			OwnerReply:  f.OwnerReply,
			SubmittedAt: f.SubmittedAt,
		})
	}

	outletName := "Singgah Coffee"
	if s, err := uc.settingRepo.FindByKey("outlet_name"); err == nil && s.Value != "" {
		outletName = s.Value
	}

	outletLogoURL := ""
	if s, err := uc.settingRepo.FindByKey("outlet_logo_url"); err == nil && s.Value != "" {
		outletLogoURL = s.Value
	}

	displayName := customer.Name
	if displayName == "" {
		displayName = "Pelanggan Setia"
	}

	return &entity.PublicLoyaltyCardResponse{
		CustomerName:   displayName,
		PhoneMasked:    MaskPhoneNumber(customer.Phone),
		TotalOrders:    customer.TotalOrders,
		Tier:           customer.Tier,
		Programs:       progResponses,
		OutletName:     outletName,
		OutletLogoURL:  outletLogoURL,
		RecentFeedback: fbList,
	}, nil
}

// RedeemReward menukarkan stempel dengan reward dan mencatat expense marketing
func (uc *LoyaltyUsecase) RedeemReward(customerID, programID, cashierID uint, rewardDetail string, rewardCost float64, notes string, outletID uint) (*entity.LoyaltyRedemption, error) {
	program, err := uc.loyaltyRepo.FindProgramByID(programID)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("program loyalitas")
	}

	thresh := int(program.ThresholdValue)
	currentStamps, err := uc.loyaltyRepo.CountActiveStamps(customerID, programID)
	if err != nil || currentStamps < thresh {
		return nil, domainErrors.NewInvalidInputError(fmt.Sprintf("stempel belum cukup (%d/%d)", currentStamps, thresh))
	}

	var red *entity.LoyaltyRedemption

	err = uc.db.Transaction(func(tx *gorm.DB) error {
		loyaltyRepoTx := postgres.NewLoyaltyRepository(tx)
		expenseRepoTx := postgres.NewExpenseRepository(tx)

		now := time.Now()
		var expenseID uint = 0

		// Jika reward memiliki biaya HPP (misal menu gratis atau souvenir), catat sebagai beban Marketing
		if rewardCost > 0 {
			exp := &entity.Expense{
				Title:         fmt.Sprintf("Loyalty Reward: %s", rewardDetail),
				Amount:        rewardCost,
				Category:      "Marketing",
				CostType:      "variable",
				PaymentMethod: "Lainnya",
				Date:          now,
				Description:   fmt.Sprintf("Redeem reward program %s (%d stempel)", program.Name, thresh),
				Notes:         notes,
				OutletID:      outletID,
			}
			if err := expenseRepoTx.Create(exp); err == nil {
				expenseID = exp.ID
			}
		}

		red = &entity.LoyaltyRedemption{
			CustomerID:    customerID,
			ProgramID:     programID,
			CashierID:     cashierID,
			RewardType:    program.RewardType,
			RewardDetail:  rewardDetail,
			RedeemedValue: rewardCost,
			StampsUsed:    thresh,
			RedeemedAt:    now,
			Notes:         notes,
			ExpenseID:     expenseID,
			OutletID:      outletID,
		}

		if err := loyaltyRepoTx.CreateRedemption(red); err != nil {
			return err
		}

		// Reset stempel pelanggan sebanyak threshold (1 order = 1 stempel, kembali ke 0)
		return loyaltyRepoTx.MarkStampsUsed(customerID, programID, red.ID, thresh)
	})

	if err != nil {
		return nil, err
	}
	return red, nil
}

// SubmitFeedback mengirimkan kritik dan saran dari pelanggan via QR page
func (uc *LoyaltyUsecase) SubmitFeedback(token string, rating int, category, message string) (*entity.CustomerFeedback, error) {
	if rating < 1 || rating > 5 {
		return nil, domainErrors.NewInvalidInputError("rating harus antara 1 sampai 5")
	}
	cleanMsg := strings.TrimSpace(message)
	if cleanMsg == "" {
		return nil, domainErrors.NewInvalidInputError("pesan saran tidak boleh kosong")
	}
	if len(cleanMsg) > 500 {
		cleanMsg = cleanMsg[:500]
	}

	customer, err := uc.customerRepo.FindByToken(token)
	var customerID uint = 0
	var outletID uint = 0
	if err == nil && customer != nil {
		customerID = customer.ID
		outletID = customer.OutletID
	}

	fb := &entity.CustomerFeedback{
		CustomerID:   customerID,
		OutletID:     outletID,
		LoyaltyToken: token,
		Rating:       rating,
		Category:     category,
		Message:      cleanMsg,
		Status:       "new",
		SubmittedAt:  time.Now(),
	}

	if err := uc.feedbackRepo.Create(fb); err != nil {
		return nil, err
	}
	return fb, nil
}

func (uc *LoyaltyUsecase) GetFeedbacks(limit, offset int, status string, outletID ...uint) ([]entity.CustomerFeedback, error) {
	return uc.feedbackRepo.FindAll(limit, offset, status, outletID...)
}

func (uc *LoyaltyUsecase) ReplyFeedback(id uint, reply string, repliedBy uint) error {
	cleanReply := strings.TrimSpace(reply)
	if cleanReply == "" {
		return domainErrors.NewInvalidInputError("balasan tidak boleh kosong")
	}
	return uc.feedbackRepo.Reply(id, cleanReply, repliedBy)
}

func (uc *LoyaltyUsecase) GetPrograms(outletID ...uint) ([]entity.LoyaltyProgram, error) {
	return uc.loyaltyRepo.FindPrograms(outletID...)
}

func (uc *LoyaltyUsecase) CreateProgram(p *entity.LoyaltyProgram) error {
	if p.Name == "" {
		return domainErrors.NewInvalidInputError("nama program tidak boleh kosong")
	}
	if p.ThresholdValue <= 0 {
		p.ThresholdValue = 10
	}
	return uc.loyaltyRepo.CreateProgram(p)
}

func (uc *LoyaltyUsecase) UpdateProgram(p *entity.LoyaltyProgram) error {
	return uc.loyaltyRepo.UpdateProgram(p)
}

func (uc *LoyaltyUsecase) GetCustomers(limit, offset int, outletID ...uint) ([]entity.Customer, error) {
	return uc.customerRepo.FindAll(limit, offset, outletID...)
}
