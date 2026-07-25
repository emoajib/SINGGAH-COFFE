# 🎯 Quick Reference - Disable SIP & Start Services

## 🔴 STEP 1: Disable SIP (One-time setup)

### For Intel Mac (x86_64) - YOUR MAC TYPE

1. **Restart Mac** → Hold `⌘ + R` immediately
2. **Wait for Recovery Mode** (Apple logo appears)
3. **Utilities** → **Terminal**
4. **Type**: `csrutil disable`
5. **Type**: `reboot`
6. **After restart, verify**: `csrutil status`

---

## ✅ STEP 2: Start All Services

### Option A: Automated (Recommended)

Open **3 separate Terminal windows**:

**Terminal 1 - Backend:**
```bash
cd "/Volumes/PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE"
./start_all_services.sh
```

**Terminal 2 - Web Dashboard:**
```bash
cd "/Volumes/PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE"
./start_web_dashboard.sh
```

### Option B: Manual

**Terminal 1:**
```bash
cd "/Volumes/PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE"
docker-compose up -d
```

**Terminal 2:**
```bash
cd "/Volumes/PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE/web-dashboard"
npm run dev
```

---

## 🌐 Access URLs

- Backend: http://localhost:8080
- Web Dashboard: http://localhost:5173

---

## 🛑 Stop All Services

```bash
# Stop web dashboard and backend: Ctrl+C in their terminals

# Stop Docker:
cd "/Volumes/PROTOTYPE/SISTEM MOKA POS SINGGAH COFFEE"
docker-compose down
```

---

## 🔧 Quick Fixes

**"Operation not permitted"** → SIP still enabled, follow Step 1

**"Port in use"** → `lsof -ti:5173 | xargs kill -9`

**Docker permission** → `sudo chmod 666 ~/.docker/run/docker.sock`

---

**Full documentation**: See `STARTUP_GUIDE.md`
