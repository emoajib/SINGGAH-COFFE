// ─── User ───────────────────────────────────────────────────────────────────
export interface User {
  id: string
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
  ID: number
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
  ID: number
  name: string
  unit: string
  current_stock: number
  min_stock: number
  cost_per_unit: number
  created_at?: string
  updated_at?: string
}

export interface CreateIngredientRequest {
  name: string
  unit: string
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
}

/** Response shape for a stock mutation record */
export interface StockMutation {
  ID: number
  ingredient_id: number
  ingredient_name: string
  type: 'IN' | 'OUT' | 'ADJ_ADD' | 'ADJ_SUB'
  quantity: number
  notes: string
  created_at: string
  reference_id?: string
}

// ─── Order ──────────────────────────────────────────────────────────────────
export interface Order {
  ID: number
  order_number: string
  payment_method: string
  cashier_name: string
  status: string
  total_amount: number
  items: OrderItem[]
  created_at: string
  updated_at: string
  payment_status?: string
  invoice_url?: string
  customer_email?: string
}

export interface OrderItem {
  ID: number
  order_id: number
  product_id: number
  product_name: string
  quantity: number
  price: number
  subtotal: number
}

export interface CreateOrderRequest {
  order_number?: string
  payment_method: string
  cashier_name?: string
  customer_email?: string
  items: { product_id: number; quantity: number }[]
}

// ─── Expense ────────────────────────────────────────────────────────────────
export interface Expense {
  ID: number
  title: string
  amount: number
  category: string
  date: string
  description?: string
  notes?: string
  created_at?: string
}

// ─── Setting ────────────────────────────────────────────────────────────────
export interface Setting {
  ID: number
  key: string
  value: string
  created_at?: string
  updated_at?: string
}

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager
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
  sales_trend: { name: string; total: number }[]
  weekly_trend: { name: string; total: number }[]
  category_breakdown: { category: string; total: number; percentage?: number }[]
  top_products: { name: string; category: string; sales: number; quantity?: number; product_id?: number; product_name?: string; total?: number }[]
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
