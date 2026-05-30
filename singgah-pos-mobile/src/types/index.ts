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

export interface UpdateProductRequest {
   name?: string
   category?: string
   price?: number
   cost?: number
   sku?: string
   image_url?: string
   description?: string
   recipe?: { ingredient_id: number; quantity: number }[]
}

// ─── Ingredient ─────────────────────────────────────────────────────────────
export interface Ingredient {
  id: number
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

export interface UpdateIngredientRequest {
   name?: string
   unit?: string
   current_stock?: number
   min_stock?: number
   cost_per_unit?: number
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
  id: number
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
  id: number
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
  id: number
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
  id: number
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
  id: number
  key: string
  value: string
  created_at?: string
  updated_at?: string
}

// ─── Dashboard ──────────────────────────────────────────────────────────────
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
