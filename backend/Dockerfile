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
RUN apk add --no-cache ca-certificates tzdata bash mariadb-client tar gzip

WORKDIR /app

# Copy the compiled binary from builder stage
COPY --from=builder /app/main .

# Create non-root user
RUN adduser --disabled-password --gecos '' appuser
USER appuser

EXPOSE 8080

CMD ["./main"]
