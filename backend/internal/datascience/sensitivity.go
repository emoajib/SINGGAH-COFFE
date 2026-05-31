package datascience

import (
	"fmt"
	"math"

	"singgah-pos-backend/internal/domain/entity"
)

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
// Technical Assumptions:
// - Sensitivity analysis evaluates one parameter at a time (univariate)
// - Contribution margin ratio stays constant within the evaluated range
// - Grid variations: price ±20%, HPP ±10%, fixed cost ±15%
// - Most sensitive parameter identified by absolute delta percent

// SensitivityAnalyzer performs what-if scenario analysis for BEP
type SensitivityAnalyzer struct {
	CurrentAvgPrice float64
	CurrentAvgCost  float64
	CurrentFixedCost float64
	CurrentBEPUnits float64
	CurrentBEPRevenue float64
}

// Analyze generates the sensitivity matrix with all scenarios
func (a *SensitivityAnalyzer) Analyze() *entity.SensitivityMatrix {
	if a.CurrentAvgPrice <= a.CurrentAvgCost || a.CurrentFixedCost <= 0 {
		return nil
	}

	scenarios := a.generateScenarios()

	bestCase := entity.BEPExtreme{Scenario: "No change", BEPUnits: a.CurrentBEPUnits, BEPRevenue: a.CurrentBEPRevenue}
	worstCase := entity.BEPExtreme{Scenario: "No change", BEPUnits: a.CurrentBEPUnits, BEPRevenue: a.CurrentBEPRevenue}

	for _, s := range scenarios {
		if s.NewBEPUnits < bestCase.BEPUnits || (s.NewBEPUnits == bestCase.BEPUnits && bestCase.Scenario == "No change") {
			bestCase = entity.BEPExtreme{
				Scenario:   s.Label,
				BEPUnits:   s.NewBEPUnits,
				BEPRevenue: s.NewBEPRevenue,
			}
		}
		if s.NewBEPUnits > worstCase.BEPUnits || (s.NewBEPUnits == worstCase.BEPUnits && worstCase.Scenario == "No change") {
			worstCase = entity.BEPExtreme{
				Scenario:   s.Label,
				BEPUnits:   s.NewBEPUnits,
				BEPRevenue: s.NewBEPRevenue,
			}
		}
	}

	mostSensitive := a.findMostSensitive(scenarios)

	return &entity.SensitivityMatrix{
		CurrentBEPUnits:   a.CurrentBEPUnits,
		CurrentBEPRevenue: a.CurrentBEPRevenue,
		Scenarios:         scenarios,
		BestCase:          bestCase,
		WorstCase:         worstCase,
		MostSensitiveTo:   mostSensitive,
	}
}

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (a *SensitivityAnalyzer) generateScenarios() []entity.BEPScenario {
	var scenarios []entity.BEPScenario

	// Price variations: ±20%, ±10%, ±5%
	priceChanges := []float64{-0.20, -0.10, -0.05, 0.05, 0.10, 0.20}
	for _, ch := range priceChanges {
		newPrice := a.CurrentAvgPrice * (1 + ch)
		cmPerUnit := newPrice - a.CurrentAvgCost
		if cmPerUnit <= 0 {
			continue
		}
		newBEP := a.CurrentFixedCost / cmPerUnit
		delta := (newBEP - a.CurrentBEPUnits) / a.CurrentBEPUnits * 100
		label := formatPercent("Harga", ch)
		scenarios = append(scenarios, entity.BEPScenario{
			Label:         label,
			Parameter:     "price",
			Change:        ch,
			NewBEPUnits:   math.Ceil(newBEP),
			NewBEPRevenue: math.Ceil(newBEP * newPrice),
			DeltaPercent:  math.Round(delta*100) / 100,
		})
	}

	// HPP variations: ±10%, ±5%
	costChanges := []float64{-0.10, -0.05, 0.05, 0.10}
	for _, ch := range costChanges {
		newCost := a.CurrentAvgCost * (1 + ch)
		cmPerUnit := a.CurrentAvgPrice - newCost
		if cmPerUnit <= 0 {
			continue
		}
		newBEP := a.CurrentFixedCost / cmPerUnit
		delta := (newBEP - a.CurrentBEPUnits) / a.CurrentBEPUnits * 100
		label := formatPercent("HPP", ch)
		scenarios = append(scenarios, entity.BEPScenario{
			Label:         label,
			Parameter:     "hpp",
			Change:        ch,
			NewBEPUnits:   math.Ceil(newBEP),
			NewBEPRevenue: math.Ceil(newBEP * a.CurrentAvgPrice),
			DeltaPercent:  math.Round(delta*100) / 100,
		})
	}

	// Fixed cost variations: ±15%, ±10%, ±5%
	fcChanges := []float64{-0.15, -0.10, -0.05, 0.05, 0.10, 0.15}
	for _, ch := range fcChanges {
		newFC := a.CurrentFixedCost * (1 + ch)
		cmPerUnit := a.CurrentAvgPrice - a.CurrentAvgCost
		newBEP := newFC / cmPerUnit
		delta := (newBEP - a.CurrentBEPUnits) / a.CurrentBEPUnits * 100
		label := formatPercent("Biaya Tetap", ch)
		scenarios = append(scenarios, entity.BEPScenario{
			Label:         label,
			Parameter:     "fixed_cost",
			Change:        ch,
			NewBEPUnits:   math.Ceil(newBEP),
			NewBEPRevenue: math.Ceil(newBEP * a.CurrentAvgPrice),
			DeltaPercent:  math.Round(delta*100) / 100,
		})
	}

	return scenarios
}

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
func (a *SensitivityAnalyzer) findMostSensitive(scenarios []entity.BEPScenario) string {
	maxDelta := 0.0
	mostSensitive := "price"

	paramDeltas := make(map[string]float64)
	for _, s := range scenarios {
		absDelta := math.Abs(s.DeltaPercent)
		if absDelta > paramDeltas[s.Parameter] {
			paramDeltas[s.Parameter] = absDelta
		}
	}

	for param, delta := range paramDeltas {
		if delta > maxDelta {
			maxDelta = delta
			mostSensitive = param
		}
	}

	switch mostSensitive {
	case "price":
		return "Harga Jual"
	case "hpp":
		return "HPP/Biaya Variabel"
	case "fixed_cost":
		return "Biaya Tetap"
	}
	return "Harga Jual"
}

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
func formatPercent(label string, change float64) string {
	sign := "+"
	if change < 0 {
		sign = ""
	}
	return fmt.Sprintf("%s %s%.0f%%", label, sign, change*100)
}
