package entity

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// Technical Assumptions:
// - Variable cost per unit = HPP (Product.Cost) from recipe ingredients
// - Fixed costs = expenses with CostType = "fixed"
// - Average selling price & cost weighted by actual sales volume
// - BEP calculation assumes linear contribution margin within capacity

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// BEPReport is the top-level response for BEP analysis
type BEPReport struct {
	Period              string          `json:"period"`
	TotalRevenue        float64         `json:"total_revenue"`
	TotalVariableCost   float64         `json:"total_variable_cost"`
	TotalFixedCost      float64         `json:"total_fixed_cost"`
	ContributionMargin  float64         `json:"contribution_margin"`
	CMRatio             float64         `json:"cm_ratio"`
	AvgSellingPrice     float64         `json:"avg_selling_price"`
	AvgVariableCost     float64         `json:"avg_variable_cost"`
	BEPUnits            float64         `json:"bep_units"`
	BEPRevenue          float64         `json:"bep_revenue"`
	BEPDailyUnits       float64         `json:"bep_daily_units"`
	MarginOfSafety      float64         `json:"margin_of_safety"`
	DailyTarget         float64         `json:"daily_target"`
	CurrentDailyAvg     float64         `json:"current_daily_avg"`
	Status              string          `json:"status"` // AMAN, WASPADA, KRITIS
	PerProduct          []ProductMargin `json:"per_product"`
	FixedCostBreakdown  []FixedCostItem `json:"fixed_cost_breakdown"`
	// Capital analysis
	InitialCapital          float64 `json:"initial_capital"`
	AmortizationMonths      int     `json:"amortization_months"`
	AmortizedMonthlyCapital float64 `json:"amortized_monthly_capital"`
	NetProfit               float64 `json:"net_profit"`
	PaybackPeriodMonths     float64 `json:"payback_period_months"`
	PaybackLabel            string  `json:"payback_label"`
	ROIAnnual               float64 `json:"roi_annual"`
	BEPWithCapitalUnits     float64 `json:"bep_with_capital_units"`
	BEPWithCapitalRevenue   float64 `json:"bep_with_capital_revenue"`
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
type ProductMargin struct {
	ProductID          uint    `json:"product_id"`
	ProductName        string  `json:"product_name"`
	Category           string  `json:"category"`
	SellingPrice       float64 `json:"selling_price"`
	VariableCost       float64 `json:"variable_cost"`
	ContributionMargin float64 `json:"contribution_margin"`
	MarginRatio        float64 `json:"margin_ratio"`
	UnitsSold          int     `json:"units_sold"`
	Revenue            float64 `json:"revenue"`
	Rank               int     `json:"rank"`
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
type ProductSalesVolume struct {
	ProductID uint    `json:"product_id"`
	Name      string  `json:"name"`
	Category  string  `json:"category"`
	Quantity  int     `json:"quantity"`
	AvgPrice  float64 `json:"avg_price"`
	AvgCost   float64 `json:"avg_cost"`
	Revenue   float64 `json:"revenue"`
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// DailySales represents daily aggregated sales for forecasting
type DailySales struct {
	Date  string  `json:"date"`
	Total float64 `json:"total"`
	Count int64   `json:"count"`
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// BEPForecast contains WMA + seasonal forecast results
type BEPForecast struct {
	Period              string  `json:"period"`
	PredictedRevenue    float64 `json:"predicted_revenue"`
	PredictedUnits      float64 `json:"predicted_units"`
	ConfidenceLower     float64 `json:"confidence_lower"`
	ConfidenceUpper     float64 `json:"confidence_upper"`
	ProbabilityAboveBEP float64 `json:"probability_above_bep"`
	MAPE                float64 `json:"mape"`
	Trend               string  `json:"trend"` // MENINGKAT, STABIL, MENURUN
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// SensitivityMatrix contains what-if scenario analysis results
type SensitivityMatrix struct {
	CurrentBEPUnits   float64       `json:"current_bep_units"`
	CurrentBEPRevenue float64       `json:"current_bep_revenue"`
	Scenarios         []BEPScenario `json:"scenarios"`
	BestCase          BEPExtreme    `json:"best_case"`
	WorstCase         BEPExtreme    `json:"worst_case"`
	MostSensitiveTo   string        `json:"most_sensitive_to"`
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
type BEPScenario struct {
	Label         string  `json:"label"`
	Parameter     string  `json:"parameter"`
	Change        float64 `json:"change"`
	NewBEPUnits   float64 `json:"new_bep_units"`
	NewBEPRevenue float64 `json:"new_bep_revenue"`
	DeltaPercent  float64 `json:"delta_percent"`
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
type BEPExtreme struct {
	Scenario    string  `json:"scenario"`
	BEPUnits    float64 `json:"bep_units"`
	BEPRevenue  float64 `json:"bep_revenue"`
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// MonteCarloResult contains probabilistic BEP simulation results
type MonteCarloResult struct {
	Iterations        int     `json:"iterations"`
	MeanBEPUnits      float64 `json:"mean_bep_units"`
	MedianBEPUnits    float64 `json:"median_bep_units"`
	P10BEPUnits       float64 `json:"p10_bep_units"`
	P90BEPUnits       float64 `json:"p90_bep_units"`
	MeanBEPRevenue    float64 `json:"mean_bep_revenue"`
	P10BEPRevenue     float64 `json:"p10_bep_revenue"`
	P90BEPRevenue     float64 `json:"p90_bep_revenue"`
	ProbabilityProfit float64 `json:"probability_profit"`
	ProbabilityLoss   float64 `json:"probability_loss"`
	MeanProfit        float64 `json:"mean_profit"`
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// EarlyWarning contains recommendations for the owner
type EarlyWarning struct {
	Status          string           `json:"status"` // AMAN, WASPADA, KRITIS
	Recommendations []Recommendation `json:"recommendations"`
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
type Recommendation struct {
	Priority  int    `json:"priority"`
	Condition string `json:"condition"`
	Action    string `json:"action"`
	Severity  string `json:"severity"` // critical, warning, info
	Metric    string `json:"metric"`
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
// BEPResponse wraps all BEP analysis results into a single API response
type BEPResponse struct {
	Report       *BEPReport          `json:"report"`
	Forecast     *BEPForecast        `json:"forecast"`
	Sensitivity  *SensitivityMatrix  `json:"sensitivity"`
	MonteCarlo   *MonteCarloResult   `json:"monte_carlo"`
	EarlyWarning *EarlyWarning       `json:"early_warning"`
}
