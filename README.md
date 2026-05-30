# ☕ Singgah Coffee POS System

Professional, Enterprise-grade Point of Sale (POS) system for Singgah Coffee. Built with a robust **Go** backend, a high-performance **React** web dashboard, and a seamless **React Native (Expo)** mobile application.

![System Architecture](/.gemini/antigravity/brain/ebe4928a-8907-4448-aa9d-958424e63ef7/system_architecture_1770115419027.png)

## 🚀 Core Features

### 📊 Advanced Financial Intelligence
- **Standard P&L Reports**: Generate professional Profit & Loss statements compliant with accounting standards.
- **Export Options**: One-click export to **PDF** (print-ready) and **Excel (.xls)** with automated formatting.
- **Real-time Analytics**: Live sales trends, category breakdown, and top-selling product metrics.

### 📦 Precision Inventory & Recipe Management
- **Recipe-Based Deduction**: Automated stock deduction based on complex product recipes.
- **Atomic Mutations**: Data-safe stock updates with a full audit trail (Stock In, Out, Adjustment).
- **Critical Alerts**: Visual warnings for low-stock ingredients to prevent operational downtime.

### 📱 Industrial Mobile POS
- **Cross-Platform**: Built with React Native (Expo) for tablet and mobile efficiency.
- **Receipt Printing**: Integrated thermal printer support (ESC/POS) via Network/IP.
- **Active SOP Module**: Digital access to Standard Operating Procedures for staff directly in the app.

### 🛡️ Enterprise Security & Integrity
- **Strict Validation**: Industrial-grade input validation in Go to prevent data corruption.
- **Role-Based Access (RBAC)**: Secure access control for Owners, Managers, and Cashiers.
- **Automated CI/CD**: Continuous integration via GitHub Actions for automated build and type-check.

---

## 🏗️ Technical Stack

- **Backend**: Go (Golang) + Gin Framework + GORM
- **Database**: PostgreSQL 15 + Docker Orchestration
- **Web Dashboard**: React + TypeScript + Vite + Tailwind CSS
- **Mobile POS**: React Native (Expo) + TanStack Query + Zustand
- **CI/CD**: GitHub Actions

---

## 🚦 Quick Start

After ensuring [System Integrity Protection (SIP)](#️-important-macos-setup-required) is handled for local development:

```bash
# Start all core services (Backend & DB)
./start_all_services.sh

# Run Web Dashboard (Port 3000)
./start_web_dashboard.sh

# Run Mobile POS (Port 8081)
cd singgah-pos-mobile && npm install && npx expo start --web
```

---

## 🌐 System Infrastructure

| Service | URL | Role |
|---------|-----|------|
| **Backend API** | http://localhost:8080 | Central API & Logic Hub |
| **Web Dashboard** | http://localhost:3000 | Admin & Management Console |
| **Mobile POS** | http://localhost:8081 | Cashier Transaction Interface |
| **Database** | localhost:5432 | PostgreSQL Data Store |

---

## 📚 Technical Documentation

- **[STARTUP_GUIDE.md](./STARTUP_GUIDE.md)** - Full environment setup and configuration.
- **[QUICK_START.md](./QUICK_START.md)** - Commands for daily operations.
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Current development phase and roadmap.

---

## 🔒 Governance & Security

**⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager**

1. **Development Environment**: SIP must be disabled on macOS Intel/Silicon for network binding.
2. **Data Security**: Secret keys (JWT, Xendit) must be configured in `backend/.env`.
3. **Integrity**: Database constraints (Unique, Foreign Keys) are enforced at the schema level.

---

**Last Updated**: 2026-05-31  
**Version**: 2.0.0 (Expo Migration Edition)  
**Status**: Stable / Production-Ready Core
