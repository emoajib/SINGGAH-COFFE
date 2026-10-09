// ─── User ───────────────────────────────────────────────────────────────────
export interface User {
  id: number
  name: string
  email: string
  role: 'owner' | 'manager' | 'cashier'
}

// ─── Auth ───────────────────────────────────────────────────────────────────
export interface AuthResponse {
  token: string
  user: User
}
export interface LoginRequest {
  email: string
  password: string
}
export interface UpdateProfileRequest {
  name?: string
  email?: string
}
export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

// ─── Product ────────────────────────────────────────────────────────────────
export interface Product {
  id: number
  name: string
  category: string
  price: number
  cost: number
  stock: number
  sku: string
  image_url: string
  description: string
  recipe: RecipeItem[]
  created_at?: string
  updated_at?: string
}

export interface ProductCard {
  id: number
  name: string
  price: number
  category: string
  stock: number
  image_url?: string
}

export interface RecipeItem {
  ingredient_id: number
  ingredient_name?: string
  quantity: number
  unit?: string
}

export interface CreateProductRequest {
  name: string
  category: string
  price: number
  cost: number
  sku: string
  image_url: string
  description: string
  recipe: { ingredient_id: number; quantity: number }[]
}

// ─── Ingredient ─────────────────────────────────────────────────────────────
export interface Ingredient {
  id: number
  name: string
  category: string
  unit: string
  purchase_unit: string
  purchase_unit_size: number
  current_stock: number
  warehouse_stock: number  // Stok di gudang utama
  kedai_stock: number      // Stok operasional bar/kedai
  min_stock: number
  cost_per_unit: number
  created_at?: string
  updated_at?: string
}

export interface CreateIngredientRequest {
  name: string
  category: string
  unit: string
  purchase_unit: string
  purchase_unit_size: number
  current_stock: number
  min_stock: number
  cost_per_unit: number
}

// ─── Stock Mutation ─────────────────────────────────────────────────────────

/** Request payload for creating a stock mutation */
export interface CreateStockMutationRequest {
  ingredient_id: number
  type: 'IN' | 'OUT' | 'ADJ_ADD' | 'ADJ_SUB'
  quantity: number
  notes?: string
  is_purchase?: boolean
  update_master_price?: boolean
  new_cost_per_unit?: number
  location?: string  // 'warehouse' | 'kedai' (default: 'kedai')
}

// ─── Low Stock Alert ─────────────────────────────────────────────────────────
export interface LowStockAlert {
  count: number
  alerts: Ingredient[]
}

/** Response shape for a stock mutation record */
export interface StockMutation {
  id: number
  ingredient_id: number
  ingredient_name: string
  type: 'IN' | 'OUT' | 'ADJ_ADD' | 'ADJ_SUB' | 'TRANSFER'
  location?: string       // warehouse, kedai
  from_location?: string  // untuk TRANSFER
  to_location?: string    // untuk TRANSFER
  quantity: number
  notes: string
  date: string
  created_at: string
  reference_id?: string
}

// ─── Order ──────────────────────────────────────────────────────────────────
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export interface Order {
  id: number
  order_number: string
  total_amount: number
  payment_method: string
  payment_status: string
  payment_ref?: string
  status: string
  user_id: number
  cashier_name: string
  items: OrderItem[]
  order_time: string
  created_at: string
  updated_at: string
  customer_name?: string
  customer_phone?: string
  queue_number?: number
  kitchen_status?: 'queued' | 'preparing' | 'ready' | 'served' | 'unpaid' | 'waiting_payment'
  preparation_notes?: string
  order_source?: string
  pickup_code?: string
  tracking_token?: string
  queued_at?: string
  preparing_at?: string
  ready_at?: string
  served_at?: string
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  product: Product
  quantity: number
  price: number
  cost: number
  notes?: string
}

export interface CreateOrderRequest {
  order_number?: string
  payment_method: string
  cashier_name?: string
  customer_email?: string
  customer_name?: string
  customer_phone?: string
  preparation_notes?: string
  items: { product_id: number; quantity: number }[]
}

// ─── Customer Self-Order (Public Mobile) ──────────────────────────────────
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export interface PublicMenuItem {
  id: number
  name: string
  category: string
  price: number
  image_url: string
  description: string
  available: boolean
}

export interface PublicMenuResponse {
  store_name?: string
  outlet_name?: string
  logo_url?: string
  self_order_enabled: boolean
  categories: string[]
  items: PublicMenuItem[]
  products?: PublicMenuItem[]
}

export interface PublicOrderItemRequest {
  product_id: number
  quantity: number
  notes?: string
}

export interface PublicCreateOrderRequest {
  customer_name: string
  customer_phone?: string
  notes?: string
  items: PublicOrderItemRequest[]
}

export interface PublicOrderItemSummary {
  product_name: string
  quantity: number
  price: number
  subtotal: number
  notes?: string
}

export interface PublicOrderCreateResponse {
  order_number: string
  pickup_code: string
  tracking_token: string
  customer_name: string
  total_amount: number
  item_count: number
  status: string
  payment_status: string
  kitchen_status: string
  order_time: string
  items: PublicOrderItemSummary[]
}

export interface PublicOrderStatusResponse {
  store_name?: string
  logo_url?: string
  order_number: string
  pickup_code: string
  queue_number: number
  customer_name: string
  status: string
  payment_status: string
  kitchen_status: string
  total_amount: number
  order_time: string
  items: PublicOrderItemSummary[]
}

// ─── Expense ────────────────────────────────────────────────────────────────
export interface Expense {
  id: number
  title: string
  amount: number
  category: string
  cost_type: string
  payment_method?: 'Cash' | 'QRIS' | 'Lainnya'
  date: string
  description?: string
  notes?: string
  outlet_id?: number
  created_at?: string
}

// ─── Setting ────────────────────────────────────────────────────────────────
export interface Setting {
  id: number
  key: string
  value: string
  group: string
  created_at?: string
  updated_at?: string
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
export interface BEPResponse {
  report: BEPReport
  forecast: BEPForecast
  sensitivity: SensitivityMatrix | null
  monte_carlo: MonteCarloResult | null
  early_warning: EarlyWarning
}

export interface BEPReport {
  period: string
  total_revenue: number
  total_variable_cost: number
  total_fixed_cost: number
  contribution_margin: number
  cm_ratio: number
  avg_selling_price: number
  avg_variable_cost: number
  bep_units: number
  bep_revenue: number
  bep_daily_units: number
  margin_of_safety: number
  daily_target: number
  current_daily_avg: number
  status: string
  per_product: ProductMargin[]
  fixed_cost_breakdown: FixedCostItem[]
  // Capital analysis
  initial_capital: number
  amortization_months: number
  amortized_monthly_capital: number
  net_profit: number
  payback_period_months: number
  payback_label: string
  roi_annual: number
  bep_with_capital_units: number
  bep_with_capital_revenue: number
}

export interface ProductMargin {
  product_id: number
  product_name: string
  category: string
  selling_price: number
  variable_cost: number
  contribution_margin: number
  margin_ratio: number
  units_sold: number
  revenue: number
  rank: number
}

export interface FixedCostItem {
  name: string
  amount: number
}

export interface BEPForecast {
  period: string
  predicted_revenue: number
  predicted_units: number
  confidence_lower: number
  confidence_upper: number
  probability_above_bep: number
  mape: number
  trend: string
}

export interface SensitivityMatrix {
  current_bep_units: number
  current_bep_revenue: number
  scenarios: BEPScenario[]
  best_case: BEPExtreme
  worst_case: BEPExtreme
  most_sensitive_to: string
}

export interface BEPScenario {
  label: string
  parameter: string
  change: number
  new_bep_units: number
  new_bep_revenue: number
  delta_percent: number
}

export interface BEPExtreme {
  scenario: string
  bep_units: number
  bep_revenue: number
}

export interface MonteCarloResult {
  iterations: number
  mean_bep_units: number
  median_bep_units: number
  p10_bep_units: number
  p90_bep_units: number
  mean_bep_revenue: number
  p10_bep_revenue: number
  p90_bep_revenue: number
  probability_profit: number
  probability_loss: number
  mean_profit: number
}

export interface EarlyWarning {
  status: string
  recommendations: Recommendation[]
}

export interface Recommendation {
  priority: number
  condition: string
  action: string
  severity: string
  metric: string
}
export interface DashboardSummary {
  total_sales: number
  total_cogs: number
  total_expenses: number
  net_profit: number
  cumulative_net_profit?: number
  low_stock_count: number
  transactions_today: number
  total_orders?: number
  pending_orders?: number
  // Vetted by AI - Manual Review Required by Senior Engineer/Manager
  sales_trend: { name: string; total: number }[]
  weekly_trend: { name: string; total: number }[]
  monthly_trend?: { name: string; total: number }[]
  yearly_trend?: { name: string; total: number }[]
  category_breakdown: { category: string; total: number; percentage?: number }[]
  top_products: { name: string; category: string; sales: number; quantity?: number; product_id?: number; product_name?: string; total?: number }[]
  product_sales: { product_id: number; name: string; category: string; quantity: number; avg_price: number; avg_cost: number; revenue: number; total_cogs: number }[]
  total_cups: number
}

export interface ProductSalesVolume {
  product_id: number
  name: string
  category: string
  quantity: number
  avg_price: number
  avg_cost: number
  revenue: number
  total_cogs: number
}

// ─── Outlet ──────────────────────────────────────────────────────────
export interface Outlet {
  id: number
  name: string
  address: string
  phone: string
  code: string
}

// ─── Cash Register ────────────────────────────────────────────────────
export interface CashRegister {
  id: number
  user_id: number
  cashier_name: string
  outlet_id: number
  outlet_name: string
  opening_amount: number
  notes: string
  opened_at: string
  closed_at: string | null
  closing_amount: number | null
  expected_cash: number | null
  variance: number | null
  status: 'open' | 'closed'
}

export interface OpenCashRegisterRequest {
  opening_amount: number
  notes?: string
}

export interface SuggestedOpening {
  amount: number
  source: 'carry_over' | 'setting_default' | 'none'
}

export interface UpdateCashRegisterRequest {
  notes: string
}

// ─── Cash Book (Buku Kas) — Owner Only ─────────────────────────────────────
export interface CashBook {
  id: number
  outlet_id: number
  date: string
  method: 'Cash' | 'QRIS' | 'Lainnya' | 'Transfer'
  type: 'income' | 'expense'
  sub_type?: '' | 'investor_capital' | 'investor_loan' | 'loan_payment'
  investor_name?: string
  amount: number
  description: string
  reference: string
  created_by: number
  created_at: string
}

export interface CashBookRequest {
  date: string
  method: 'Cash' | 'QRIS' | 'Lainnya' | 'Transfer'
  type: 'income' | 'expense'
  sub_type?: '' | 'investor_capital' | 'investor_loan' | 'loan_payment'
  investor_name?: string
  amount: number
  description?: string
  reference?: string
}

// ─── Paginated ──────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
}

// ─── API Error ──────────────────────────────────────────────────────────────
export interface ApiError {
  error: string
  details?: string
}

// ─── Webhook Integration ────────────────────────────────────────────────────
export interface Integration {
  id: string
  name: string
  platform: 'xendit' | 'gofood' | 'grabfood' | 'tokopedia' | 'shopee'
  status: 'connected' | 'disconnected' | 'error'
  last_sync: string
}

// ─── Kebutuhan Stok (Production Planning) ───────────────────────────────────
export interface ProductionTarget {
  product_id: number
  product_name: string
  target_cup: number
}

export interface RequirementProduct {
  product_id: number
  product_name: string
  target_cup: number
  items: {
    ingredient_id: number
    name: string
    qty_per_cup: number
    unit: string
    total_need: number
  }[]
}

export interface RequirementIngredient {
  ingredient_id: number
  name: string
  category: string
  unit: string
  current_stock?: number
  total_needed: number
  purchase_unit: string
  purchase_unit_size: number
  need_in_purchase_unit: number
  rounded_purchase_unit: number
  estimated_cost: number
}

export interface RequirementResponse {
  period_days: number
  total_target_cup: number
  avg_cup_per_day: number
  total_estimated_cost: number
  menus: RequirementProduct[]
  ingredients: RequirementIngredient[]
}

export interface SaveProductionTargetsRequest {
  period_days: number
  targets: { product_id: number; target_cup: number }[]
}

export interface BackupStatus {
  database: { name: string; size: string }
  uploads: { path: string; size: string }
  disk: { available: string; backupDir: string }
  lastBackup: string
}

export interface BackupFile {
  name: string
  size: string
  modified: string
  type: string
}

export interface BackupResult {
  status: string
  timestamp: string
  results: { type: string; status: string; file?: string; size?: string; error?: string; details?: string }[]
}

export interface ProductSharingDetail {
  product_id: number
  product_name: string
  revenue: number
  cogs: number
  gross_margin: number
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export interface ExpenseBreakdown {
  id?: number
  date?: string
  title?: string
  category: string
  amount: number
  payment_method?: string
  note?: string
  is_deducted?: boolean
}

// Master Data Barista
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export interface Barista {
  id: number
  outlet_id: number
  name: string
  phone?: string
  default_share_pct: number
  bank_account?: string
  status: 'active' | 'inactive'
  notes?: string
  created_at?: string
  updated_at?: string
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export interface BaristaCashbon {
  id: number
  outlet_id: number
  person_id?: number
  barista_name: string
  amount: number
  cashbon_date: string
  payment_method: string
  reason?: string
  status: 'pending' | 'deducted' | 'settled'
  period_id?: number
  remaining_balance?: number
  recorded_by?: number
  approved_by?: number
  created_at?: string
  updated_at?: string
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export interface ProfitSharingPerson {
  id: number
  period_id: number
  name: string
  role: 'owner' | 'barista'
  share_pct: number
  gross_amount?: number
  leave_reduction: number
  cashbon_reduction?: number
  amount: number
  is_on_leave: boolean
  leave_days?: number
  leave_dates?: string
  // Multi-shift fields (barista can work multiple shifts)
  shift_ids?: number[]
  shift_names?: string[]
  shift_pool_pcts?: number[]
  // Per-date per-shift attendance: map[date]shiftIDs - e.g., {"2026-10-01":[1,2],"2026-10-02":[1]}
  attendance?: Record<string, number[]>
  remaining_balance?: number
  cashbons?: BaristaCashbon[]
}

export interface ProfitSharingPeriod {
  id: number
  outlet_id: number
  period_start: string
  period_end: string
  basis_amount: number
  total_expenses: number
  total_cogs: number
  net_profit: number
  ratio: number
  keeper_amount: number
  owner_amount: number
  status: string
  per_product: string
  expenses_breakdown?: string
  payment_note: string
  tax_note: string
  basis_type: string
  owner_pct: number
  pool_pct?: number
  ratio_effective_date?: string
  ratio_locked_at?: string
  rounding_remainder?: number
  people: ProfitSharingPerson[]
  created_at: string
  updated_at: string
}

export interface ProfitSharingCalculation {
  basis_amount: number
  tax: number
  service_fee: number
  net_revenue: number
  total_cogs: number
  gross_profit: number
  total_expenses: number
  net_profit: number
  ratio: number
  keeper_share: number
  owner_share: number
  breakdown: ExpenseBreakdown[]
  per_product: ProductSharingDetail[]
  status: string
  note: string
  sisa_kas?: number
  selisih_pendapatan?: number
  selisih_cogs?: number
  dihitung_pada?: string
  basis_type: string
  owner_pct: number
  people: ProfitSharingPerson[]
  // Vetted by AI - Manual Review Required by Senior Engineer/Manager
  // Multi-shift breakdown (Two-Tier per shift)
  shifts?: ShiftBreakdown[]
}

export interface ProfitSharingPreview {
  period: ProfitSharingPeriod
  calculation: ProfitSharingCalculation
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export interface ShiftConfig {
  id: number
  outlet_id: number
  name: string
  start_time: string
  end_time: string
  owner_pct: number
  barista_pool_pct: number
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export interface ShiftBreakdown {
  shift_id: number
  shift_name: string
  start_time: string
  end_time: string
  revenue: number
  cogs: number
  expenses: number
  gross_margin: number
  net_profit: number
  sharing_basis: number
  owner_pct: number
  owner_share: number
  barista_pool: number
  jumlah_pembagi?: number
  daftar_pembagi?: string[]
  sisa_kas?: number
  jumlah_dibagikan?: number
  total_hari?: number
  rincian_harian?: ShiftDailyDetail[]
}

export interface ShiftDailyDetail {
  tanggal: string
  revenue: number
  pool: number
  jumlah_pembagi: number
  daftar_pembagi: string[]
  jumlah_dibagikan: number
  sisa_kas: number
}

// Fase C/D: jadwal, kehadiran, shift operasional, daftar tugas.
export interface Schedule {
  id: number
  outlet_id: number
  barista_id: number
  barista_name: string
  tanggal: string
  shift_config_id: number
  shift_name?: string
  status: string
  jam_kerja?: string
  catatan?: string
}

export interface Attendance {
  id: number
  outlet_id: number
  schedule_id?: number
  shift_instance_id: number
  barista_id: number
  barista_name: string
  status: string
  alasan?: string
  disahkan: boolean
  tanggal?: string
  shift_name?: string
  shift_config_id?: number
}

export interface ShiftInstance {
  id: number
  outlet_id: number
  shift_config_id: number
  shift_name?: string
  tanggal: string
  status: string
  revenue: number
  hpp: number
  biaya_langsung: number
  dasar_bagi_hasil: number
  owner_share: number
  pool_barista: number
  sisa_kas: number
  catatan?: string
}

export interface OpsTasks {
  shift_belum_tutup: number
  kehadiran_pending: number
  kasbon_pending: number
  biaya_belum_klasifikasi: number
  periode_siap_review: number
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export interface CategoryExpenseStat {
  category: string
  total: number
  percentage: number
  count: number
  items?: Expense[]
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export interface DailyExpenseRecap {
  date: string
  total_amount: number
  cash_amount: number
  non_cash_amount: number
  count: number
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export interface ExpenseSummaryRecap {
  period_start: string
  period_end: string
  total_expense: number
  cash_expense: number
  non_cash_expense: number
  fixed_cost_total: number
  variable_cost_total: number
  daily_average_burn: number
  total_revenue: number
  expense_ratio: number
  category_breakdown: CategoryExpenseStat[]
  top_expenses: Expense[]
  daily_recap: DailyExpenseRecap[]
}

// ─── Loyalty & Customer Feedback - Vetted by AI ─────────────────────────────
export interface Customer {
  id: number
  phone: string
  name: string
  email: string
  total_orders: number
  total_spend: number
  loyalty_token: string
  tier: string
  created_at: string
}

export interface LoyaltyProgram {
  id: number
  name: string
  description: string
  threshold_type: string
  threshold_value: number
  reward_type: string
  reward_note: string
  is_active: boolean
}

export interface ProgramProgress {
  program_id: number
  program_name: string
  reward_note: string
  reward_type: string
  current_stamps: number
  threshold_value: number
  is_eligible: boolean
  progress_percent: number
}

export interface PublicLoyaltyCard {
  customer_name: string
  phone_masked: string
  total_orders: number
  tier: string
  programs: ProgramProgress[]
  outlet_name: string
  outlet_logo_url?: string
  recent_feedback: {
    rating: number
    message: string
    owner_reply?: string
    submitted_at: string
  }[]
}

export interface CustomerFeedback {
  id: number
  customer_id: number
  customer_name?: string
  rating: number
  category: string
  message: string
  owner_reply?: string
  status: 'new' | 'read' | 'replied'
  submitted_at: string
}


