package usecase

import (
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type ProductionTargetUsecase struct {
	db                   *gorm.DB
	productRepo          repository.ProductRepository
	productionTargetRepo repository.ProductionTargetRepository
	ingredientRepo       repository.IngredientRepository
	settingRepo          repository.SettingRepository
	orderItemRepo        repository.OrderItemRepository
}

func NewProductionTargetUsecase(db *gorm.DB) *ProductionTargetUsecase {
	return &ProductionTargetUsecase{
		db:                   db,
		productRepo:          postgres.NewProductRepository(db),
		productionTargetRepo: postgres.NewProductionTargetRepository(db),
		ingredientRepo:       postgres.NewIngredientRepository(db),
		settingRepo:          postgres.NewSettingRepository(db),
		orderItemRepo:        postgres.NewOrderItemRepository(db),
	}
}

// GetTargets returns all production targets with product names.
func (uc *ProductionTargetUsecase) GetTargets(outletID uint) ([]entity.ProductionTargetDetail, error) {
	targets, err := uc.productionTargetRepo.FindAllWithProduct(outletID)
	if err != nil {
		return nil, err
	}
	if targets == nil {
		targets = []entity.ProductionTargetDetail{}
	}
	return targets, nil
}

// SaveTargets replaces all production targets for the outlet and persists the planning period.
func (uc *ProductionTargetUsecase) SaveTargets(periodDays int, targets []entity.ProductionTarget, outletID uint) error {
	if err := uc.productionTargetRepo.ReplaceAll(targets, outletID); err != nil {
		return err
	}
	return uc.settingRepo.Upsert("stock_planning_period_days", strconv.Itoa(periodDays), "inventory")
}

// resolveCategory returns a sensible default category if empty.
func resolveCategory(name, existingCat string) string {
	if existingCat != "" {
		return existingCat
	}
	lower := strings.ToLower(name)
	if strings.Contains(lower, "kopi") || strings.Contains(lower, "arabika") || strings.Contains(lower, "robusta") || strings.Contains(lower, "espresso") || strings.Contains(lower, "bean") || strings.Contains(lower, "dieng") {
		return "Kopi"
	}
	if strings.Contains(lower, "susu") || strings.Contains(lower, "milk") || strings.Contains(lower, "oat") || strings.Contains(lower, "creamer") || strings.Contains(lower, "krimer") {
		return "Susu"
	}
	if strings.Contains(lower, "gula") || strings.Contains(lower, "syrup") || strings.Contains(lower, "sirup") || strings.Contains(lower, "aren") || strings.Contains(lower, "skm") || strings.Contains(lower, "manis") {
		return "Pemanis"
	}
	if strings.Contains(lower, "cup") || strings.Contains(lower, "tutup") || strings.Contains(lower, "sedotan") || strings.Contains(lower, "straw") || strings.Contains(lower, "plastik") || strings.Contains(lower, "paper") {
		return "Kemasan"
	}
	if strings.Contains(lower, "es") || strings.Contains(lower, "ice") {
		return "Es"
	}
	return "Lainnya"
}

// resolvePurchaseUnit returns sensible purchase unit and unit size if unconfigured.
func resolvePurchaseUnit(unit, existingPUnit string, existingSize float64) (string, float64) {
	pUnit := existingPUnit
	size := existingSize
	if size > 0 && pUnit != "" {
		return pUnit, size
	}
	switch strings.ToLower(unit) {
	case "gram", "gr", "g":
		if pUnit == "" {
			pUnit = "kg"
		}
		if size <= 0 {
			size = 1000
		}
	case "ml", "mili", "milliliter":
		if pUnit == "" {
			pUnit = "liter"
		}
		if size <= 0 {
			size = 1000
		}
	default:
		if pUnit == "" {
			pUnit = unit
		}
		if size <= 0 {
			size = 1
		}
	}
	return pUnit, size
}

// GetRequirements calculates ingredient purchase requirements from production targets.
func (uc *ProductionTargetUsecase) GetRequirements(outletID uint) (*entity.RequirementResponse, error) {
	products, err := uc.productRepo.FindAll(0, 0)
	if err != nil {
		return nil, err
	}
	ingredients, err := uc.ingredientRepo.FindAll(outletID)
	if err != nil {
		return nil, err
	}
	periodDays := uc.resolvePeriodDays(outletID)
	targetDetails, err := uc.productionTargetRepo.FindAll(outletID)
	if err != nil {
		return nil, err
	}
	targetMap, ingMap := uc.buildMaps(targetDetails, ingredients)

	menus, ingredientAgg, totalTargetCup := uc.aggregateRequirements(products, ingMap, targetMap)
	return uc.finalizeRequirements(menus, ingredientAgg, ingMap, periodDays, totalTargetCup), nil
}

// GetDailyTargetRealization returns the target per product for a single day vs the actual realized
// sales, with the daily ingredient requirement derived from the SAME aggregation used by
// Kebutuhan Stok so the two views never diverge.
func (uc *ProductionTargetUsecase) GetDailyTargetRealization(outletID uint, date string) (*entity.DailyTargetRealization, error) {
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}
	products, err := uc.productRepo.FindAll(0, 0)
	if err != nil {
		return nil, err
	}
	ingredients, err := uc.ingredientRepo.FindAll(outletID)
	if err != nil {
		return nil, err
	}
	periodDays := uc.resolvePeriodDays(outletID)
	targetDetails, err := uc.productionTargetRepo.FindAll(outletID)
	if err != nil {
		return nil, err
	}
	targetMap, ingMap := uc.buildMaps(targetDetails, ingredients)

	dailyTargetMap := make(map[uint]float64, len(targetMap))
	if periodDays > 0 {
		for pid, tc := range targetMap {
			dailyTargetMap[pid] = tc / float64(periodDays)
		}
	}

	menus, ingredientAgg, totalDailyTarget := uc.aggregateRequirements(products, ingMap, dailyTargetMap)
	req := uc.finalizeRequirements(menus, ingredientAgg, ingMap, periodDays, totalDailyTarget)

	salesVol, err := uc.orderItemRepo.GetProductSalesVolume(date+"T00:00:00", date+"T23:59:59", outletID)
	if err != nil {
		return nil, err
	}
	realizedMap := make(map[uint]float64, len(salesVol))
	for _, sv := range salesVol {
		realizedMap[sv.ProductID] = float64(sv.Quantity)
	}

	perProduct := make([]entity.DailyTargetProduct, 0)
	for _, prod := range products {
		dailyTarget := dailyTargetMap[prod.ID]
		realized := realizedMap[prod.ID]
		if dailyTarget <= 0 && realized == 0 {
			continue
		}
		status := "Belum ada target"
		if dailyTarget > 0 {
			if realized >= dailyTarget {
				status = "Tercapai"
			} else {
				status = "Di bawah target"
			}
		}
		achPct := 0.0
		if dailyTarget > 0 {
			achPct = (realized / dailyTarget) * 100
		}
		perProduct = append(perProduct, entity.DailyTargetProduct{
			ProductID:   prod.ID,
			ProductName: prod.Name,
			Category:    prod.Category,
			DailyTarget: dailyTarget,
			Realized:    realized,
			Variance:    realized - dailyTarget,
			AchPct:      achPct,
			Status:      status,
		})
	}
	sort.Slice(perProduct, func(i, j int) bool {
		return perProduct[i].ProductName < perProduct[j].ProductName
	})

	var totalRealized float64
	for _, p := range perProduct {
		totalRealized += p.Realized
	}

	return &entity.DailyTargetRealization{
		Date:               date,
		PeriodDays:         periodDays,
		PerProduct:         perProduct,
		Ingredients:        req.Ingredients,
		TotalTargetCup:     totalDailyTarget,
		TotalRealizedCup:   totalRealized,
		TotalEstimatedCost: req.TotalEstimatedCost,
	}, nil
}

func (uc *ProductionTargetUsecase) resolvePeriodDays(outletID uint) int {
	periodDays := 10
	if s, err := uc.settingRepo.FindByKey("stock_planning_period_days"); err == nil && s != nil {
		if d, err := strconv.Atoi(s.Value); err == nil && d > 0 {
			periodDays = d
		}
	}
	return periodDays
}

func (uc *ProductionTargetUsecase) buildMaps(targetDetails []entity.ProductionTarget, ingredients []entity.Ingredient) (map[uint]float64, map[uint]entity.Ingredient) {
	targetMap := make(map[uint]float64, len(targetDetails))
	for _, td := range targetDetails {
		targetMap[td.ProductID] = td.TargetCup
	}
	ingMap := make(map[uint]entity.Ingredient, len(ingredients))
	for _, ing := range ingredients {
		ingMap[ing.ID] = ing
	}
	return targetMap, ingMap
}

// aggregateRequirements builds per-menu and aggregated ingredient needs from a cup target map.
func (uc *ProductionTargetUsecase) aggregateRequirements(products []entity.Product, ingMap map[uint]entity.Ingredient, targetMap map[uint]float64) ([]entity.RequirementMenu, map[uint]*entity.RequirementIngredient, float64) {
	ingredientAgg := make(map[uint]*entity.RequirementIngredient)
	var menus []entity.RequirementMenu
	var totalTargetCup float64

	for _, prod := range products {
		target := targetMap[prod.ID]
		if target <= 0 {
			continue
		}
		totalTargetCup += target

		var items []entity.RequirementMenuIngredient
		for _, ri := range prod.Recipe {
			totalNeed := ri.Quantity * target
			items = append(items, entity.RequirementMenuIngredient{
				IngredientID: ri.IngredientID,
				Name:         ri.Ingredient.Name,
				QtyPerCup:    ri.Quantity,
				Unit:         ri.Ingredient.Unit,
				TotalNeed:    totalNeed,
			})

			ing, ok := ingMap[ri.IngredientID]
			if !ok {
				continue
			}
			cat := resolveCategory(ing.Name, ing.Category)
			pUnit, pSize := resolvePurchaseUnit(ing.Unit, ing.PurchaseUnit, ing.PurchaseUnitSize)

			if agg, exists := ingredientAgg[ri.IngredientID]; exists {
				agg.TotalNeeded += totalNeed
			} else {
				ingredientAgg[ri.IngredientID] = &entity.RequirementIngredient{
					IngredientID:     ri.IngredientID,
					Name:             ing.Name,
					Category:         cat,
					Unit:             ing.Unit,
					CurrentStock:     ing.CurrentStock,
					TotalNeeded:      totalNeed,
					PurchaseUnit:     pUnit,
					PurchaseUnitSize: pSize,
				}
			}
		}

		menus = append(menus, entity.RequirementMenu{
			ProductID:   prod.ID,
			ProductName: prod.Name,
			TargetCup:   target,
			Items:       items,
		})
	}
	return menus, ingredientAgg, totalTargetCup
}

func (uc *ProductionTargetUsecase) finalizeRequirements(menus []entity.RequirementMenu, ingredientAgg map[uint]*entity.RequirementIngredient, ingMap map[uint]entity.Ingredient, periodDays int, totalTargetCup float64) *entity.RequirementResponse {
	if menus == nil {
		menus = []entity.RequirementMenu{}
	} else {
		sort.Slice(menus, func(i, j int) bool {
			return menus[i].ProductName < menus[j].ProductName
		})
	}

	var ingResults []entity.RequirementIngredient
	var totalEstCost float64
	for _, agg := range ingredientAgg {
		if agg.PurchaseUnitSize > 0 {
			agg.NeedInPurchaseUnit = agg.TotalNeeded / agg.PurchaseUnitSize
			agg.RoundedPurchaseUnit = math.Ceil(agg.NeedInPurchaseUnit)
		}
		agg.EstimatedCost = agg.TotalNeeded * ingMap[agg.IngredientID].CostPerUnit
		totalEstCost += agg.EstimatedCost
		ingResults = append(ingResults, *agg)
	}
	if ingResults == nil {
		ingResults = []entity.RequirementIngredient{}
	} else {
		sort.Slice(ingResults, func(i, j int) bool {
			if ingResults[i].Category != ingResults[j].Category {
				return ingResults[i].Category < ingResults[j].Category
			}
			return ingResults[i].Name < ingResults[j].Name
		})
	}

	avgCupPerDay := 0.0
	if periodDays > 0 && totalTargetCup > 0 {
		avgCupPerDay = totalTargetCup / float64(periodDays)
	}

	return &entity.RequirementResponse{
		PeriodDays:         periodDays,
		TotalTargetCup:     totalTargetCup,
		AvgCupPerDay:       avgCupPerDay,
		TotalEstimatedCost: totalEstCost,
		Menus:              menus,
		Ingredients:        ingResults,
	}
}
