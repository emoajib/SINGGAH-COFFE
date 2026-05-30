package postgres

import (
	"singgah-pos-backend/internal/domain/entity"
	"singgah-pos-backend/internal/models"

	"gorm.io/gorm"
)

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *userRepository {
	return &userRepository{db: db}
}

func (r *userRepository) FindByID(id uint) (*entity.User, error) {
	var m models.User
	if err := r.db.First(&m, id).Error; err != nil {
		return nil, err
	}
	return toDomainUser(&m), nil
}

func (r *userRepository) FindByEmail(email string) (*entity.User, error) {
	var m models.User
	if err := r.db.Where("email = ?", email).First(&m).Error; err != nil {
		return nil, err
	}
	return toDomainUser(&m), nil
}

func (r *userRepository) FindAll() ([]entity.User, error) {
	var ms []models.User
	if err := r.db.Find(&ms).Error; err != nil {
		return nil, err
	}
	result := make([]entity.User, len(ms))
	for i, m := range ms {
		result[i] = *toDomainUser(&m)
	}
	return result, nil
}

func (r *userRepository) Create(user *entity.User) error {
	m := toModelUser(user)
	return r.db.Create(m).Error
}

func (r *userRepository) Update(user *entity.User) error {
	m := toModelUser(user)
	return r.db.Model(&models.User{}).Where("id = ?", user.ID).Updates(map[string]interface{}{
		"name":  m.Name,
		"email": m.Email,
		"role":  m.Role,
	}).Error
}

func (r *userRepository) Delete(id uint) error {
	return r.db.Delete(&models.User{}, id).Error
}

func toDomainUser(m *models.User) *entity.User {
	return &entity.User{
		ID:       m.ID,
		Name:     m.Name,
		Email:    m.Email,
		Password: m.Password,
		Role:     m.Role,
	}
}

func toModelUser(e *entity.User) *models.User {
	return &models.User{
		Name:     e.Name,
		Email:    e.Email,
		Password: e.Password,
		Role:     e.Role,
	}
}
