package handler

import (
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"singgah-pos-backend/internal/delivery/request"
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/usecase"

	"github.com/gin-gonic/gin"
)

// JournalHandler handles journal entry and PSAK report endpoints
type JournalHandler struct {
	journalUsecase *usecase.JournalUsecase
}

func NewJournalHandler(journalUsecase *usecase.JournalUsecase) *JournalHandler {
	return &JournalHandler{journalUsecase: journalUsecase}
}

func (h *JournalHandler) GetJournals(c *gin.Context) {
	outletID := getOutletID(c)
	start := c.Query("start")
	if start == "" {
		start = c.Query("start_date")
	}
	end := c.Query("end")
	if end == "" {
		end = c.Query("end_date")
	}
	status := c.Query("status")
	sourceType := c.Query("source_type")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	var journals []entity.JournalEntryResponse
	var err error
	if start != "" || end != "" || status != "" || sourceType != "" {
		journals, err = h.journalUsecase.GetAllFiltered(start, end, status, sourceType, limit, offset, outletID)
	} else {
		journals, err = h.journalUsecase.GetAll(limit, offset, outletID)
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch journals"})
		return
	}
	c.JSON(http.StatusOK, journals)
}

func (h *JournalHandler) GetJournal(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid journal ID"})
		return
	}
	journal, err := h.journalUsecase.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Journal entry not found"})
		return
	}
	c.JSON(http.StatusOK, journal)
}

func (h *JournalHandler) CreateJournal(c *gin.Context) {
	userID, exists := getUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	outletID := getOutletID(c)

	var req request.CreateJournalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid input: %v", err)})
		return
	}

	entry := &entity.JournalEntry{
		Date:        parseDate(req.Date),
		Description: req.Description,
		SourceType:  req.SourceType,
		SourceID:    req.SourceID,
	}
	items := make([]entity.JournalEntryItem, len(req.Items))
	for i, item := range req.Items {
		items[i] = entity.JournalEntryItem{
			AccountID:   item.AccountID,
			AccountCode: item.AccountCode,
			AccountName: item.AccountName,
			Debit:       item.Debit,
			Credit:      item.Credit,
			Description: item.Description,
		}
	}

	result, err := h.journalUsecase.CreateManualEntry(entry, items, outletID, userID)
	if err != nil {
		log.Printf("[ERROR] CreateJournal failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, result)
}

func (h *JournalHandler) PostJournal(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid journal ID"})
		return
	}
	if err := h.journalUsecase.PostEntry(uint(id)); err != nil {
		log.Printf("[ERROR] PostJournal failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Journal entry posted successfully"})
}

func (h *JournalHandler) VoidJournal(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid journal ID"})
		return
	}
	if err := h.journalUsecase.VoidEntry(uint(id)); err != nil {
		log.Printf("[ERROR] VoidJournal failed: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Journal entry voided successfully"})
}

func (h *JournalHandler) GetTrialBalance(c *gin.Context) {
	outletID := getOutletID(c)
	start := c.Query("start")
	if start == "" {
		start = c.Query("start_date")
	}
	end := c.Query("end")
	if end == "" {
		end = c.Query("end_date")
	}

	rows, err := h.journalUsecase.GetTrialBalance(start, end, outletID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch trial balance"})
		return
	}
	c.JSON(http.StatusOK, rows)
}

func (h *JournalHandler) GetBalanceSheet(c *gin.Context) {
	outletID := getOutletID(c)
	asOf := c.Query("as_of")
	if asOf == "" {
		asOf = c.Query("as_of_date")
	}
	if asOf == "" {
		asOf = fmt.Sprintf("%d-12-31", time.Now().Year())
	}

	allItems, err := h.journalUsecase.GetBalanceSheet(asOf, outletID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch balance sheet"})
		return
	}

	// Categorize items by account type
	var assets, liabilities, equity []entity.BalanceSheetItem
	var totalAssets, totalLiabilities, totalEquity int64
	for _, item := range allItems {
		switch item.AccountType {
		case "asset":
			assets = append(assets, item)
			totalAssets += item.Amount
		case "liability":
			liabilities = append(liabilities, item)
			totalLiabilities += item.Amount
		case "equity":
			equity = append(equity, item)
			totalEquity += item.Amount
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"assets":           assets,
		"liabilities":      liabilities,
		"equity":           equity,
		"total_assets":     totalAssets,
		"total_liabilities": totalLiabilities,
		"total_equity":     totalEquity,
	})
}

func (h *JournalHandler) GetIncomeStatement(c *gin.Context) {
	outletID := getOutletID(c)
	start := c.Query("start")
	if start == "" {
		start = c.Query("start_date")
	}
	end := c.Query("end")
	if end == "" {
		end = c.Query("end_date")
	}

	allItems, err := h.journalUsecase.GetIncomeStatement(start, end, outletID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch income statement"})
		return
	}

	// Transform [{Category, Items, Total}] into {revenue:[], expenses:[], totals}
	var revenueItems, expenseItems []entity.IncomeStatementLine
	var totalRevenue, totalExpenses int64
	for _, item := range allItems {
		switch item.Category {
		case "Revenue":
			revenueItems = item.Items
			totalRevenue = item.Total
		case "Expenses":
			expenseItems = item.Items
			totalExpenses = item.Total
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"revenue":        revenueItems,
		"expenses":       expenseItems,
		"total_revenue":  totalRevenue,
		"total_expenses": totalExpenses,
		"net_income":     totalRevenue - totalExpenses,
	})
}

func (h *JournalHandler) GetCashFlow(c *gin.Context) {
	outletID := getOutletID(c)
	start := c.Query("start")
	if start == "" {
		start = c.Query("start_date")
	}
	end := c.Query("end")
	if end == "" {
		end = c.Query("end_date")
	}

	allItems, err := h.journalUsecase.GetCashFlow(start, end, outletID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch cash flow"})
		return
	}

	// Transform [{Category, Description, Amount}] into categorized object
	var operating, investing, financing []entity.CashFlowItem
	var netOperating, netInvesting, netFinancing int64
	for _, item := range allItems {
		switch item.Category {
		case "Operating":
			operating = append(operating, item)
			netOperating += item.Amount
		case "Investing":
			investing = append(investing, item)
			netInvesting += item.Amount
		case "Financing":
			financing = append(financing, item)
			netFinancing += item.Amount
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"operating":      operating,
		"investing":      investing,
		"financing":      financing,
		"net_operating":  netOperating,
		"net_investing":  netInvesting,
		"net_financing":  netFinancing,
	})
}

func (h *JournalHandler) GetGeneralLedger(c *gin.Context) {
	outletID := getOutletID(c)
	accountID, err := strconv.ParseUint(c.Query("account_id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid account ID"})
		return
	}
	start := c.Query("start")
	if start == "" {
		start = c.Query("start_date")
	}
	end := c.Query("end")
	if end == "" {
		end = c.Query("end_date")
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	rows, err := h.journalUsecase.GetGeneralLedger(uint(accountID), start, end, limit, offset, outletID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch general ledger"})
		return
	}
	c.JSON(http.StatusOK, rows)
}
