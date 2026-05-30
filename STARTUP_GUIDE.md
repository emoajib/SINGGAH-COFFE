# 🚀 Singgah Coffee POS - Startup Guide

## ⚠️ IMPORTANT: SIP Must Be Disabled First!

Before running any services, you MUST disable System Integrity Protection (SIP).

### 📋 How to Disable SIP (Intel Mac)

1. **Restart your Mac**
   - Click Apple menu () → Restart

2. **Enter Recovery Mode**
   - Immediately after restart, hold `Command (⌘) + R`
   - Keep holding until you see the Apple logo or spinning globe
   - Release when you see "macOS Utilities"

3. **Open Terminal in Recovery Mode**
   - Click "Utilities" in menu bar
   - Select "Terminal"

4. **Disable SIP**
   ```bash
   csrutil disable
   ```
   
   Expected output:
   ```
   Successfully disabled System Integrity Protection. 
   Please restart the machine for the changes to take effect.
   ```

5. **Restart Mac**
   ```bash
   reboot
   ```

6. **Verify SIP is Disabled** (after restart)
   ```bash
   csrutil status
   ```
   
   Should show:
   ```
   System Integrity Protection status: disabled.
   ```

---

## 🎯 After SIP is Disabled

### Quick Start (Automated)

Run these scripts in separate terminal windows:

#### Terminal 1: Backend + Database
```bash
cd "/Volumes/WORK/PROJECT PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE"
./start_all_services.sh
```

#### Terminal 2: Web Dashboard
```bash
cd "/Volumes/WORK/PROJECT PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE"
./start_web_dashboard.sh
```

#### Terminal 3: Mobile App (React Native)
```bash
cd "/Volumes/WORK/PROJECT PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE/singgah-pos-mobile"
npm install && npx expo start --web
```

---

### Manual Start (Step by Step)

#### 1. Start Backend & Database (Docker)
```bash
cd "/Volumes/WORK/PROJECT PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE"
docker-compose down
docker-compose up -d --build

# Check status
docker ps
```

#### 2. Start Web Dashboard
```bash
cd "/Volumes/WORK/PROJECT PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE/web-dashboard"
npm install  # First time only
npm run dev
```

#### 3. Start Mobile App (React Native)
```bash
cd "/Volumes/WORK/PROJECT PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE/singgah-pos-mobile"
npm install  # First time only
npx expo start --web
```

---

## 🌐 Access URLs

After all services are running:

- **Backend API**: http://localhost:8080
- **Web Dashboard**: http://localhost:5173
- **Mobile POS**: http://localhost:8081 (Expo Web)
- **PostgreSQL Database**: localhost:5434

---

## 🛠️ Troubleshooting

### Issue: "Operation not permitted" errors
**Solution**: SIP is still enabled. Follow the SIP disable steps above.

### Issue: "Port already in use"
**Solution**: 
```bash
# Find and kill process using the port
lsof -ti:5173 | xargs kill -9  # For web dashboard
lsof -ti:8080 | xargs kill -9  # For backend
```

### Issue: Docker permission denied
**Solution**:
```bash
# Fix Docker socket permission
sudo chmod 666 /Users/salsabil/.docker/run/docker.sock

# Or restart Docker Desktop
```

### Issue: Backend returns 404
**Solution**:
```bash
# Check backend logs
docker logs singgah_api

# Restart backend
docker-compose restart api
```

---

## 🔒 Security Notes

**⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager**

### Important Security Considerations:

1. **SIP Disabled**: This reduces system security. Only do this on development machines.

2. **Production**: NEVER disable SIP on production or public-facing machines.

3. **Re-enable SIP**: After development, you can re-enable SIP:
   ```bash
   # In Recovery Mode Terminal:
   csrutil enable
   reboot
   ```

4. **Enterprise Compliance**: If this is a corporate machine, consult IT Security before disabling SIP.

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Singgah Coffee POS                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Web Dashboard│  │  Mobile POS  │  │  Backend API │  │
│  │  (React)     │  │ (React Native)  │   (Go/Gin)   │  │
│  │ Port: 5173   │  │ Port: 8081   │  │  Port: 8080  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                            │                             │
│                   ┌────────▼────────┐                    │
│                   │   PostgreSQL    │                    │
│                   │   Port: 5434    │                    │
│                   └─────────────────┘                    │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Default Credentials

### Database
- **Host**: localhost
- **Port**: 5434
- **User**: postgres
- **Password**: password
- **Database**: singgah_pos

### Admin Login (if seeded)
Check backend initialization for default admin credentials.

---

## 🎓 Development Workflow

1. **Start Services**: Run all three startup scripts
2. **Development**: Make changes to code
3. **Hot Reload**: 
   - Web Dashboard: Auto-reloads via Vite
   - Mobile POS: Auto-reloads via Expo
   - Backend: Restart container if needed
4. **Testing**: Access via browser URLs above
5. **Stop Services**: `Ctrl+C` in each terminal, then `docker-compose down`

---

## 📞 Support

For issues or questions:
1. Check logs: `docker logs singgah_api`
2. Check this troubleshooting guide
3. Verify SIP status: `csrutil status`

---

**Last Updated**: 2026-05-30
**System Requirements**: macOS with SIP disabled, Docker Desktop, Node.js 18+
