FROM golang:1.24-alpine

WORKDIR /app

# Copy source code first so we can run go mod tidy
COPY . .

# Initialize go.sum and download dependencies
RUN go mod tidy

# Build the application
RUN go build -o main ./cmd/server

EXPOSE 8080

CMD ["./main"]
