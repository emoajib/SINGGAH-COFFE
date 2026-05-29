package services

import (
	"errors"
	"fmt"
	"os"

	"github.com/xendit/xendit-go/v3"
	"github.com/xendit/xendit-go/v3/invoice"
)

type PaymentService struct {
	XenditClient *xendit.APIClient
}

func NewPaymentService() *PaymentService {
	apiKey := os.Getenv("XENDIT_API_KEY")
	client := xendit.NewClient(apiKey)
	return &PaymentService{XenditClient: client}
}

func (s *PaymentService) CreateQRISInvoice(orderNumber string, amount float64, customerEmail string) (string, error) {
	if os.Getenv("XENDIT_API_KEY") == "" {
		// Mock for development if no API Key
		return fmt.Sprintf("https://checkout.xendit.co/web/mock-%s", orderNumber), nil
	}

	createInvoiceRequest := *invoice.NewCreateInvoiceRequest(orderNumber, float32(amount))
	// createInvoiceRequest.SetCustomer(invoice.Customer{
	// 	Email: &customerEmail,
	// })

	// Set success/failure redirect URLs
	successUrl := "http://localhost:3001/pos?status=success"
	failureUrl := "http://localhost:3001/pos?status=failed"
	createInvoiceRequest.SetSuccessRedirectUrl(successUrl)
	createInvoiceRequest.SetFailureRedirectUrl(failureUrl)

	resp, r, err := s.XenditClient.InvoiceApi.CreateInvoice(nil).
		CreateInvoiceRequest(createInvoiceRequest).
		Execute()

	if err != nil {
		fmt.Fprintf(os.Stderr, "Error when calling `InvoiceApi.CreateInvoice``: %v\n", err)
		fmt.Fprintf(os.Stderr, "Full HTTP response: %v\n", r)
		return "", err
	}

	return resp.InvoiceUrl, nil
}

func (s *PaymentService) VerifyWebhook(id string) error {
	// Logic to verify callback from Xendit
	return errors.New("not implemented")
}
