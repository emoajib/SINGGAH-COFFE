# ========================================
# STAGE 1: Builder
# ========================================
FROM golang:1.23-alpine AS builder

ENV GOPROXY=direct \
    CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64

WORKDIR /app

# Copy source code
COPY . .

# Download dependencies and build
RUN go mod tidy && \
    go build -o main ./cmd/server

# ========================================
# STAGE 2: Runner
# ========================================
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy the compiled binary from builder stage
COPY --from=builder /app/main .

EXPOSE 8080

CMD ["./main"]
