package errors

import "errors"

var (
	ErrNotFound            = errors.New("resource not found")
	ErrInvalidInput        = errors.New("invalid input")
	ErrUnauthorized        = errors.New("unauthorized")
	ErrForbidden           = errors.New("forbidden: insufficient permissions")
	ErrConflict            = errors.New("resource already exists")
	ErrInsufficientStock   = errors.New("insufficient stock")
	ErrAlreadyProcessed    = errors.New("already processed")
	ErrOrderAlreadyVoided  = errors.New("order is already voided")
	ErrInvalidCredentials  = errors.New("invalid credentials")
)

type DomainError struct {
	Code    string
	Message string
	Err     error
}

func (e *DomainError) Error() string {
	return e.Message
}

func (e *DomainError) Unwrap() error {
	return e.Err
}

func NewNotFoundError(entity string) *DomainError {
	return &DomainError{
		Code:    "NOT_FOUND",
		Message: entity + " not found",
		Err:     ErrNotFound,
	}
}

func NewInvalidInputError(msg string) *DomainError {
	return &DomainError{
		Code:    "INVALID_INPUT",
		Message: msg,
		Err:     ErrInvalidInput,
	}
}

func NewUnauthorizedError(msg string) *DomainError {
	return &DomainError{
		Code:    "UNAUTHORIZED",
		Message: msg,
		Err:     ErrUnauthorized,
	}
}

func NewForbiddenError() *DomainError {
	return &DomainError{
		Code:    "FORBIDDEN",
		Message: ErrForbidden.Error(),
		Err:     ErrForbidden,
	}
}

func NewInsufficientStockError(name string) *DomainError {
	return &DomainError{
		Code:    "INSUFFICIENT_STOCK",
		Message: "Insufficient stock for " + name,
		Err:     ErrInsufficientStock,
	}
}
