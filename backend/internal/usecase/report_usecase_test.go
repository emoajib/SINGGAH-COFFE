package usecase

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"

	"singgah-pos-backend/internal/models"
)

func setupReportTestDB() *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		panic("Failed to connect to database: " + err.Error())
	}
	db.AutoMigrate(&models.Order{}, &models.OrderItem{}, &models.Expense{}, &models.Ingredient{}, &models.Product{})
	return db
}

func createReportUsecase(db *gorm.DB) *ReportUsecase {
	return NewReportUsecase(db)
}

func TestReportUsecase_GetProfitLossReportEmpty(t *testing.T) {
	dashboardMu.Lock()
	dashboardCache = nil
	dashboardMu.Unlock()

	db := setupReportTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createReportUsecase(db)

	report, err := uc.GetProfitLossReport("2020-01-01", "2030-12-31")

	assert.NoError(t, err)
	assert.NotNil(t, report)
	assert.Equal(t, 0.0, report.Revenue)
	assert.Equal(t, 0.0, report.Cogs)
	assert.Equal(t, 0.0, report.GrossProfit)
	assert.Equal(t, 0.0, report.TotalExpenses)
	assert.Equal(t, 0.0, report.NetProfit)
	assert.Len(t, report.Expenses, 0)
}

func TestReportUsecase_GetProfitLossReportWithData(t *testing.T) {
	dashboardMu.Lock()
	dashboardCache = nil
	dashboardMu.Unlock()

	db := setupReportTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createReportUsecase(db)

	order := &models.Order{
		OrderNumber:   "ORD-TEST-001",
		TotalAmount:   50000,
		PaymentMethod: "Cash",
		PaymentStatus: "Paid",
		Status:        "Completed",
		OrderTime:     time.Now(),
	}
	db.Create(order)
	db.Create(&models.OrderItem{
		OrderID:   order.ID,
		ProductID: 1,
		Quantity:  2,
		Price:     25000,
		Cost:      10000,
	})

	db.Create(&models.Expense{
		Title:    "Test Expense",
		Amount:   5000,
		Category: "Operational",
		CostType: "fixed",
		Date:     time.Now(),
	})

	report, err := uc.GetProfitLossReport("2020-01-01", "2030-12-31")

	assert.NoError(t, err)
	assert.Equal(t, 50000.0, report.Revenue)
	assert.Equal(t, 20000.0, report.Cogs)  // cost(10000) * quantity(2)
	assert.Equal(t, 30000.0, report.GrossProfit) // 50000 - 20000
	assert.Equal(t, 5000.0, report.TotalExpenses)
	assert.Equal(t, 25000.0, report.NetProfit) // 30000 - 5000
	assert.Len(t, report.Expenses, 1)
}

func TestReportUsecase_GetDashboardSummary(t *testing.T) {
	dashboardMu.Lock()
	dashboardCache = nil
	dashboardMu.Unlock()

	db := setupReportTestDB()
	defer func() { sqlDB, _ := db.DB(); sqlDB.Close() }()
	uc := createReportUsecase(db)

	order := &models.Order{
		OrderNumber:   "ORD-DASH-001",
		TotalAmount:   75000,
		PaymentMethod: "Cash",
		PaymentStatus: "Paid",
		Status:        "Completed",
		OrderTime:     time.Now(),
	}
	db.Create(order)
	db.Create(&models.OrderItem{
		OrderID:   order.ID,
		ProductID: 1,
		Quantity:  3,
		Price:     25000,
		Cost:      12000,
	})

	db.Create(&models.Ingredient{
		Name:         "Critical Item",
		Unit:         "pcs",
		CurrentStock: 5,
		MinStock:     10,
		CostPerUnit:  100,
	})

	summary, err := uc.GetDashboardSummary()

	assert.NoError(t, err)
	assert.NotNil(t, summary)
	assert.Equal(t, 75000.0, summary.TotalSales)
	assert.Equal(t, int64(1), summary.TransactionsToday)
	assert.GreaterOrEqual(t, summary.LowStockCount, int64(1))
}
