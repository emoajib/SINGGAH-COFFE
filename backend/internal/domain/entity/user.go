package entity

type User struct {
	ID       uint
	Name     string
	Email    string
	Password string
	Role     string // owner, manager, cashier
	OutletID uint   // 0 = all outlets (owner only)
}

type UserResponse struct {
	ID       uint   `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Role     string `json:"role"`
	OutletID uint   `json:"outlet_id"`
}

func (u *User) ToResponse() UserResponse {
	return UserResponse{
		ID:       u.ID,
		Name:     u.Name,
		Email:    u.Email,
		Role:     u.Role,
		OutletID: u.OutletID,
	}
}
