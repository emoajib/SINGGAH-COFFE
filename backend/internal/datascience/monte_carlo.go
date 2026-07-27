package datascience

import (
	"crypto/rand"
	"math"
	"math/big"
	"sort"

	"singgah-pos-backend/internal/domain/entity"
)

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// Technical Assumptions:
// - Sales volume follows normal distribution around forecast mean
// - Price and cost variability is small (±5% for price, ±3% for cost, ±5% for fixed cost)
// - 10,000 iterations provide stable probability estimates
// - Input variables are independent (no correlation modeled)
// - Uses Box-Muller transform for normal random number generation

// MonteCarloSimulator performs probabilistic BEP simulation
type MonteCarloSimulator struct {
	MeanSales     float64
	StdSales      float64
	MeanPrice     float64
	StdPrice      float64
	MeanCost      float64
	StdCost       float64
	MeanFixedCost float64
	StdFixedCost  float64
	Iterations    int
}

// Simulate runs the Monte Carlo simulation
func (s *MonteCarloSimulator) Simulate() *entity.MonteCarloResult {
	iterations := s.Iterations
	if iterations <= 0 {
		iterations = 10000
	}

	bepUnits := make([]float64, iterations)
	profits := make([]float64, iterations)

	for i := 0; i < iterations; i++ {
		sales := normalRandom(s.MeanSales, s.StdSales)
		price := normalRandom(s.MeanPrice, s.StdPrice)
		cost := normalRandom(s.MeanCost, s.StdCost)
		fixedCost := normalRandom(s.MeanFixedCost, s.StdFixedCost)

		if sales < 0 {
			sales = 0
		}
		if price < 0 {
			price = s.MeanPrice
		}
		if cost < 0 {
			cost = s.MeanCost
		}
		if fixedCost < 0 {
			fixedCost = s.MeanFixedCost
		}

		cm := price - cost
		bep := 0.0
		if cm > 0 {
			bep = fixedCost / cm
		}
		profit := sales*(price-cost) - fixedCost

		bepUnits[i] = bep
		profits[i] = profit
	}

	sort.Float64s(bepUnits)
	sort.Float64s(profits)

	var sumBEP, sumProfit float64
	profitCount := 0
	lossCount := 0

	for i := 0; i < iterations; i++ {
		sumBEP += bepUnits[i]
		sumProfit += profits[i]
		if profits[i] > 0 {
			profitCount++
		} else {
			lossCount++
		}
	}

	meanBEP := sumBEP / float64(iterations)
	meanProfit := sumProfit / float64(iterations)

	p10Idx := int(float64(iterations) * 0.10)
	p90Idx := int(float64(iterations) * 0.90)
	medianIdx := iterations / 2

	if p10Idx >= iterations {
		p10Idx = iterations - 1
	}
	if p90Idx >= iterations {
		p90Idx = iterations - 1
	}

	return &entity.MonteCarloResult{
		Iterations:        iterations,
		MeanBEPUnits:      math.Ceil(meanBEP),
		MedianBEPUnits:    math.Ceil(bepUnits[medianIdx]),
		P10BEPUnits:       math.Ceil(bepUnits[p10Idx]),
		P90BEPUnits:       math.Ceil(bepUnits[p90Idx]),
		MeanBEPRevenue:    math.Ceil(meanBEP * s.MeanPrice),
		P10BEPRevenue:     math.Ceil(bepUnits[p10Idx] * s.MeanPrice),
		P90BEPRevenue:     math.Ceil(bepUnits[p90Idx] * s.MeanPrice),
		ProbabilityProfit: float64(profitCount) / float64(iterations),
		ProbabilityLoss:   float64(lossCount) / float64(iterations),
		MeanProfit:        math.Ceil(meanProfit),
	}
}

// cryptoRandFloat64 returns a cryptographically secure random float64 in [0,1)
func cryptoRandFloat64() float64 {
	n, err := rand.Int(rand.Reader, big.NewInt(1<<53))
	if err != nil {
		return 0.5 // fallback (extremely unlikely)
	}
	return float64(n.Int64()) / (1 << 53)
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// Box-Muller transform for generating normally distributed random numbers
func normalRandom(mean, std float64) float64 {
	if std <= 0 {
		return mean
	}
	u1 := cryptoRandFloat64()
	u2 := cryptoRandFloat64()
	// Avoid log(0) which would produce -inf
	if u1 == 0 {
		u1 = 0.0000000001
	}
	z := math.Sqrt(-2*math.Log(u1)) * math.Cos(2*math.Pi*u2)
	return mean + z*std
}
