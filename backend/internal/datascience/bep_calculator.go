package datascience

import (
	"math"

	"singgah-pos-backend/internal/domain/entity"
)

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
// Technical Assumptions:
// - Variable cost per unit = weighted average HPP from actual sales
// - Fixed costs = all expenses with CostType = "fixed"
// - BEP assumes linear contribution margin within current production capacity
// - Contribution Margin Ratio = 1 - (VariableCost / SellingPrice)
// - Margin of Safety = (Actual Revenue - BEP Revenue) / Actual Revenue

// BEPCalculator performs core BEP calculations
type BEPCalculator struct {
	TotalRevenue      float64
	TotalVariableCost float64
	TotalFixedCost    float64
	AvgSellingPrice   float64
	AvgVariableCost   float64
	DaysInPeriod      int
}

// Calculate returns the deterministic BEP report
func (c *BEPCalculator) Calculate(products []entity.ProductSalesVolume) *entity.BEPReport {
	if c.TotalRevenue <= 0 || c.AvgSellingPrice <= 0 {
		return &entity.BEPReport{
			Status: "KRITIS",
		}
	}

	contributionMargin := c.TotalRevenue - c.TotalVariableCost
	cmRatio := contributionMargin / c.TotalRevenue

	var bepUnits, bepRevenue float64
	if cmRatio > 0 && c.TotalFixedCost > 0 {
		bepRevenue = c.TotalFixedCost / cmRatio
	}
	cmPerUnit := c.AvgSellingPrice - c.AvgVariableCost
	if cmPerUnit > 0 && c.TotalFixedCost > 0 {
		bepUnits = c.TotalFixedCost / cmPerUnit
	}

	days := c.DaysInPeriod
	if days <= 0 {
		days = 30
	}
	bepDailyUnits := 0.0
	if bepUnits > 0 {
		bepDailyUnits = bepUnits / float64(days)
	}

	dailyAvg := 0.0
	if days > 0 {
		dailyAvg = c.TotalRevenue / float64(days)
	}

	marginOfSafety := 0.0
	if c.TotalRevenue > 0 {
		marginOfSafety = ((c.TotalRevenue - bepRevenue) / c.TotalRevenue) * 100
	}

	status := c.determineStatus(marginOfSafety, dailyAvg, bepDailyUnits)

	productMargins := c.calculateProductMargins(products)

	return &entity.BEPReport{
		TotalRevenue:       c.TotalRevenue,
		TotalVariableCost:  c.TotalVariableCost,
		TotalFixedCost:     c.TotalFixedCost,
		ContributionMargin: contributionMargin,
		CMRatio:            cmRatio,
		AvgSellingPrice:    c.AvgSellingPrice,
		AvgVariableCost:    c.AvgVariableCost,
		BEPUnits:           math.Ceil(bepUnits),
		BEPRevenue:         math.Ceil(bepRevenue),
		BEPDailyUnits:      math.Ceil(bepDailyUnits),
		MarginOfSafety:     math.Round(marginOfSafety*100) / 100,
		DailyTarget:        math.Ceil(bepDailyUnits * c.AvgSellingPrice),
		CurrentDailyAvg:    math.Ceil(dailyAvg),
		Status:             status,
		PerProduct:         productMargins,
	}
}

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (c *BEPCalculator) determineStatus(marginOfSafety, dailyAvg, bepDaily float64) string {
	if marginOfSafety < -10 {
		return "KRITIS"
	}
	if marginOfSafety < 10 || (bepDaily > 0 && dailyAvg < bepDaily*0.9) {
		return "WASPADA"
	}
	return "AMAN"
}

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (c *BEPCalculator) calculateProductMargins(products []entity.ProductSalesVolume) []entity.ProductMargin {
	if len(products) == 0 {
		return nil
	}

	// Sort by quantity descending and assign ranks
	// We expect the input to already be sorted by quantity DESC from the query
	result := make([]entity.ProductMargin, len(products))
	for i, p := range products {
		cm := p.AvgPrice - p.AvgCost
		marginRatio := 0.0
		if p.AvgPrice > 0 {
			marginRatio = cm / p.AvgPrice * 100
		}
		result[i] = entity.ProductMargin{
			ProductID:          p.ProductID,
			ProductName:        p.Name,
			Category:           p.Category,
			SellingPrice:       p.AvgPrice,
			VariableCost:       p.AvgCost,
			ContributionMargin: cm,
			MarginRatio:        math.Round(marginRatio*100) / 100,
			UnitsSold:          p.Quantity,
			Revenue:            p.Revenue,
			Rank:               i + 1,
		}
	}
	return result
}
