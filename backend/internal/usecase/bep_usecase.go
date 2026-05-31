package usecase

import (
	"fmt"
	"math"
	"strconv"
	"time"

	"singgah-pos-backend/internal/datascience"
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
// Technical Assumptions:
// - BEP calculation uses current month's data with date range filtering
// - Fixed costs are expenses marked with cost_type = "fixed"
// - Variable costs = COGS from order items + variable expenses
// - WMA forecast uses 90 days of historical daily sales
// - Monte Carlo runs 10,000 iterations for probabilistic BEP

// BEPUsecase orchestrates all BEP calculations
type BEPUsecase struct {
	orderRepo      repository.OrderRepository
	orderItemRepo  repository.OrderItemRepository
	expenseRepo    repository.ExpenseRepository
	settingRepo    repository.SettingRepository
}

// NewBEPUsecase creates a new BEPUsecase
func NewBEPUsecase(db *gorm.DB) *BEPUsecase {
	return &BEPUsecase{
		orderRepo:      postgres.NewOrderRepository(db),
		orderItemRepo:  postgres.NewOrderItemRepository(db),
		expenseRepo:    postgres.NewExpenseRepository(db),
		settingRepo:    postgres.NewSettingRepository(db),
	}
}

// GetBEPReport generates the complete BEP analysis for a given month/year
func (uc *BEPUsecase) GetBEPReport(month, year int) (*entity.BEPResponse, error) {
	// Build period strings
	now := time.Now()
	if month <= 0 {
		month = int(now.Month())
	}
	if year <= 0 {
		year = now.Year()
	}

	location := now.Location()
	startOfMonth := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, location)
	endOfMonth := startOfMonth.AddDate(0, 1, -1)
	if endOfMonth.After(now) {
		endOfMonth = now
	}

	startStr := startOfMonth.Format("2006-01-02 15:04:05")
	endStr := endOfMonth.Format("2006-01-02 15:04:05")
	period := startOfMonth.Format("2006-01")

	daysInPeriod := int(endOfMonth.Sub(startOfMonth).Hours()/24) + 1
	if daysInPeriod <= 0 {
		daysInPeriod = 30
	}

	// Historical data for forecast (90 days)
	histStart := startOfMonth.AddDate(0, 0, -89)
	histStartStr := histStart.Format("2006-01-02 15:04:05")

	// Fetch all data in parallel using channels
	type salesResult struct {
		revenue float64
		err     error
	}
	type cogsRes struct {
		cogs float64
		err  error
	}
	type fixedCostRes struct {
		cost float64
		err  error
	}
	type variableExpRes struct {
		cost float64
		err  error
	}
	type dailySalesRes struct {
		data []entity.DailySales
		err  error
	}
	type productSalesRes struct {
		data []entity.ProductSalesVolume
		err  error
	}
	type fcBreakdownRes struct {
		data []entity.FixedCostItem
		err  error
	}
	type avgOrderRes struct {
		avg float64
		err error
	}

	revenueCh := make(chan salesResult, 1)
	cogsCh := make(chan cogsRes, 1)
	fixedCostCh := make(chan fixedCostRes, 1)
	variableExpCh := make(chan variableExpRes, 1)
	dailySalesCh := make(chan dailySalesRes, 1)
	productSalesCh := make(chan productSalesRes, 1)
	fcBreakdownCh := make(chan fcBreakdownRes, 1)

	go func() {
		rev, err := uc.orderRepo.GetTotalSalesRange(startStr, endStr)
		revenueCh <- salesResult{rev, err}
	}()
	go func() {
		cogs, err := uc.orderItemRepo.GetTotalCogsRange(startStr, endStr)
		cogsCh <- cogsRes{cogs, err}
	}()
	go func() {
		fc, err := uc.expenseRepo.GetTotalByCostType("fixed", startStr, endStr)
		fixedCostCh <- fixedCostRes{fc, err}
	}()
	go func() {
		vc, err := uc.expenseRepo.GetTotalByCostType("variable", startStr, endStr)
		variableExpCh <- variableExpRes{vc, err}
	}()
	go func() {
		ds, err := uc.orderRepo.GetDailySalesRange(histStartStr, endStr)
		dailySalesCh <- dailySalesRes{ds, err}
	}()
	go func() {
		ps, err := uc.orderItemRepo.GetProductSalesVolume(startStr, endStr)
		productSalesCh <- productSalesRes{ps, err}
	}()
	go func() {
		fcb, err := uc.expenseRepo.GetFixedCostBreakdown(startStr, endStr)
		fcBreakdownCh <- fcBreakdownRes{fcb, err}
	}()

	revResult := <-revenueCh
	cogsVal := <-cogsCh
	fcVal := <-fixedCostCh
	vcVal := <-variableExpCh
	dsVal := <-dailySalesCh
	psVal := <-productSalesCh
	fcbVal := <-fcBreakdownCh

	if revResult.err != nil {
		return nil, revResult.err
	}
	if cogsVal.err != nil {
		return nil, cogsVal.err
	}
	if fcVal.err != nil {
		return nil, fcVal.err
	}
	if vcVal.err != nil {
		return nil, vcVal.err
	}

	totalRevenue := revResult.revenue
	totalVariableCost := cogsVal.cogs + vcVal.cost
	totalFixedCost := fcVal.cost

	var products []entity.ProductSalesVolume
	if psVal.err == nil {
		products = psVal.data
	}

	// Calculate weighted averages
	var totalQty int
	var weightedPriceSum, weightedCostSum float64
	for _, p := range products {
		totalQty += p.Quantity
		weightedPriceSum += p.AvgPrice * float64(p.Quantity)
		weightedCostSum += p.AvgCost * float64(p.Quantity)
	}

	avgPrice := 0.0
	avgCost := 0.0
	if totalQty > 0 {
		avgPrice = weightedPriceSum / float64(totalQty)
		avgCost = weightedCostSum / float64(totalQty)
	}

	// 1. BEP Calculator (deterministic)
	calculator := &datascience.BEPCalculator{
		TotalRevenue:      totalRevenue,
		TotalVariableCost: totalVariableCost,
		TotalFixedCost:    totalFixedCost,
		AvgSellingPrice:   avgPrice,
		AvgVariableCost:   avgCost,
		DaysInPeriod:      daysInPeriod,
	}
	report := calculator.Calculate(products)
	report.Period = period
	if fcbVal.err == nil {
		report.FixedCostBreakdown = fcbVal.data
	}

	// Capital Analysis — Modal Awal
	initialCapital, amortMonths := uc.parseCapitalSettings()
	report.InitialCapital = initialCapital
	report.AmortizationMonths = amortMonths

	netProfit := totalRevenue - totalVariableCost - totalFixedCost
	report.NetProfit = netProfit

	cmPerUnit := avgPrice - avgCost

	if initialCapital > 0 && amortMonths > 0 {
		amortizedMonthly := initialCapital / float64(amortMonths)
		report.AmortizedMonthlyCapital = amortizedMonthly

		if cmPerUnit > 0 {
			report.BEPWithCapitalUnits = math.Ceil((totalFixedCost + amortizedMonthly) / cmPerUnit)
		}
		if report.CMRatio > 0 {
			report.BEPWithCapitalRevenue = math.Ceil((totalFixedCost + amortizedMonthly) / report.CMRatio)
		}

		monthlyNetProfit := netProfit / float64(daysInPeriod) * 30
		if monthlyNetProfit > 0 {
			payback := initialCapital / monthlyNetProfit
			report.PaybackPeriodMonths = math.Round(payback*100) / 100
			months := int(payback)
			days := int((payback - float64(months)) * 30)
			report.PaybackLabel = fmt.Sprintf("%d bulan %d hari", months, days)

			annualProfit := netProfit * 12 / float64(daysInPeriod)
			report.ROIAnnual = math.Round((annualProfit/initialCapital)*10000) / 100
		} else {
			report.PaybackLabel = "Tidak terbalikan"
		}
	}

	// 2. Forecast Engine (WMA + seasonal)
	forecastEngine := &datascience.ForecastEngine{
		DailySales: dsVal.data,
		FixedCost:  totalFixedCost,
		CMRatio:    report.CMRatio,
	}
	nextPeriodDays := 30
	forecast := forecastEngine.Forecast(nextPeriodDays)
	forecast.Period = time.Date(year, time.Month(month)+1, 1, 0, 0, 0, 0, location).Format("2006-01")

	// 3. Sensitivity Analysis (what-if)
	var sm *entity.SensitivityMatrix
	if avgPrice > avgCost && totalFixedCost > 0 {
		sensitivity := &datascience.SensitivityAnalyzer{
			CurrentAvgPrice:   avgPrice,
			CurrentAvgCost:    avgCost,
			CurrentFixedCost:  totalFixedCost,
			CurrentBEPUnits:   report.BEPUnits,
			CurrentBEPRevenue: report.BEPRevenue,
		}
		sm = sensitivity.Analyze()
	}

	// 4. Monte Carlo Simulation (probabilistic)
	var mc *entity.MonteCarloResult
	if avgPrice > avgCost && totalFixedCost > 0 {
		stdSales := calculateStdDevFromDailySales(dsVal.data)
		monteCarlo := &datascience.MonteCarloSimulator{
			MeanSales:     forecast.PredictedUnits,
			StdSales:      stdSales,
			MeanPrice:     avgPrice,
			StdPrice:      avgPrice * 0.05,  // 5% price variability
			MeanCost:      avgCost,
			StdCost:       avgCost * 0.03,   // 3% cost variability
			MeanFixedCost: totalFixedCost,
			StdFixedCost:  totalFixedCost * 0.05, // 5% fixed cost variability
			Iterations:    10000,
		}
		mc = monteCarlo.Simulate()
	}

	// 5. Early Warning & Recommendations
	earlyWarning := generateEarlyWarning(report, forecast)

	return &entity.BEPResponse{
		Report:       report,
		Forecast:     forecast,
		Sensitivity:  sm,
		MonteCarlo:   mc,
		EarlyWarning: earlyWarning,
	}, nil
}

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
func calculateStdDevFromDailySales(dailySales []entity.DailySales) float64 {
	if len(dailySales) == 0 {
		return 0
	}

	var sum float64
	for _, ds := range dailySales {
		sum += ds.Total
	}
	mean := sum / float64(len(dailySales))

	var variance float64
	for _, ds := range dailySales {
		dev := ds.Total - mean
		variance += dev * dev
	}
	variance /= float64(len(dailySales))

	return math.Sqrt(variance)
}

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (uc *BEPUsecase) parseCapitalSettings() (float64, int) {
	initialCapital := 0.0
	amortMonths := 12

	if s, err := uc.settingRepo.FindByKey("initial_capital"); err == nil {
		if v, e := strconv.ParseFloat(s.Value, 64); e == nil && v > 0 {
			initialCapital = v
		}
	}
	if s, err := uc.settingRepo.FindByKey("initial_capital_amortization_months"); err == nil {
		if v, e := strconv.Atoi(s.Value); e == nil && v > 0 {
			amortMonths = v
		}
	}
	return initialCapital, amortMonths
}

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
func generateEarlyWarning(report *entity.BEPReport, forecast *entity.BEPForecast) *entity.EarlyWarning {
	var recommendations []entity.Recommendation

	// Check 1: Sales below BEP target
	if report.CurrentDailyAvg > 0 && report.BEPDailyUnits > 0 {
		ratio := report.CurrentDailyAvg / (report.BEPDailyUnits * report.AvgSellingPrice)
		if ratio < 0.8 {
			recommendations = append(recommendations, entity.Recommendation{
				Priority:  1,
				Condition: "Penjualan harian di bawah 80% target BEP",
				Action:    "Bundle produk margin tinggi dengan produk populer. Aktifkan promo time-based (happy hour). Evaluasi menu: hapus produk margin < 20%.",
				Severity:  "critical",
				Metric:    "DailyAvg/BEPTarget",
			})
		} else if ratio < 0.95 {
			recommendations = append(recommendations, entity.Recommendation{
				Priority:  3,
				Condition: "Penjualan mendekati batas BEP",
				Action:    "Pantau penjualan harian. Siapkan flash sale jika tren menurun.",
				Severity:  "warning",
				Metric:    "DailyAvg/BEPTarget",
			})
		}
	}

	// Check 2: Margin ratio
	if report.CMRatio < 0.4 && report.CMRatio > 0 {
		recommendations = append(recommendations, entity.Recommendation{
			Priority:  1,
			Condition: "Margin kontribusi < 40%",
			Action:    "Audit HPP: cek supplier ingredient, ukur ulang porsi. Evaluasi harga produk dengan elastisitas rendah. Target margin coffee shop sehat: 60-70%.",
			Severity:  "critical",
			Metric:    "CMRatio",
		})
	}

	// Check 3: Low margin products
	if len(report.PerProduct) > 0 {
		var lowMarginProducts []string
		for _, p := range report.PerProduct {
			if p.MarginRatio < 20 && p.MarginRatio > 0 {
				lowMarginProducts = append(lowMarginProducts, p.ProductName)
			}
		}
		if len(lowMarginProducts) > 0 {
			recommendations = append(recommendations, entity.Recommendation{
				Priority:  2,
				Condition: "Produk dengan margin < 20% terdeteksi",
				Action:    "Review produk: " + joinStrings(lowMarginProducts, ", ") + ". Pertimbangkan hapus atau naikkan harga.",
				Severity:  "warning",
				Metric:    "LowMarginProducts",
			})
		}
	}

	// Check 4: Forecast trend
	if forecast.Trend == "MENURUN" {
		recommendations = append(recommendations, entity.Recommendation{
			Priority:  2,
			Condition: "Tren penjualan diprediksi menurun",
			Action:    "Segera lakukan flash sale minuman high margin. Aktifkan promo pre-order weekend. Evaluasi jam operasional.",
			Severity:  "warning",
			Metric:    "ForecastTrend",
		})
	}

	// Check 5: Monte Carlo probability
	if forecast.ProbabilityAboveBEP > 0 && forecast.ProbabilityAboveBEP < 0.5 {
		recommendations = append(recommendations, entity.Recommendation{
			Priority:  1,
			Condition: "Probabilitas mencapai BEP rendah (< 50%)",
			Action:    "Siapkan contingency plan: kurangi shift karyawan, efisiensi biaya operasional, audit pengeluaran tetap.",
			Severity:  "critical",
			Metric:    "ProbabilityAboveBEP",
		})
	}

	// Check 6: Payback period too long (only if capital > 0)
	if report.InitialCapital > 0 {
		if report.PaybackPeriodMonths > 24 && report.PaybackPeriodMonths > 0 {
			recommendations = append(recommendations, entity.Recommendation{
				Priority:  2,
				Condition: "Payback period > 24 bulan",
				Action:    "Modal awal terlalu besar relatif terhadap profit. Evaluasi efisiensi biaya atau tambah modal kerja. Pertimbangkan strategi bundling untuk meningkatkan revenue.",
				Severity:  "warning",
				Metric:    "PaybackPeriod",
			})
		} else if report.PaybackPeriodMonths <= 0 && report.NetProfit <= 0 {
			recommendations = append(recommendations, entity.Recommendation{
				Priority:  1,
				Condition: "Bisnis belum profitabel — modal awal tidak terbalikan",
				Action:    "Segera evaluasi harga jual dan struktur biaya. Jika terus merugi dalam 3 bulan, pertimbangkan restrukturisasi bisnis.",
				Severity:  "critical",
				Metric:    "PaybackPeriod",
			})
		}
	}

	// No issues
	if len(recommendations) == 0 {
		recommendations = append(recommendations, entity.Recommendation{
			Priority:  0,
			Condition: "BEP dalam kondisi aman",
			Action:    "Pertahankan strategi saat ini. Reinvestasi ke area yang perlu peningkatan: inventory bulk purchase, upgrade equipment.",
			Severity:  "info",
			Metric:    "Overall",
		})
	}

	// Determine overall status
	status := "AMAN"
	for _, r := range recommendations {
		if r.Severity == "critical" {
			status = "KRITIS"
			break
		}
		if r.Severity == "warning" && status != "KRITIS" {
			status = "WASPADA"
		}
	}

	// Override with BEP report status if more critical
	if report.Status == "KRITIS" {
		status = "KRITIS"
	} else if report.Status == "WASPADA" && status != "KRITIS" {
		status = "WASPADA"
	}

	return &entity.EarlyWarning{
		Status:          status,
		Recommendations: recommendations,
	}
}

func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}
