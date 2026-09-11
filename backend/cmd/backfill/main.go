package main

import (
	"database/sql"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

type accountRow struct {
	ID   uint
	Code string
	Name string
}

type orderRow struct {
	ID            uint
	TotalAmount   float64
	PaymentMethod string
	PaymentStatus string
	Status        string
	OrderTime     time.Time
	OutletID      uint
}

type orderItemRow struct {
	Price float64
	Cost  float64
}

type expenseRow struct {
	ID       uint
	Title    string
	Amount   float64
	Category string
	Date     time.Time
	OutletID uint
}

type journalItem struct {
	AccountID   uint
	AccountCode string
	AccountName string
	Debit       int64
	Credit      int64
	Description string
	OutletID    uint
}

type journalEntry struct {
	EntryNumber string
	Date        time.Time
	Description string
	SourceType  string
	SourceID    uint
	Status      string
	OutletID    uint
	Items       []journalItem
}

func main() {
	dryRun := flag.Bool("dry-run", false, "Print SQL without executing")
	all := flag.Bool("all", false, "Run all phases (accounts + orders + expenses + voids)")
	doAccounts := flag.Bool("accounts", false, "Phase 0.5: Seed PSAK accounts per outlet")
	doOrders := flag.Bool("orders", false, "Phase 1: Backfill completed orders")
	doExpenses := flag.Bool("expenses", false, "Phase 2: Backfill expenses + inventory auto-expenses")
	doVoids := flag.Bool("voids", false, "Phase 3: Backfill voided orders (original + reversal)")
	outletID := flag.Uint("outlet-id", 0, "Outlet ID to backfill (0 = all outlets)")
	limit := flag.Int("limit", 500, "Max records per batch")
	flag.Parse()

	if !*all && !*doAccounts && !*doOrders && !*doExpenses && !*doVoids {
		fmt.Println("Usage: go run cmd/backfill/main.go [flags]")
		fmt.Println("  --all          Run all phases")
		fmt.Println("  --accounts     Phase 0.5: Seed PSAK accounts")
		fmt.Println("  --orders       Phase 1: Backfill orders")
		fmt.Println("  --expenses     Phase 2: Backfill expenses")
		fmt.Println("  --voids        Phase 3: Backfill voided orders")
		fmt.Println("  --dry-run      Print SQL without executing")
		fmt.Println("  --outlet-id    Outlet ID (0 = all)")
		fmt.Println("  --limit        Batch size (default 500)")
		os.Exit(0)
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}
	db, err := sql.Open("mysql", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	db.SetMaxOpenConns(2)

	// PLACEHOLDER_RUN

	if *all || *doAccounts {
		seedAccounts(db, *outletID, *dryRun)
	}
	if *all || *doOrders {
		backfillOrders(db, *outletID, *limit, *dryRun)
	}
	if *all || *doExpenses {
		backfillExpenses(db, *outletID, *limit, *dryRun)
	}
	if *all || *doVoids {
		backfillVoids(db, *outletID, *limit, *dryRun)
	}
}

func execOrPrint(db *sql.DB, query string, args []interface{}, dryRun bool) error {
	if dryRun {
		fmt.Printf("SQL: %s %v\n", query, args)
		return nil
	}
	_, err := db.Exec(query, args...)
	return err
}

func outletIDs(db *sql.DB, filter uint) ([]uint, error) {
	var rows *sql.Rows
	var err error
	if filter > 0 {
		rows, err = db.Query("SELECT id FROM outlets WHERE id = ?", filter)
	} else {
		rows, err = db.Query("SELECT id FROM outlets")
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var ids []uint
	for rows.Next() {
		var id uint
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, nil
}

func accountMap(db *sql.DB, outletID uint) (map[string]accountRow, error) {
	rows, err := db.Query("SELECT id, code, name FROM psak_accounts WHERE outlet_id = ? AND is_active = 1", outletID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	m := make(map[string]accountRow)
	for rows.Next() {
		var a accountRow
		if err := rows.Scan(&a.ID, &a.Code, &a.Name); err != nil {
			return nil, err
		}
		m[a.Code] = a
	}
	return m, nil
}

func getMaxEntryNumber(db *sql.DB, prefix string) (int, error) {
	var maxNum int
	row := db.QueryRow("SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number, LENGTH(?) + 2) AS UNSIGNED)), 0) FROM psak_journal_entries WHERE entry_number LIKE ?", prefix, prefix+"-%")
	if err := row.Scan(&maxNum); err != nil {
		return 0, err
	}
	return maxNum, nil
}

func nextBackfillNumber(db *sql.DB, date time.Time) string {
	prefix := fmt.Sprintf("BACKFILL-%s", date.Format("20060102"))
	maxNum, _ := getMaxEntryNumber(db, prefix)
	return fmt.Sprintf("%s-%03d", prefix, maxNum+1)
}

func hasDuplicate(db *sql.DB, sourceType string, sourceID uint) (bool, error) {
	var count int
	err := db.QueryRow("SELECT COUNT(*) FROM psak_journal_entries WHERE source_type = ? AND source_id = ?", sourceType, sourceID).Scan(&count)
	return count > 0, err
}

func insertJournal(db *sql.DB, j journalEntry, dryRun bool) error {
	if dryRun {
		itemsJSON, _ := json.MarshalIndent(j.Items, "  ", "  ")
		fmt.Printf("JOURNAL: %s | %s | %s | source_id=%d\n  Items: %s\n", j.EntryNumber, j.Date.Format("2006-01-02"), j.Description, j.SourceID, string(itemsJSON))
		return nil
	}
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	res, err := tx.Exec(
		"INSERT INTO psak_journal_entries (entry_number, date, description, source_type, source_id, status, outlet_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		j.EntryNumber, j.Date, j.Description, j.SourceType, j.SourceID, j.Status, j.OutletID, time.Now(), time.Now(),
	)
	if err != nil {
		return fmt.Errorf("insert journal entry: %w", err)
	}
	entryID, _ := res.LastInsertId()
	for _, item := range j.Items {
		if _, err := tx.Exec(
			"INSERT INTO psak_journal_entry_items (journal_entry_id, account_id, account_code, account_name, debit, credit, description, outlet_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			entryID, item.AccountID, item.AccountCode, item.AccountName, item.Debit, item.Credit, item.Description, item.OutletID, time.Now(), time.Now(),
		); err != nil {
			return fmt.Errorf("insert journal item: %w", err)
		}
	}
	return tx.Commit()
}

func seedAccounts(db *sql.DB, filterOutlet uint, dryRun bool) {
	log.Println("=== Phase 0.5: Seeding PSAK accounts ===")
	ids, err := outletIDs(db, filterOutlet)
	if err != nil {
		log.Fatalf("Failed to query outlets: %v", err)
	}

	defaults := []struct{ code, name, typ string }{
		{"1101", "Kas", "asset"}, {"1102", "Piutang Usaha", "asset"}, {"1103", "Persediaan", "asset"},
		{"1201", "Peralatan", "asset"}, {"1202", "Akumulasi Depresiasi", "asset"},
		{"2101", "Utang Usaha", "liability"}, {"2102", "Utang Pajak (PPN)", "liability"},
		{"3101", "Modal Usaha", "equity"}, {"3102", "Laba Ditahan", "equity"},
		{"4101", "Pendapatan Penjualan", "revenue"}, {"4102", "Pendapatan Service", "revenue"},
		{"5101", "HPP / Beban Pokok", "expense"}, {"5201", "Beban Operasional", "expense"},
		{"5202", "Beban Gaji", "expense"}, {"5203", "Beban Sewa", "expense"},
		{"5204", "Beban Listrik & Air", "expense"}, {"5205", "Beban Depresiasi", "expense"},
	}

	for _, oid := range ids {
		var created int
		for _, d := range defaults {
			var count int
			db.QueryRow("SELECT COUNT(*) FROM psak_accounts WHERE code = ? AND outlet_id = ?", d.code, oid).Scan(&count)
			if count > 0 {
				continue
			}
			if dryRun {
				fmt.Printf("SEED: %s (%s) for outlet %d\n", d.code, d.name, oid)
			} else {
				db.Exec("INSERT INTO psak_accounts (code, name, type, is_active, outlet_id, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)",
					d.code, d.name, d.typ, oid, time.Now(), time.Now())
			}
			created++
		}
		log.Printf("Outlet %d: seeded %d accounts", oid, created)
	}
}

func backfillOrders(db *sql.DB, filterOutlet uint, limit int, dryRun bool) {
	log.Println("=== Phase 1: Backfilling orders ===")
	ids, err := outletIDs(db, filterOutlet)
	if err != nil {
		log.Fatalf("Failed to query outlets: %v", err)
	}

	for _, oid := range ids {
		accounts, err := accountMap(db, oid)
		if err != nil {
			log.Printf("Outlet %d: failed to load accounts: %v", oid, err)
			continue
		}
		kas := accounts["1101"]
	_hpp := accounts["5101"]
		rev := accounts["4101"]

		offset := 0
		processed := 0
		for {
			rows, err := db.Query(
				"SELECT id, total_amount, payment_method, payment_status, status, order_time, outlet_id FROM orders WHERE outlet_id = ? AND status = 'Completed' AND payment_status = 'Paid' ORDER BY id ASC LIMIT ? OFFSET ?",
				oid, limit, offset,
			)
			if err != nil {
				log.Printf("Outlet %d: query orders failed: %v", oid, err)
				break
			}

			for rows.Next() {
				var o orderRow
				if err := rows.Scan(&o.ID, &o.TotalAmount, &o.PaymentMethod, &o.PaymentStatus, &o.Status, &o.OrderTime, &o.OutletID); err != nil {
					log.Printf("Outlet %d: scan order failed: %v", oid, err)
					continue
				}

				dup, _ := hasDuplicate(db, "order", o.ID)
				if dup {
					continue
				}

				// Fetch order items for COGS calculation
				itemRows, err := db.Query("SELECT price, cost FROM order_items WHERE order_id = ?", o.ID)
				if err != nil {
					log.Printf("Outlet %d: query items for order %d failed: %v", oid, o.ID, err)
					continue
				}
				var revenue, cogs float64
				for itemRows.Next() {
					var item orderItemRow
					if err := itemRows.Scan(&item.Price, &item.Cost); err != nil {
						continue
					}
					revenue += item.Price
					cogs += item.Cost
				}
				itemRows.Close()

				revenueInt := int64(revenue)
				cogsInt := int64(cogs)
				desc := fmt.Sprintf("Order #%d", o.ID)

				var items []journalItem
				if revenueInt > 0 {
					items = append(items, journalItem{
						AccountID: kas.ID, AccountCode: kas.Code, AccountName: kas.Name,
						Credit: revenueInt, Description: desc, OutletID: oid,
					})
					items = append(items, journalItem{
						AccountID: rev.ID, AccountCode: rev.Code, AccountName: rev.Name,
						Debit: revenueInt, Description: desc, OutletID: oid,
					})
				}
				if cogsInt > 0 {
					items = append(items, journalItem{
						AccountID: _hpp.ID, AccountCode: _hpp.Code, AccountName: _hpp.Name,
						Debit: cogsInt, Description: fmt.Sprintf("HPP Order #%d", o.ID), OutletID: oid,
					})
					items = append(items, journalItem{
						AccountID: kas.ID, AccountCode: kas.Code, AccountName: kas.Name,
						Credit: cogsInt, Description: fmt.Sprintf("HPP Order #%d", o.ID), OutletID: oid,
					})
				}

				if len(items) == 0 {
					continue
				}

				j := journalEntry{
					EntryNumber: nextBackfillNumber(db, o.OrderTime),
					Date:        o.OrderTime,
					Description: desc,
					SourceType:  "order",
					SourceID:    o.ID,
					Status:      "posted",
					OutletID:    oid,
					Items:       items,
				}
				if err := insertJournal(db, j, dryRun); err != nil {
					log.Printf("Outlet %d: insert journal for order %d failed: %v", oid, o.ID, err)
				} else {
					processed++
				}
			}
			rows.Close()

			if processed == 0 {
				break
			}
			offset += limit
		}
		log.Printf("Outlet %d: backfilled %d orders", oid, processed)
	}
}

func backfillExpenses(db *sql.DB, filterOutlet uint, limit int, dryRun bool) {
	log.Println("=== Phase 2: Backfilling expenses ===")
	ids, err := outletIDs(db, filterOutlet)
	if err != nil {
		log.Fatalf("Failed to query outlets: %v", err)
	}

	for _, oid := range ids {
		accounts, err := accountMap(db, oid)
		if err != nil {
			log.Printf("Outlet %d: failed to load accounts: %v", oid, err)
			continue
		}
		kas := accounts["1101"]
		beban := accounts["5201"]

		offset := 0
		processed := 0
		for {
			rows, err := db.Query(
				"SELECT id, title, amount, category, date, outlet_id FROM expenses WHERE outlet_id = ? ORDER BY id ASC LIMIT ? OFFSET ?",
				oid, limit, offset,
			)
			if err != nil {
				log.Printf("Outlet %d: query expenses failed: %v", oid, err)
				break
			}

			for rows.Next() {
				var e expenseRow
				if err := rows.Scan(&e.ID, &e.Title, &e.Amount, &e.Category, &e.Date, &e.OutletID); err != nil {
					log.Printf("Outlet %d: scan expense failed: %v", oid, err)
					continue
				}

				dup, _ := hasDuplicate(db, "expense", e.ID)
				if dup {
					continue
				}

				amountInt := int64(e.Amount)
				if amountInt == 0 {
					continue
				}

				desc := fmt.Sprintf("Pengeluaran: %s", e.Title)
				j := journalEntry{
					EntryNumber: nextBackfillNumber(db, e.Date),
					Date:        e.Date,
					Description: desc,
					SourceType:  "expense",
					SourceID:    e.ID,
					Status:      "posted",
					OutletID:    oid,
					Items: []journalItem{
						{AccountID: beban.ID, AccountCode: beban.Code, AccountName: beban.Name, Debit: amountInt, Description: desc, OutletID: oid},
						{AccountID: kas.ID, AccountCode: kas.Code, AccountName: kas.Name, Credit: amountInt, Description: desc, OutletID: oid},
					},
				}
				if err := insertJournal(db, j, dryRun); err != nil {
					log.Printf("Outlet %d: insert journal for expense %d failed: %v", oid, e.ID, err)
				} else {
					processed++
				}
			}
			rows.Close()

			if processed == 0 {
				break
			}
			offset += limit
		}
		log.Printf("Outlet %d: backfilled %d expenses", oid, processed)
	}
}

func backfillVoids(db *sql.DB, filterOutlet uint, limit int, dryRun bool) {
	log.Println("=== Phase 3: Backfilling voided orders ===")
	ids, err := outletIDs(db, filterOutlet)
	if err != nil {
		log.Fatalf("Failed to query outlets: %v", err)
	}

	for _, oid := range ids {
		accounts, err := accountMap(db, oid)
		if err != nil {
			log.Printf("Outlet %d: failed to load accounts: %v", oid, err)
			continue
		}
		kas := accounts["1101"]
		rev := accounts["4101"]
		_hpp := accounts["5101"]

		offset := 0
		processed := 0
		for {
			rows, err := db.Query(
				"SELECT id, total_amount, order_time, outlet_id FROM orders WHERE outlet_id = ? AND status = 'Void' ORDER BY id ASC LIMIT ? OFFSET ?",
				oid, limit, offset,
			)
			if err != nil {
				log.Printf("Outlet %d: query voids failed: %v", oid, err)
				break
			}

			for rows.Next() {
				var o orderRow
				if err := rows.Scan(&o.ID, &o.TotalAmount, &o.OrderTime, &o.OutletID); err != nil {
					log.Printf("Outlet %d: scan void failed: %v", oid, err)
					continue
				}

				dup, _ := hasDuplicate(db, "order", o.ID)
				if dup {
					continue
				}

				// Fetch order items for COGS
				itemRows, err := db.Query("SELECT price, cost FROM order_items WHERE order_id = ?", o.ID)
				if err != nil {
					continue
				}
				var revenue, cogs float64
				for itemRows.Next() {
					var item orderItemRow
					if err := itemRows.Scan(&item.Price, &item.Cost); err != nil {
						continue
					}
					revenue += item.Price
					cogs += item.Cost
				}
				itemRows.Close()

				revenueInt := int64(revenue)
				cogsInt := int64(cogs)
				desc := fmt.Sprintf("Order #%d (VOID)", o.ID)

				var items []journalItem
				// Original entry (dr Kas, cr Revenue)
				if revenueInt > 0 {
					items = append(items, journalItem{
						AccountID: kas.ID, AccountCode: kas.Code, AccountName: kas.Name,
						Debit: revenueInt, Description: desc, OutletID: oid,
					})
					items = append(items, journalItem{
						AccountID: rev.ID, AccountCode: rev.Code, AccountName: rev.Name,
						Credit: revenueInt, Description: desc, OutletID: oid,
					})
				}
				// Reversal (dr Revenue, cr Kas)
				if revenueInt > 0 {
					items = append(items, journalItem{
						AccountID: rev.ID, AccountCode: rev.Code, AccountName: rev.Name,
						Debit: revenueInt, Description: fmt.Sprintf("Reversal Order #%d", o.ID), OutletID: oid,
					})
					items = append(items, journalItem{
						AccountID: kas.ID, AccountCode: kas.Code, AccountName: kas.Name,
						Credit: revenueInt, Description: fmt.Sprintf("Reversal Order #%d", o.ID), OutletID: oid,
					})
				}
				// Reversal COGS if applicable
				if cogsInt > 0 {
					items = append(items, journalItem{
						AccountID: _hpp.ID, AccountCode: _hpp.Code, AccountName: _hpp.Name,
						Credit: cogsInt, Description: fmt.Sprintf("Reversal HPP Order #%d", o.ID), OutletID: oid,
					})
					items = append(items, journalItem{
						AccountID: kas.ID, AccountCode: kas.Code, AccountName: kas.Name,
						Debit: cogsInt, Description: fmt.Sprintf("Reversal HPP Order #%d", o.ID), OutletID: oid,
					})
				}

				if len(items) == 0 {
					continue
				}

				j := journalEntry{
					EntryNumber: nextBackfillNumber(db, o.OrderTime),
					Date:        o.OrderTime,
					Description: desc,
					SourceType:  "order",
					SourceID:    o.ID,
					Status:      "posted",
					OutletID:    oid,
					Items:       items,
				}
				if err := insertJournal(db, j, dryRun); err != nil {
					log.Printf("Outlet %d: insert journal for void %d failed: %v", oid, o.ID, err)
				} else {
					processed++
				}
			}
			rows.Close()

			if processed == 0 {
				break
			}
			offset += limit
		}
		log.Printf("Outlet %d: backfilled %d voided orders", oid, processed)
	}
}


