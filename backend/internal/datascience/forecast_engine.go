package datascience

import (
	"math"
	"time"

	"singgah-pos-backend/internal/domain/entity"
)

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// Technical Assumptions:
// - WMA (Weighted Moving Average) with 4 weight tiers
// - Seasonal index computed per day-of-week from historical data
// - MAPE (Mean Absolute Percentage Error) for confidence intervals
// - Forecast horizon limited to 1 month (max 3 months reliability)
// - Requires at least 14 days of historical data for meaningful forecast

// ForecastEngine performs WMA + seasonal sales forecasting
type ForecastEngine struct {
	DailySales []entity.DailySales
	FixedCost  float64
	CMRatio    float64
}

// Forecast generates a WMA-based sales forecast for the next period
func (e *ForecastEngine) Forecast(nextPeriodDays int) *entity.BEPForecast {
	if len(e.DailySales) < 14 {
		return &entity.BEPForecast{
			Trend: "STABIL",
			MAPE:  0,
		}
	}

	wma := e.calculateWMA()
	seasonalIndices := e.calculateSeasonalIndices()
	mape := e.calculateMAPE(wma, seasonalIndices)

	predictedDaily := wma
	if len(seasonalIndices) > 0 {
		today := time.Now().Weekday()
		if idx, ok := seasonalIndices[int(today)]; ok {
			predictedDaily = wma * idx
		}
	}

	predictedRevenue := predictedDaily * float64(nextPeriodDays)
	ci := predictedRevenue * (mape / 100)

	trend := e.determineTrend()

	probAboveBEP := 0.0
	if e.FixedCost > 0 && e.CMRatio > 0 {
		bepRevenue := e.FixedCost / e.CMRatio
		if predictedRevenue > bepRevenue {
			// Simple probability based on how far above BEP
			ratio := predictedRevenue / bepRevenue
			if ratio >= 1.5 {
				probAboveBEP = 0.95
			} else if ratio >= 1.2 {
				probAboveBEP = 0.85
			} else if ratio >= 1.0 {
				probAboveBEP = 0.65
			} else {
				probAboveBEP = 0.35
			}
		}
	}

	return &entity.BEPForecast{
		PredictedRevenue:    math.Ceil(predictedRevenue),
		PredictedUnits:      math.Ceil(predictedRevenue / e.CMRatio),
		ConfidenceLower:     math.Ceil(predictedRevenue - ci),
		ConfidenceUpper:     math.Ceil(predictedRevenue + ci),
		ProbabilityAboveBEP: math.Round(probAboveBEP*100) / 100,
		MAPE:                math.Round(mape*100) / 100,
		Trend:               trend,
	}
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// Weight tiers: last 7 days weight 0.30, 7-14 weight 0.25, 14-30 weight 0.25, rest 0.20
func (e *ForecastEngine) calculateWMA() float64 {
	n := len(e.DailySales)
	if n == 0 {
		return 0
	}

	tiers := []struct {
		start  int
		weight float64
	}{
		{0, 0.30},  // last 7 days
		{7, 0.25},  // 7-14 days ago
		{14, 0.25}, // 14-30 days ago
		{30, 0.20}, // 30+ days ago
	}

	var weightedSum, totalWeight float64

	for _, tier := range tiers {
		from := tier.start
		to := tier.start + 7
		if to > n {
			to = n
		}
		if from >= n {
			continue
		}

		var sum float64
		count := 0
		for i := n - to; i < n-from; i++ {
			if i >= 0 && i < n {
				sum += e.DailySales[i].Total
				count++
			}
		}

		if count > 0 {
			weightedSum += (sum / float64(count)) * tier.weight
			totalWeight += tier.weight
		}
	}

	if totalWeight == 0 {
		return 0
	}
	return weightedSum / totalWeight
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
func (e *ForecastEngine) calculateSeasonalIndices() map[int]float64 {
	if len(e.DailySales) < 14 {
		return nil
	}

	// Group sales by day of week
	dayTotals := make(map[int]float64)
	dayCounts := make(map[int]int)
	var grandTotal float64
	var grandCount int

	for _, ds := range e.DailySales {
		t, err := time.Parse("2006-01-02", ds.Date)
		if err != nil {
			continue
		}
		dow := int(t.Weekday())
		dayTotals[dow] += ds.Total
		dayCounts[dow]++
		grandTotal += ds.Total
		grandCount++
	}

	if grandCount == 0 {
		return nil
	}
	grandAvg := grandTotal / float64(grandCount)

	indices := make(map[int]float64)
	for dow := 0; dow < 7; dow++ {
		if dayCounts[dow] > 0 {
			avg := dayTotals[dow] / float64(dayCounts[dow])
			indices[dow] = avg / grandAvg
		} else {
			indices[dow] = 1.0
		}
	}
	return indices
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
func (e *ForecastEngine) calculateMAPE(wma float64, indices map[int]float64) float64 {
	if wma == 0 || len(e.DailySales) < 14 {
		return 30 // default conservative MAPE
	}

	var sumAPE float64
	var count int

	for _, ds := range e.DailySales {
		t, err := time.Parse("2006-01-02", ds.Date)
		if err != nil {
			continue
		}
		dow := int(t.Weekday())
		seasonal := 1.0
		if idx, ok := indices[dow]; ok {
			seasonal = idx
		}

		predicted := wma * seasonal
		if predicted > 0 && ds.Total > 0 {
			ape := math.Abs(ds.Total-predicted) / ds.Total * 100
			sumAPE += ape
			count++
		}
	}

	if count == 0 {
		return 30
	}
	return sumAPE / float64(count)
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
func (e *ForecastEngine) determineTrend() string {
	n := len(e.DailySales)
	if n < 14 {
		return "STABIL"
	}

	// Compare average of last 7 days vs 7-14 days ago
	var recentSum, recentCount float64
	var oldSum, oldCount float64

	for i := n - 1; i >= 0 && i >= n-7; i-- {
		recentSum += e.DailySales[i].Total
		recentCount++
	}
	for i := n - 8; i >= 0 && i >= n-14; i-- {
		oldSum += e.DailySales[i].Total
		oldCount++
	}

	if recentCount == 0 || oldCount == 0 {
		return "STABIL"
	}

	recentAvg := recentSum / recentCount
	oldAvg := oldSum / oldCount

	change := (recentAvg - oldAvg) / oldAvg * 100
	if change > 5 {
		return "MENINGKAT"
	}
	if change < -5 {
		return "MENURUN"
	}
	return "STABIL"
}
