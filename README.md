# ☕ Singgah Coffee POS System

A modern Point of Sale (POS) system built with **React**, **Flutter**, and **Go** for Singgah Coffee.

![System Architecture](/.gemini/antigravity/brain/ebe4928a-8907-4448-aa9d-958424e63ef7/system_architecture_1770115419027.png)

## 🏗️ Architecture

### Tech Stack
- **Frontend Web**: React + TypeScript + Vite + Tailwind CSS
- **Mobile App**: Flutter (Dart)
- **Backend API**: Go (Golang) + Gin Framework
- **Database**: PostgreSQL 15
- **Containerization**: Docker + Docker Compose

### Project Structure
```
.
├── web-dashboard/       # React web dashboard (Port 5173)
├── mobile-app/          # Flutter mobile app
├── backend/             # Go backend API (Port 8080)
├── docker-compose.yml   # Docker orchestration
├── STARTUP_GUIDE.md     # Detailed startup instructions
├── QUICK_START.md       # Quick reference guide
└── start_*.sh           # Automated startup scripts
```

---

## ⚠️ IMPORTANT: macOS Setup Required

**Before running this project on macOS, you MUST disable System Integrity Protection (SIP).**

This is required because macOS security restrictions prevent network binding and file system operations needed for development.

### 🔧 Quick SIP Disable Guide (Intel Mac)

![SIP Disable Guide](/.gemini/antigravity/brain/ebe4928a-8907-4448-aa9d-958424e63ef7/sip_disable_guide_1770115383947.png)

1. **Restart Mac** → Hold `⌘ + R` immediately
2. **Wait for Recovery Mode** (Apple logo appears)
3. **Utilities** → **Terminal**
4. **Type**: `csrutil disable`
5. **Type**: `reboot`
6. **After restart, verify**: `csrutil status`

**📖 For detailed instructions, see [STARTUP_GUIDE.md](./STARTUP_GUIDE.md)**

---

## 🚀 Quick Start

After disabling SIP, run these commands in **3 separate terminals**:

### Terminal 1: Backend + Database
```bash
cd "/Volumes/WORK/PROJECT PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE"
./start_all_services.sh
```

### Terminal 2: Web Dashboard
```bash
cd "/Volumes/WORK/PROJECT PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE"
./start_web_dashboard.sh
```

### Terminal 3: Flutter Mobile App
```bash
cd "/Volumes/WORK/PROJECT PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE"
./start_flutter_app.sh
```

---

## 🌐 Access URLs

Once all services are running:

| Service | URL | Description |
|---------|-----|-------------|
| **Backend API** | http://localhost:8080 | REST API endpoints |
| **Web Dashboard** | http://localhost:5173 | Admin dashboard |
| **Flutter App** | Auto-opens in Chrome | Mobile POS interface |
| **PostgreSQL** | localhost:5434 | Database |

---

## 📋 System Requirements

- **macOS** (Intel or Apple Silicon)
- **Docker Desktop** (latest version)
- **Node.js** 18+ and npm
- **Flutter SDK** 3.1.5+
- **Go** 1.21+ (for backend development)
- **SIP Disabled** (for development)

---

## 🛠️ Manual Setup

If you prefer manual setup instead of automated scripts:

### 1. Backend + Database (Docker)
```bash
docker-compose down
docker-compose up -d --build
docker ps  # Verify containers are running
```

### 2. Web Dashboard
```bash
cd web-dashboard
npm install
npm run dev
```

### 3. Flutter Mobile App
```bash
cd mobile-app
flutter pub get
flutter run -d chrome
```

---

## 🔧 Troubleshooting

### "Operation not permitted" errors
**Cause**: SIP is still enabled  
**Solution**: Follow SIP disable steps above

### "Port already in use"
**Solution**:
```bash
# Kill process on specific port
lsof -ti:5173 | xargs kill -9  # Web dashboard
lsof -ti:8080 | xargs kill -9  # Backend
```

### Docker permission denied
**Solution**:
```bash
sudo chmod 666 ~/.docker/run/docker.sock
# Or restart Docker Desktop
```

### Backend returns 404
**Solution**:
```bash
# Check logs
docker logs singgah_api

# Restart backend
docker-compose restart api
```

---

## 📚 Documentation

- **[STARTUP_GUIDE.md](./STARTUP_GUIDE.md)** - Complete setup and startup guide
- **[QUICK_START.md](./QUICK_START.md)** - Quick reference card
- **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** - Project status and roadmap

---

## 🔒 Security Notes

**⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager**

### Important Security Considerations:

1. **SIP Disabled**: This reduces system security. **Only disable on development machines.**

2. **Production**: **NEVER** disable SIP on production or public-facing machines.

3. **Re-enable SIP**: After development, re-enable SIP:
   ```bash
   # In Recovery Mode Terminal:
   csrutil enable
   reboot
   ```

4. **Enterprise Compliance**: If this is a corporate machine, consult IT Security before disabling SIP.

5. **Default Credentials**: Change default database credentials in production:
   - Edit `backend/.env`
   - Update `docker-compose.yml`

---

## 🎯 Features

### Web Dashboard
- ✅ User authentication & authorization
- ✅ Product management
- ✅ Order processing
- ✅ Inventory tracking
- ✅ Sales reports & analytics
- ✅ Settings management

### Mobile App (Flutter)
- ✅ POS interface for cashiers
- ✅ Product catalog
- ✅ Order creation
- ✅ Real-time sync with backend

### Backend API
- ✅ RESTful API with Gin framework
- ✅ JWT authentication
- ✅ Role-based access control (Owner, Manager, Cashier)
- ✅ PostgreSQL database with GORM
- ✅ CORS enabled
- ✅ File upload support

---

## 🧪 Development

### Running Tests
```bash
# Backend tests
cd backend
go test ./...

# Frontend tests
cd web-dashboard
npm test
```

### Database Migrations
```bash
# Migrations are auto-run on backend startup
# Check backend logs for migration status
docker logs singgah_api | grep migration
```

### Environment Variables

**Backend** (`backend/.env`):
```env
PORT=8080
DATABASE_URL="host=localhost user=postgres password=password dbname=singgah_pos port=5434 sslmode=disable"
```

**Web Dashboard** (optional `.env`):
```env
VITE_API_URL=http://localhost:8080
```

---

## 📊 Database Schema

Main tables:
- `users` - User accounts (owner, manager, cashier)
- `products` - Product catalog
- `orders` - Sales orders
- `order_items` - Order line items
- `ingredients` - Inventory items
- `stock_mutations` - Inventory movements
- `settings` - Application settings

---

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

---

## 📄 License

Proprietary - Singgah Coffee

---

## 📞 Support

For issues or questions:
1. Check [STARTUP_GUIDE.md](./STARTUP_GUIDE.md)
2. Check [Troubleshooting](#-troubleshooting) section
3. Review Docker logs: `docker logs singgah_api`
4. Verify SIP status: `csrutil status`

---

**Last Updated**: 2026-02-03  
**Version**: 1.0.0  
**Status**: Development


