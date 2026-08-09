package usecase

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"

	"singgah-pos-backend/internal/domain/entity"
	domainErrors "singgah-pos-backend/internal/domain/errors"
	"singgah-pos-backend/internal/pkg/jwt"
	"singgah-pos-backend/internal/pkg/password"
	"singgah-pos-backend/internal/repository"
	"singgah-pos-backend/internal/repository/postgres"

	jwtv5 "github.com/golang-jwt/jwt/v5"

	"gorm.io/gorm"
)

type AuthUsecase struct {
	userRepo           repository.UserRepository
	tokenBlacklistRepo repository.TokenBlacklistRepository
}

func NewAuthUsecase(db *gorm.DB) *AuthUsecase {
	return &AuthUsecase{
		userRepo:           postgres.NewUserRepository(db),
		tokenBlacklistRepo: postgres.NewTokenBlacklistRepository(db),
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
	user, err := uc.userRepo.FindByIdentifier(req.Email)
	if err != nil {
		return nil, domainErrors.NewUnauthorizedError("invalid credentials")
	}

	if !password.CheckPasswordHash(req.Password, user.Password) {
		return nil, domainErrors.NewUnauthorizedError("invalid credentials")
	}

	token, err := jwt.GenerateToken(user.ID, user.Name, user.Email, user.Role, user.OutletID)
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		Token: token,
		User:  user.ToResponse(),
	}, nil
}

func (uc *AuthUsecase) Register(name, email, pwd, role string, outletID uint) (*entity.UserResponse, error) {
	hashedPassword, err := password.HashPassword(pwd)
	if err != nil {
		return nil, err
	}

	user := &entity.User{
		Name:     name,
		Email:    email,
		Password: hashedPassword,
		Role:     role,
		OutletID: outletID,
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

func (uc *AuthUsecase) UpdateUser(id uint, name, email, role, pwd string, outletID *uint) (*entity.UserResponse, error) {
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
	if outletID != nil {
		user.OutletID = *outletID
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

// ErrMissingJTI is returned when a token has no JTI and cannot be revoked
var ErrMissingJTI = errors.New("token missing JTI claim")

// Logout revokes a JWT token by adding it to the blacklist
func (uc *AuthUsecase) Logout(tokenString string) error {
	claims := &jwt.Claims{}
	token, err := jwtv5.ParseWithClaims(tokenString, claims, func(token *jwtv5.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwtv5.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwt.JwtKey, nil
	})
	if err != nil {
		return err
	}
	if !token.Valid {
		return errors.New("invalid token")
	}

	jti := claims.RegisteredClaims.ID
	if jti == "" {
		return ErrMissingJTI
	}

	sum := sha256.Sum256([]byte(tokenString))
	tokenHash := hex.EncodeToString(sum[:])

	blacklist := &entity.TokenBlacklist{
		Jti:       jti,
		UserID:    claims.UserID,
		Token:     tokenHash,
		ExpiresAt: claims.RegisteredClaims.ExpiresAt.Time,
	}

	return uc.tokenBlacklistRepo.Create(blacklist)
}

// CleanupExpiredTokens removes expired tokens from the blacklist
func (uc *AuthUsecase) CleanupExpiredTokens() error {
	return uc.tokenBlacklistRepo.DeleteExpired()
}
