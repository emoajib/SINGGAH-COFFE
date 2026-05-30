package entity

import "time"

type Order struct {
	ID            uint
	OrderNumber   string
	TotalAmount   float64
	PaymentMethod string
	PaymentStatus string
	PaymentRef    string
	Status        string
	UserID        uint
	CashierName   string
	OrderItems    []OrderItem
	OrderTime     time.Time
	CreatedAt     time.Time
}

type OrderItem struct {
	ID        uint
	OrderID   uint
	ProductID uint
	Product   Product
	Quantity  int
	Price     float64
	Cost      float64
}

type OrderResponse struct {
	ID            uint                `json:"id"`
	OrderNumber   string              `json:"order_number"`
	TotalAmount   float64             `json:"total_amount"`
	PaymentMethod string              `json:"payment_method"`
	PaymentStatus string              `json:"payment_status"`
	PaymentRef    string              `json:"payment_ref"`
	Status        string              `json:"status"`
	UserID        uint                `json:"user_id"`
	CashierName   string              `json:"cashier_name"`
	OrderItems    []OrderItemResponse `json:"items"`
	OrderTime     time.Time           `json:"order_time"`
	CreatedAt     time.Time           `json:"created_at"`
}

type OrderItemResponse struct {
	ID        uint             `json:"id"`
	OrderID   uint             `json:"order_id"`
	ProductID uint             `json:"product_id"`
	Product   ProductResponse  `json:"product"`
	Quantity  int              `json:"quantity"`
	Price     float64          `json:"price"`
	Cost      float64          `json:"cost"`
}

func (o *Order) ToResponse() OrderResponse {
	items := make([]OrderItemResponse, len(o.OrderItems))
	for i, item := range o.OrderItems {
		items[i] = OrderItemResponse{
			ID:        item.ID,
			OrderID:   item.OrderID,
			ProductID: item.ProductID,
			Product:   item.Product.ToResponse(),
			Quantity:  item.Quantity,
			Price:     item.Price,
			Cost:      item.Cost,
		}
	}
	return OrderResponse{
		ID:            o.ID,
		OrderNumber:   o.OrderNumber,
		TotalAmount:   o.TotalAmount,
		PaymentMethod: o.PaymentMethod,
		PaymentStatus: o.PaymentStatus,
		PaymentRef:    o.PaymentRef,
		Status:        o.Status,
		UserID:        o.UserID,
		CashierName:   o.CashierName,
		OrderItems:    items,
		OrderTime:     o.OrderTime,
		CreatedAt:     o.CreatedAt,
	}
}
