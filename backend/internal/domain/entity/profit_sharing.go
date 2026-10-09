package entity

import "time"

type ProfitSharingPeriod struct {
	ID            uint      `json:"id"`
	OutletID      uint      `json:"outlet_id"`
	PeriodStart   time.Time `json:"period_start"`
	PeriodEnd     time.Time `json:"period_end"`
	BasisAmount   float64   `json:"basis_amount"`
	TotalExpenses float64   `json:"total_expenses"`
	TotalCogs     float64   `json:"total_cogs"`
	NetProfit     float64   `json:"net_profit"`
	Ratio         float64   `json:"ratio"`
	KeeperAmount  float64   `json:"keeper_amount"`
	OwnerAmount   float64   `json:"owner_amount"`
	Status            string                `json:"status"`
	PerProduct        string                `json:"per_product"`
	ExpensesBreakdown string                `json:"expenses_breakdown"`
	PaymentNote       string                `json:"payment_note"`
	TaxNote           string                `json:"tax_note"`
	BasisType         string                `json:"basis_type"`
	OwnerPct          float64               `json:"owner_pct"`
	PoolPct           float64               `json:"pool_pct"`
	RatioEffectiveDate *time.Time           `json:"ratio_effective_date"`
	RatioLockedAt     *time.Time            `json:"ratio_locked_at"`
	RoundingRemainder float64               `json:"rounding_remainder"`
	People            []ProfitSharingPerson `json:"people"`
	CreatedAt         time.Time             `json:"created_at"`
	UpdatedAt         time.Time             `json:"updated_at"`
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type BaristaCashbon struct {
	ID            uint      `json:"id"`
	OutletID      uint      `json:"outlet_id"`
	PersonID      uint      `json:"person_id"`
	BaristaName   string    `json:"barista_name"`
	Amount        float64   `json:"amount"`
	CashbonDate   time.Time `json:"cashbon_date"`
	PaymentMethod string    `json:"payment_method"` // Cash, Transfer, Lainnya
	Reason        string    `json:"reason"`
	Status        string    `json:"status"` // pending, deducted, settled
	PeriodID      uint      `json:"period_id"`
	RemainingBalance float64 `json:"remaining_balance"`
	RecordedBy    uint      `json:"recorded_by"`
	ApprovedBy    *uint     `json:"approved_by"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type ShiftConfig struct {
	ID             uint      `json:"id"`
	OutletID       uint      `json:"outlet_id"`
	Name           string    `json:"name"`
	Kode           string    `json:"kode"`
	StartTime      string    `json:"start_time"` // "07:00" WIB
	EndTime        string    `json:"end_time"`   // "14:00" WIB
	OwnerPct       float64   `json:"owner_pct"`
	BaristaPoolPct float64   `json:"barista_pool_pct"`
	IsActive       bool      `json:"is_active"`
	SortOrder      int       `json:"sort_order"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type ProfitSharingPerson struct {
	ID               uint             `json:"id"`
	PeriodID         uint             `json:"period_id"`
	Name             string           `json:"name"`
	Role             string           `json:"role"`
	SharePct         float64          `json:"share_pct"`
	GrossAmount      float64          `json:"gross_amount"`
	LeaveReduction   float64          `json:"leave_reduction"`
	CashbonReduction float64          `json:"cashbon_reduction"`
	Amount           float64          `json:"amount"` // Jatah bersih diterima
	IsOnLeave        bool             `json:"is_on_leave"`
	LeaveDays        int              `json:"leave_days"`
	LeaveDates       string           `json:"leave_dates"`            // Legacy: comma-separated leave dates (for backward compatibility)
	RemainingBalance float64          `json:"remaining_balance"`      // B6: sisa kasbon dibawa ke periode berikut
	Attendance       string           `json:"attendance,omitempty"`   // JSON: map[date][]shiftID - e.g., {"2026-10-01":[1,2],"2026-10-02":[1]}
	ShiftIDs         []uint           `json:"shift_ids,omitempty"`    // Default shifts assigned to this barista (for multi-shift periods)
	ShiftNames       []string         `json:"shift_names,omitempty"`
	ShiftPoolPcts    []float64        `json:"shift_pool_pcts,omitempty"`
	Cashbons         []BaristaCashbon `json:"cashbons,omitempty" gorm:"-"`
	CreatedAt        time.Time        `json:"created_at"`
	UpdatedAt        time.Time        `json:"updated_at"`
}

type ProductSharingDetail struct {
	ProductID   uint    `json:"product_id"`
	ProductName string  `json:"product_name"`
	Revenue     float64 `json:"revenue"`
	Cogs        float64 `json:"cogs"`
	GrossMargin float64 `json:"gross_margin"`
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
type ExpenseBreakdown struct {
	ID            uint    `json:"id"`
	Date          string  `json:"date"`
	Title         string  `json:"title"`
	Category      string  `json:"category"`
	Amount        float64 `json:"amount"`
	PaymentMethod string  `json:"payment_method"`
	Note          string  `json:"note"`
	IsDeducted    bool    `json:"is_deducted"`
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
// DailyShiftFigure adalah revenue + COGS satu tanggal dalam satu jendela jam shift.
type DailyShiftFigure struct {
	Tanggal string  `json:"tanggal"`
	Revenue float64 `json:"revenue"`
	Cogs    float64 `json:"cogs"`
}

// ShiftDailyDetail adalah hasil bagi pool untuk satu tanggal dalam satu shift.
type ShiftDailyDetail struct {
	Tanggal         string   `json:"tanggal"`
	Revenue         float64  `json:"revenue"`
	Pool            float64  `json:"pool"`
	JumlahPembagi   int      `json:"jumlah_pembagi"`
	DaftarPembagi   []string `json:"daftar_pembagi"`
	JumlahDibagikan float64  `json:"jumlah_dibagikan"`
	SisaKas         float64  `json:"sisa_kas"`
}

// ShiftBreakdown adalah rincian perhitungan Two-Tier per shift pada mode multi-shift.
type ShiftBreakdown struct {
	ShiftID      uint    `json:"shift_id"`
	ShiftName    string  `json:"shift_name"`
	StartTime    string  `json:"start_time"`
	EndTime      string  `json:"end_time"`
	Revenue      float64 `json:"revenue"`
	Cogs         float64 `json:"cogs"`
	Expenses     float64 `json:"expenses"`
	GrossMargin  float64 `json:"gross_margin"`
	NetProfit    float64 `json:"net_profit"`
	SharingBasis float64 `json:"sharing_basis"`
	OwnerPct     float64 `json:"owner_pct"`
	OwnerShare   float64 `json:"owner_share"`
	BaristaPool  float64 `json:"barista_pool"`
	// B2/B3: equal-split — pembagi = barista hadir-disahkan; sisa rupiah ke kas.
	JumlahPembagi  int      `json:"jumlah_pembagi"`
	DaftarPembagi  []string `json:"daftar_pembagi"`
	SisaKas        float64  `json:"sisa_kas"`
	JumlahDibagikan float64 `json:"jumlah_dibagikan"`
	// Per-tanggal: pool dibagi per kejadian shift harian, lalu diakumulasi.
	// JumlahPembagi/DaftarPembagi di atas = gabungan unik lintas tanggal.
	TotalHari     int                `json:"total_hari"`
	RincianHarian []ShiftDailyDetail `json:"rincian_harian,omitempty"`
}

type Calculation struct {
	BasisAmount   float64               `json:"basis_amount"`
	Tax           float64               `json:"tax"`
	ServiceFee    float64               `json:"service_fee"`
	NetRevenue    float64               `json:"net_revenue"`
	TotalCogs     float64               `json:"total_cogs"`
	GrossProfit   float64               `json:"gross_profit"`
	TotalExpenses float64               `json:"total_expenses"`
	NetProfit     float64               `json:"net_profit"`
	Ratio         float64               `json:"ratio"`
	KeeperShare   float64               `json:"keeper_share"`
	OwnerShare    float64               `json:"owner_share"`
	Breakdown     []ExpenseBreakdown    `json:"breakdown"`
	PerProduct    []ProductSharingDetail `json:"per_product"`
	Status        string                `json:"status"`
	Note          string                `json:"note"`
	SisaKas       float64               `json:"sisa_kas"`
	// Rekonsiliasi shift-vs-periode: pendapatan/COGS yang tidak terpetakan ke
	// jendela jam shift mana pun (mis. celah 19:00–19:01). Bukan error fatal,
	// tapi wajib tampil eksplisit agar tidak ada selisih tersembunyi.
	SelisihPendapatan float64 `json:"selisih_pendapatan"`
	SelisihCogs       float64 `json:"selisih_cogs"`
	// DihitungPada menandai kapan angka ini dihitung (deteksi respons basi).
	DihitungPada    string                `json:"dihitung_pada"`
	BasisType     string                `json:"basis_type"`
	OwnerPct      float64               `json:"owner_pct"`
	People        []ProfitSharingPerson `json:"people"`
	// Vetted by AI - Manual Review Required by Senior Engineer/Manager
	// Shifts berisi rincian Two-Tier per shift (hanya terisi pada mode multi-shift).
	Shifts []ShiftBreakdown `json:"shifts,omitempty"`
}

type ProfitSharingPreview struct {
	Period      ProfitSharingPeriod `json:"period"`
	Calculation Calculation         `json:"calculation"`
}
