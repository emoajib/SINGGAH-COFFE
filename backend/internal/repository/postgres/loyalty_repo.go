// Vetted by AI - Manual Review Required by Senior Engineer/Manager
package postgres

import (
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"
	"singgah-pos-backend/internal/repository"

	"gorm.io/gorm"
)

// ================= CUSTOMER REPOSITORY =================

type customerRepository struct {
	db *gorm.DB
}

func NewCustomerRepository(db *gorm.DB) repository.CustomerRepository {
	return &customerRepository{db: db}
}

func (r *customerRepository) FindByID(id uint) (*entity.Customer, error) {
	var m models.Customer
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainCustomer(&m), nil
}

func (r *customerRepository) FindByPhone(phone string, outletID ...uint) (*entity.Customer, error) {
	var m models.Customer
	tx := r.db.Where("phone = ?", phone)
	tx = scopeOutlet(tx, "customers", outletID...)
	if err := tx.First(&m).Error; err != nil {
		return nil, err
	}
	return toDomainCustomer(&m), nil
}

func (r *customerRepository) FindByToken(token string) (*entity.Customer, error) {
	var m models.Customer
	if err := r.db.Where("loyalty_token = ?", token).First(&m).Error; err != nil {
		return nil, err
	}
	return toDomainCustomer(&m), nil
}

func (r *customerRepository) FindAll(limit, offset int, outletID ...uint) ([]entity.Customer, error) {
	var ms []models.Customer
	tx := r.db.Order("total_orders desc").Limit(limit).Offset(offset)
	tx = scopeOutlet(tx, "customers", outletID...)
	if err := tx.Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.Customer, len(ms))
	for i, m := range ms {
		result[i] = *toDomainCustomer(&m)
	}
	return result, nil
}

func (r *customerRepository) Create(c *entity.Customer) error {
	m := toModelCustomer(c)
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	c.ID = m.ID
	c.CreatedAt = m.CreatedAt
	return nil
}

func (r *customerRepository) Update(c *entity.Customer) error {
	m := toModelCustomer(c)
	m.ID = c.ID
	return r.db.Save(m).Error
}

func (r *customerRepository) IncrementStats(id uint, spend float64) error {
	now := time.Now()
	return r.db.Model(&models.Customer{}).Where("id = ?", id).Updates(map[string]interface{}{
		"total_orders": gorm.Expr("total_orders + 1"),
		"total_spend":  gorm.Expr("total_spend + ?", spend),
		"last_visit":   &now,
		"updated_at":   now,
	}).Error
}

// ================= LOYALTY REPOSITORY =================

type loyaltyRepository struct {
	db *gorm.DB
}

func NewLoyaltyRepository(db *gorm.DB) repository.LoyaltyRepository {
	return &loyaltyRepository{db: db}
}

func (r *loyaltyRepository) FindPrograms(outletID ...uint) ([]entity.LoyaltyProgram, error) {
	var ms []models.LoyaltyProgram
	tx := r.db.Order("created_at desc")
	tx = scopeOutlet(tx, "loyalty_programs", outletID...)
	if err := tx.Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.LoyaltyProgram, len(ms))
	for i, m := range ms {
		result[i] = *toDomainLoyaltyProgram(&m)
	}
	return result, nil
}

func (r *loyaltyRepository) FindActivePrograms(outletID ...uint) ([]entity.LoyaltyProgram, error) {
	var ms []models.LoyaltyProgram
	tx := r.db.Where("is_active = ?", true).Order("created_at asc")
	tx = scopeOutlet(tx, "loyalty_programs", outletID...)
	if err := tx.Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.LoyaltyProgram, len(ms))
	for i, m := range ms {
		result[i] = *toDomainLoyaltyProgram(&m)
	}
	return result, nil
}

func (r *loyaltyRepository) FindProgramByID(id uint) (*entity.LoyaltyProgram, error) {
	var m models.LoyaltyProgram
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainLoyaltyProgram(&m), nil
}

func (r *loyaltyRepository) CreateProgram(p *entity.LoyaltyProgram) error {
	m := toModelLoyaltyProgram(p)
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	p.ID = m.ID
	p.CreatedAt = m.CreatedAt
	return nil
}

func (r *loyaltyRepository) UpdateProgram(p *entity.LoyaltyProgram) error {
	m := toModelLoyaltyProgram(p)
	m.ID = p.ID
	return r.db.Save(m).Error
}

func (r *loyaltyRepository) AddStamp(s *entity.LoyaltyStamp) error {
	m := &models.LoyaltyStamp{
		CustomerID:   s.CustomerID,
		ProgramID:    s.ProgramID,
		OrderID:      s.OrderID,
		StampValue:   s.StampValue,
		StampDate:    s.StampDate,
		IsUsed:       s.IsUsed,
		RedemptionID: s.RedemptionID,
		OutletID:     s.OutletID,
	}
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	s.ID = m.ID
	return nil
}

func (r *loyaltyRepository) CountActiveStamps(customerID, programID uint) (int, error) {
	var count int64
	err := r.db.Model(&models.LoyaltyStamp{}).
		Where("customer_id = ? AND program_id = ? AND is_used = ?", customerID, programID, false).
		Count(&count).Error
	return int(count), err
}

func (r *loyaltyRepository) MarkStampsUsed(customerID, programID, redemptionID uint, count int) error {
	var stampIDs []uint
	if err := r.db.Model(&models.LoyaltyStamp{}).
		Where("customer_id = ? AND program_id = ? AND is_used = ?", customerID, programID, false).
		Order("stamp_date asc").
		Limit(count).
		Pluck("id", &stampIDs).Error; err != nil {
		return err
	}

	if len(stampIDs) == 0 {
		return nil
	}

	return r.db.Model(&models.LoyaltyStamp{}).
		Where("id IN ?", stampIDs).
		Updates(map[string]interface{}{
			"is_used":       true,
			"redemption_id": redemptionID,
		}).Error
}

func (r *loyaltyRepository) CreateRedemption(red *entity.LoyaltyRedemption) error {
	m := &models.LoyaltyRedemption{
		CustomerID:    red.CustomerID,
		ProgramID:     red.ProgramID,
		OrderID:       red.OrderID,
		CashierID:     red.CashierID,
		RewardType:    red.RewardType,
		RewardDetail:  red.RewardDetail,
		RedeemedValue: red.RedeemedValue,
		StampsUsed:    red.StampsUsed,
		RedeemedAt:    red.RedeemedAt,
		Notes:         red.Notes,
		ExpenseID:     red.ExpenseID,
		OutletID:      red.OutletID,
	}
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	red.ID = m.ID
	return nil
}

func (r *loyaltyRepository) GetCustomerRedemptions(customerID uint) ([]entity.LoyaltyRedemption, error) {
	var ms []models.LoyaltyRedemption
	if err := r.db.Where("customer_id = ?", customerID).Order("redeemed_at desc").Find(&ms).Error; err != nil {
		return nil, err
	}
	res := make([]entity.LoyaltyRedemption, len(ms))
	for i, m := range ms {
		res[i] = entity.LoyaltyRedemption{
			ID:            m.ID,
			CustomerID:    m.CustomerID,
			ProgramID:     m.ProgramID,
			OrderID:       m.OrderID,
			CashierID:     m.CashierID,
			RewardType:    m.RewardType,
			RewardDetail:  m.RewardDetail,
			RedeemedValue: m.RedeemedValue,
			StampsUsed:    m.StampsUsed,
			RedeemedAt:    m.RedeemedAt,
			Notes:         m.Notes,
			ExpenseID:     m.ExpenseID,
			OutletID:      m.OutletID,
		}
	}
	return res, nil
}

// ================= FEEDBACK REPOSITORY =================

type feedbackRepository struct {
	db *gorm.DB
}

func NewFeedbackRepository(db *gorm.DB) repository.FeedbackRepository {
	return &feedbackRepository{db: db}
}

func (r *feedbackRepository) Create(f *entity.CustomerFeedback) error {
	m := &models.CustomerFeedback{
		CustomerID:   f.CustomerID,
		OutletID:     f.OutletID,
		LoyaltyToken: f.LoyaltyToken,
		Rating:       f.Rating,
		Category:     f.Category,
		Message:      f.Message,
		OwnerReply:   f.OwnerReply,
		RepliedBy:    f.RepliedBy,
		RepliedAt:    f.RepliedAt,
		Status:       f.Status,
		IsPublic:     f.IsPublic,
		SubmittedAt:  f.SubmittedAt,
		VisitDate:    f.VisitDate,
		OrderID:      f.OrderID,
	}
	if err := r.db.Create(m).Error; err != nil {
		return err
	}
	f.ID = m.ID
	return nil
}

func (r *feedbackRepository) FindAll(limit, offset int, status string, outletID ...uint) ([]entity.CustomerFeedback, error) {
	var ms []models.CustomerFeedback
	tx := r.db.Order("submitted_at desc").Limit(limit).Offset(offset)
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
	tx = scopeOutlet(tx, "customer_feedbacks", outletID...)
	if err := tx.Find(&ms).Error; err != nil {
		return nil, err
	}
	res := make([]entity.CustomerFeedback, len(ms))
	for i, m := range ms {
		res[i] = *toDomainCustomerFeedback(&m)
	}
	return res, nil
}

func (r *feedbackRepository) FindByID(id uint) (*entity.CustomerFeedback, error) {
	var m models.CustomerFeedback
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainCustomerFeedback(&m), nil
}

func (r *feedbackRepository) FindByToken(token string, limit int) ([]entity.CustomerFeedback, error) {
	var ms []models.CustomerFeedback
	tx := r.db.Where("loyalty_token = ?", token).Order("submitted_at desc").Limit(limit)
	if err := tx.Find(&ms).Error; err != nil {
		return nil, err
	}
	res := make([]entity.CustomerFeedback, len(ms))
	for i, m := range ms {
		res[i] = *toDomainCustomerFeedback(&m)
	}
	return res, nil
}

func (r *feedbackRepository) Reply(id uint, reply string, repliedBy uint) error {
	now := time.Now()
	return r.db.Model(&models.CustomerFeedback{}).Where("id = ?", id).Updates(map[string]interface{}{
		"owner_reply": reply,
		"replied_by":  repliedBy,
		"replied_at":  &now,
		"status":      "replied",
	}).Error
}

func (r *feedbackRepository) GetAverageRating(outletID ...uint) (float64, int64, error) {
	var avg float64
	var count int64
	tx := r.db.Model(&models.CustomerFeedback{})
	tx = scopeOutlet(tx, "customer_feedbacks", outletID...)
	if err := tx.Count(&count).Error; err != nil {
		return 0, 0, err
	}
	if count == 0 {
		return 5.0, 0, nil
	}
	if err := tx.Select("COALESCE(AVG(rating), 5.0)").Row().Scan(&avg); err != nil {
		return 0, 0, err
	}
	return avg, count, nil
}

// ================= CONVERSIONS =================

func toDomainCustomer(m *models.Customer) *entity.Customer {
	return &entity.Customer{
		ID:            m.ID,
		OutletID:      m.OutletID,
		Phone:         m.Phone,
		Name:          m.Name,
		Email:         m.Email,
		BirthDate:     m.BirthDate,
		TotalOrders:   m.TotalOrders,
		TotalSpend:    m.TotalSpend,
		AvgOrderValue: m.AvgOrderValue,
		FirstVisit:    m.FirstVisit,
		LastVisit:     m.LastVisit,
		LoyaltyToken:  m.LoyaltyToken,
		Tier:          m.Tier,
		Tags:          m.Tags,
		InternalNotes: m.InternalNotes,
		IsActive:      m.IsActive,
		CreatedBy:     m.CreatedBy,
		CreatedAt:     m.CreatedAt,
		UpdatedAt:     m.UpdatedAt,
	}
}

func toModelCustomer(c *entity.Customer) *models.Customer {
	return &models.Customer{
		OutletID:      c.OutletID,
		Phone:         c.Phone,
		Name:          c.Name,
		Email:         c.Email,
		BirthDate:     c.BirthDate,
		TotalOrders:   c.TotalOrders,
		TotalSpend:    c.TotalSpend,
		AvgOrderValue: c.AvgOrderValue,
		FirstVisit:    c.FirstVisit,
		LastVisit:     c.LastVisit,
		LoyaltyToken:  c.LoyaltyToken,
		Tier:          c.Tier,
		Tags:          c.Tags,
		InternalNotes: c.InternalNotes,
		IsActive:      c.IsActive,
		CreatedBy:     c.CreatedBy,
	}
}

func toDomainLoyaltyProgram(m *models.LoyaltyProgram) *entity.LoyaltyProgram {
	return &entity.LoyaltyProgram{
		ID:                 m.ID,
		OutletID:           m.OutletID,
		Name:               m.Name,
		Description:        m.Description,
		ThresholdType:      m.ThresholdType,
		ThresholdValue:     m.ThresholdValue,
		RewardType:         m.RewardType,
		RewardNote:         m.RewardNote,
		EligibleProductIDs: m.EligibleProductIDs,
		MaxProductPrice:    m.MaxProductPrice,
		SouvenirProductIDs: m.SouvenirProductIDs,
		DiscountPct:        m.DiscountPct,
		DiscountMax:        m.DiscountMax,
		IsActive:           m.IsActive,
		ValidFrom:          m.ValidFrom,
		ValidUntil:         m.ValidUntil,
		MaxRedemptions:     m.MaxRedemptions,
		CreatedAt:          m.CreatedAt,
		UpdatedAt:          m.UpdatedAt,
	}
}

func toModelLoyaltyProgram(p *entity.LoyaltyProgram) *models.LoyaltyProgram {
	return &models.LoyaltyProgram{
		OutletID:           p.OutletID,
		Name:               p.Name,
		Description:        p.Description,
		ThresholdType:      p.ThresholdType,
		ThresholdValue:     p.ThresholdValue,
		RewardType:         p.RewardType,
		RewardNote:         p.RewardNote,
		EligibleProductIDs: p.EligibleProductIDs,
		MaxProductPrice:    p.MaxProductPrice,
		SouvenirProductIDs: p.SouvenirProductIDs,
		DiscountPct:        p.DiscountPct,
		DiscountMax:        p.DiscountMax,
		IsActive:           p.IsActive,
		ValidFrom:          p.ValidFrom,
		ValidUntil:         p.ValidUntil,
		MaxRedemptions:     p.MaxRedemptions,
	}
}

func toDomainCustomerFeedback(m *models.CustomerFeedback) *entity.CustomerFeedback {
	return &entity.CustomerFeedback{
		ID:           m.ID,
		CustomerID:   m.CustomerID,
		OutletID:     m.OutletID,
		LoyaltyToken: m.LoyaltyToken,
		Rating:       m.Rating,
		Category:     m.Category,
		Message:      m.Message,
		OwnerReply:   m.OwnerReply,
		RepliedBy:    m.RepliedBy,
		RepliedAt:    m.RepliedAt,
		Status:       m.Status,
		IsPublic:     m.IsPublic,
		SubmittedAt:  m.SubmittedAt,
		VisitDate:    m.VisitDate,
		OrderID:      m.OrderID,
	}
}
