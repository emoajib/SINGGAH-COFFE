package usecase

import (
	"encoding/json"
	"fmt"
	"math"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

var alwaysExcludedFromSharing = []string{
	"Operational", "Marketing", "Maintenance", "Misc",
}

type ProfitSharingUsecase struct {
	db            *gorm.DB
	periodRepo    repository.ProfitSharingPeriodRepository
	orderItemRepo repository.OrderItemRepository
	expenseRepo   repository.ExpenseRepository
	cashBookRepo  repository.CashBookRepository
}

func NewProfitSharingUsecase(db *gorm.DB) *ProfitSharingUsecase {
	return &ProfitSharingUsecase{
		db:            db,
		periodRepo:    postgres.NewProfitSharingPeriodRepository(db),
		orderItemRepo: postgres.NewOrderItemRepository(db),
		expenseRepo:   postgres.NewExpenseRepository(db),
		cashBookRepo:  postgres.NewCashBookRepository(db),
	}
}

func (uc *ProfitSharingUsecase) Preview(start, end string, outletID uint, ratio float64) (*entity.ProfitSharingPreview, error) {
	basis, err := uc.periodRepo.GetTotalRevenue(start, end, outletID)
	if err != nil {
		return nil, err
	}
	cogs, err := uc.orderItemRepo.GetTotalCogsRange(start, end, outletID)
	if err != nil {
		return nil, err
	}
	expenses, err := uc.periodRepo.GetTotalExpensesExcluding(start, end, alwaysExcludedFromSharing, outletID)
	if err != nil {
		return nil, err
	}
	grossMargin := basis - cogs
	netProfit := grossMargin - expenses // actual value (can be negative for display)
	netContrib := netProfit
	if netContrib < 0 {
		netContrib = 0
	}
	keeperAmount := math.Round(netContrib*ratio/100*100) / 100
	ownerAmount := netContrib - keeperAmount

	products, _ := uc.orderItemRepo.GetProductSalesVolume(start, end, outletID)
	perProduct := make([]entity.ProductSharingDetail, len(products))
	for i, p := range products {
		productCogs := p.AvgCost * float64(p.Quantity)
		perProduct[i] = entity.ProductSharingDetail{
			ProductID:   p.ProductID,
			ProductName: p.Name,
			Revenue:     p.Revenue,
			Cogs:        productCogs,
			GrossMargin: p.Revenue - productCogs,
		}
	}

	perProductJSON, _ := json.Marshal(perProduct)

	period := entity.ProfitSharingPeriod{
		OutletID:      outletID,
		PeriodStart:   parseDatePS(start),
		PeriodEnd:     parseDatePS(end),
		BasisAmount:   basis,
		TotalCogs:     cogs,
		TotalExpenses: expenses,
		NetProfit:     netContrib,
		Ratio:         ratio,
		KeeperAmount:  keeperAmount,
		OwnerAmount:   ownerAmount,
		Status:        "draft",
		PerProduct:    string(perProductJSON),
		TaxNote:       "Revenue sebelum pajak (10%) & service charge (5%)",
	}

	overlapping, _ := uc.periodRepo.FindOverlappingPeriod(outletID, parseDatePS(start), parseDatePS(end), 0)
	if overlapping != nil {
		period.ID = overlapping.ID
		if err := uc.periodRepo.Update(&period); err != nil {
			return nil, err
		}
	} else {
		if err := uc.periodRepo.Create(&period); err != nil {
			return nil, err
		}
	}

	return &entity.ProfitSharingPreview{
		Period: period,
		Calculation: entity.Calculation{
			BasisAmount:   basis,
			TotalCogs:     cogs,
			GrossProfit:   grossMargin,
			TotalExpenses: expenses,
			NetProfit:     netProfit, // actual value (can be negative)
			Ratio:         ratio,
			KeeperShare:   keeperAmount,
			OwnerShare:    ownerAmount,
			PerProduct:    perProduct,
			Status:        "draft",
			Note:          "Revenue sebelum pajak & service charge",
		},
	}, nil
}

func (uc *ProfitSharingUsecase) Finalize(id uint, ratio float64, outletID ...uint) error {
	if len(outletID) == 0 {
		return domainErrors.NewInvalidInputError("outlet ID required")
	}
	tx := uc.db.Begin()
	period, err := uc.periodRepo.FindByIDForUpdate(id, tx)
	if err != nil {
		tx.Rollback()
		return domainErrors.NewNotFoundError("periode")
	}
	if period.OutletID != outletID[0] {
		tx.Rollback()
		return domainErrors.NewUnauthorizedError("tidak punya akses ke periode ini")
	}
	if period.Status != "draft" {
		tx.Rollback()
		return domainErrors.NewInvalidInputError("hanya periode draft yang bisa di-finalize")
	}
	start := period.PeriodStart.Format("2006-01-02")
	end := period.PeriodEnd.Format("2006-01-02")

	basis, err := uc.periodRepo.GetTotalRevenue(start, end, outletID...)
	if err != nil {
		tx.Rollback()
		return err
	}
	cogs, err := uc.orderItemRepo.GetTotalCogsRange(start, end, outletID...)
	if err != nil {
		tx.Rollback()
		return err
	}
	expenses, err := uc.periodRepo.GetTotalExpensesExcluding(start, end, alwaysExcludedFromSharing, outletID...)
	if err != nil {
		tx.Rollback()
		return err
	}
	grossMargin := basis - cogs
	netProfit := grossMargin - expenses // actual value (can be negative for display)
	netContrib := netProfit
	if netContrib < 0 {
		netContrib = 0
	}
	keeperAmount := math.Round(netContrib*ratio/100*100) / 100
	ownerAmount := netContrib - keeperAmount

	products, _ := uc.orderItemRepo.GetProductSalesVolume(start, end, outletID...)
	perProduct := make([]entity.ProductSharingDetail, len(products))
	for i, p := range products {
		productCogs := p.AvgCost * float64(p.Quantity)
		perProduct[i] = entity.ProductSharingDetail{
			ProductID:   p.ProductID,
			ProductName: p.Name,
			Revenue:     p.Revenue,
			Cogs:        productCogs,
			GrossMargin: p.Revenue - productCogs,
		}
	}
	perProductJSON, _ := json.Marshal(perProduct)

	period.BasisAmount = basis
	period.TotalCogs = cogs
	period.TotalExpenses = expenses
	period.NetProfit = netProfit // actual value (can be negative)
	period.Ratio = ratio
	period.KeeperAmount = keeperAmount
	period.OwnerAmount = ownerAmount
	period.Status = "finalized"
	period.PerProduct = string(perProductJSON)
	period.TaxNote = "Revenue sebelum pajak (10%) & service charge (5%)"

	if err := tx.Save(period).Error; err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}

func (uc *ProfitSharingUsecase) MarkAsPaid(id uint, outletID ...uint) error {
	if len(outletID) == 0 {
		return domainErrors.NewInvalidInputError("outlet ID required")
	}
	existing, err := uc.periodRepo.FindByID(id)
	if err != nil {
		return domainErrors.NewNotFoundError("periode")
	}
	if existing.OutletID != outletID[0] {
		return domainErrors.NewUnauthorizedError("tidak punya akses ke periode ini")
	}
	if existing.Status != "finalized" {
		return domainErrors.NewInvalidInputError("hanya periode finalized yang bisa ditandai sebagai dibayar")
	}
	ref := fmt.Sprintf("profit-sharing:%d", existing.ID)
	exists, _ := uc.cashBookRepo.ExistsByReference(ref, outletID...)
	if exists {
		return nil
	}
	existing.Status = "paid"
	if err := uc.periodRepo.Update(existing); err != nil {
		return err
	}
	err = uc.cashBookRepo.Create(&entity.CashBook{
		OutletID:    outletID[0],
		Date:        time.Now(),
		Method:      "Lainnya",
		Type:        "expense",
		Amount:      existing.KeeperAmount,
		Description: fmt.Sprintf("Bagi hasil periode %s - %s", existing.PeriodStart.Format("02 Jan 2006"), existing.PeriodEnd.Format("02 Jan 2006")),
		Reference:   ref,
	})
	return err
}

func (uc *ProfitSharingUsecase) Recalculate(id uint, ratio float64, outletID ...uint) error {
	if len(outletID) == 0 {
		return domainErrors.NewInvalidInputError("outlet ID required")
	}
	existing, err := uc.periodRepo.FindByID(id)
	if err != nil {
		return domainErrors.NewNotFoundError("periode")
	}
	if existing.OutletID != outletID[0] {
		return domainErrors.NewUnauthorizedError("tidak punya akses ke periode ini")
	}
	if existing.Status == "paid" {
		return domainErrors.NewInvalidInputError("tidak bisa hitung ulang periode yang sudah dibayar")
	}
	start := existing.PeriodStart.Format("2006-01-02")
	end := existing.PeriodEnd.Format("2006-01-02")

	basis, err := uc.periodRepo.GetTotalRevenue(start, end, outletID...)
	if err != nil {
		return err
	}
	cogs, err := uc.orderItemRepo.GetTotalCogsRange(start, end, outletID...)
	if err != nil {
		return err
	}
	expenses, err := uc.periodRepo.GetTotalExpensesExcluding(start, end, alwaysExcludedFromSharing, outletID...)
	if err != nil {
		return err
	}
	grossMargin := basis - cogs
	netProfit := grossMargin - expenses // actual value (can be negative for display)
	netContrib := netProfit
	if netContrib < 0 {
		netContrib = 0
	}
	keeperAmount := math.Round(netContrib*ratio/100*100) / 100
	ownerAmount := netContrib - keeperAmount

	existing.BasisAmount = basis
	existing.TotalCogs = cogs
	existing.TotalExpenses = expenses
	existing.NetProfit = netProfit // actual value (can be negative)
	existing.Ratio = ratio
	existing.KeeperAmount = keeperAmount
	existing.OwnerAmount = ownerAmount
	existing.Status = "draft"

	return uc.periodRepo.Update(existing)
}

func (uc *ProfitSharingUsecase) Delete(id uint, outletID ...uint) error {
	if len(outletID) == 0 {
		return domainErrors.NewInvalidInputError("outlet ID required")
	}
	existing, err := uc.periodRepo.FindByID(id)
	if err != nil {
		return domainErrors.NewNotFoundError("periode")
	}
	if existing.OutletID != outletID[0] {
		return domainErrors.NewUnauthorizedError("tidak punya akses ke periode ini")
	}
	if existing.Status != "draft" {
		return domainErrors.NewInvalidInputError("hanya periode draft yang bisa dihapus")
	}
	return uc.periodRepo.Delete(id)
}

func (uc *ProfitSharingUsecase) GetAll(outletID ...uint) ([]entity.ProfitSharingPeriod, error) {
	return uc.periodRepo.FindAll(outletID...)
}

func parseDatePS(s string) time.Time {
	t, _ := time.Parse("2006-01-02", s)
	return t
}
