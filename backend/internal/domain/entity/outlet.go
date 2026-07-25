package entity

type Outlet struct {
	ID      uint
	Name    string
	Address string
	Phone   string
	Code    string
}

type OutletResponse struct {
	ID      uint   `json:"id"`
	Name    string `json:"name"`
	Address string `json:"address"`
	Phone   string `json:"phone"`
	Code    string `json:"code"`
}

func (o *Outlet) ToResponse() OutletResponse {
	return OutletResponse{
		ID:      o.ID,
		Name:    o.Name,
		Address: o.Address,
		Phone:   o.Phone,
		Code:    o.Code,
	}
}
