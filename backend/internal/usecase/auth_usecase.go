package usecase

import (
	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/pkg/jwt"
	"singgah-pos-backend/internal/pkg/password"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	"gorm.io/gorm"
)

type AuthUsecase struct {
	userRepo repository.UserRepository
}

func NewAuthUsecase(db *gorm.DB) *AuthUsecase {
	return &AuthUsecase{
		userRepo: postgres.NewUserRepository(db),
	}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string             `json:"token"`
	User  entity.UserResponse `json:"user"`
}

func (uc *AuthUsecase) Login(req LoginRequest) (*LoginResponse, error) {
	user, err := uc.userRepo.FindByEmail(req.Email)
	if err != nil {
		return nil, domainErrors.NewUnauthorizedError("invalid credentials")
	}

	if !password.CheckPasswordHash(req.Password, user.Password) {
		return nil, domainErrors.NewUnauthorizedError("invalid credentials")
	}

	token, err := jwt.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		Token: token,
		User:  user.ToResponse(),
	}, nil
}

func (uc *AuthUsecase) Register(name, email, pwd, role string) (*entity.UserResponse, error) {
	hashedPassword, err := password.HashPassword(pwd)
	if err != nil {
		return nil, err
	}

	user := &entity.User{
		Name:     name,
		Email:    email,
		Password: hashedPassword,
		Role:     role,
	}

	if err := uc.userRepo.Create(user); err != nil {
		return nil, domainErrors.NewInvalidInputError("failed to create user: " + err.Error())
	}

	resp := user.ToResponse()
	return &resp, nil
}

func (uc *AuthUsecase) GetUsers() ([]entity.UserResponse, error) {
	users, err := uc.userRepo.FindAll()
	if err != nil {
		return nil, err
	}
	resp := make([]entity.UserResponse, len(users))
	for i, u := range users {
		resp[i] = u.ToResponse()
	}
	return resp, nil
}

func (uc *AuthUsecase) UpdateUser(id uint, name, email, role, pwd string) (*entity.UserResponse, error) {
	user, err := uc.userRepo.FindByID(id)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("user")
	}

	if name != "" {
		user.Name = name
	}
	if email != "" {
		user.Email = email
	}
	if role != "" {
		user.Role = role
	}
	if pwd != "" {
		hashed, err := password.HashPassword(pwd)
		if err != nil {
			return nil, err
		}
		user.Password = hashed
	}

	if err := uc.userRepo.Update(user); err != nil {
		return nil, err
	}

	resp := user.ToResponse()
	return &resp, nil
}

func (uc *AuthUsecase) DeleteUser(id uint) error {
	return uc.userRepo.Delete(id)
}

func (uc *AuthUsecase) UpdateProfile(userID uint, name, email string) (*entity.UserResponse, error) {
	user, err := uc.userRepo.FindByID(userID)
	if err != nil {
		return nil, domainErrors.NewNotFoundError("user")
	}

	if name != "" {
		user.Name = name
	}
	if email != "" {
		user.Email = email
	}

	if err := uc.userRepo.Update(user); err != nil {
		return nil, err
	}

	resp := user.ToResponse()
	return &resp, nil
}

func (uc *AuthUsecase) ChangePassword(userID uint, currentPassword, newPassword string) error {
	user, err := uc.userRepo.FindByID(userID)
	if err != nil {
		return domainErrors.NewNotFoundError("user")
	}

	if !password.CheckPasswordHash(currentPassword, user.Password) {
		return domainErrors.NewUnauthorizedError("incorrect current password")
	}

	hashed, err := password.HashPassword(newPassword)
	if err != nil {
		return err
	}

	user.Password = hashed
	return uc.userRepo.Update(user)
}
