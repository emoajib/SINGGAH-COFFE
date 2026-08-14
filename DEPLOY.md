# 🚀 Panduan Deploy ke Shared Hosting (sosiomen.com)

## Prasyarat

- Akses SSH ke server shared hosting
- Go 1.23+ terinstal di komputer lokal (untuk cross-compile)
- Node.js 20+ terinstal di komputer lokal (untuk build frontend)
- Git terinstal

---

## Langkah 1: Build Backend (Go Binary untuk Linux)

Jalankan di terminal lokal, dari root proyek:

```bash
cd backend
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o ../deploy/backend/main ./cmd/server
```

Ini membuat binary Linux yang bisa dijalankan di server tanpa dependensi Go.

---

## Langkah 2: Build Frontend (React → Static Files)

```bash
cd web-dashboard
npm ci
npm run build
```

Hasilnya ada di `web-dashboard/dist/` — file HTML/CSS/JS statis yang siap di-upload.

---

## Langkah 3: Siapkan Folder di Server

SSH ke server, lalu buat struktur folder:

```bash
mkdir -p ~/singgah-pos/backend
mkdir -p ~/singgah-pos/web
mkdir -p ~/singgah-pos/logs
```

---

## Langkah 4: Upload File via SCP/RSYNC

Dari komputer lokal, upload semua file yang sudah dibangun:

```bash
# Upload binary backend
scp -P 22 -i ~/.ssh/id_rsa \
  deploy/backend/main \
  user@sosiomen.com:~/singgah-pos/backend/main

# Upload hasil build frontend
scp -P 22 -i ~/.ssh/id_rsa \
  -r web-dashboard/dist/* \
  user@sosiomen.com:~/singgah-pos/web/

# Upload .htaccess
scp -P 22 -i ~/.ssh/id_rsa \
  .htaccess \
  user@sosiomen.com:~/singgah-pos/web/.htaccess

# Upload .env backend (kredensial produksi — JANGAN pernah ke git/release publik)
scp -P 22 -i ~/.ssh/id_rsa \
  backend/.env \
  user@sosiomen.com:~/singgah-pos/backend/.env

# Upload start.sh (hardened: GOMAXPROCS=1, GOMEMLIMIT=200MiB)
scp -P 22 -i ~/.ssh/id_rsa \
  backend/start.sh \
  user@sosiomen.com:~/singgah-pos/start.sh
```

Ganti `user` dengan username SSH kamu dan `sosiomen.com` dengan domain/port server kamu.

> ⚠️ **Kredensial** disimpan hanya di `backend/.env` di server (sudah di-gitignore).
> Template placeholder: `backend/.env.example`. Jika `.env` di server belum ada,
> salin dari `.env.example` lalu isi `DATABASE_URL` & `JWT_SECRET`.
> Repo ini publik — jangan pernah meletakkan kredensial nyata di file yang di-commit.

---

## Langkah 5: Jalankan Backend via SSH

SSH ke server:

```bash
ssh user@sosiomen.com

cd ~/singgah-pos
chmod +x backend/singgah-backend start.sh
./start.sh &
```

`start.sh` otomatis:
- Membaca `backend/.env` (DATABASE_URL, JWT_SECRET) — jika `.env` tidak ada, start GAGAL dengan pesan jelas (kredensial tidak pernah di-commit).
- Menetapkan `GOMAXPROCS=1` & `GOMEMLIMIT=200MiB` (wajib di shared hosting — mencegah crash `fatal error: newosproc`).

Cek backend berjalan:

```bash
curl http://localhost:8080/health
```

Harus mengembalikan `{"status":"ok"}`.

---

## Langkah 6: Konfigurasi Domain di cPanel/Apache

1. Login cPanel → **Domains** atau **Zone Editor**
2. Arahkan domain `sosiomen.com` ke folder web (mis. `~/public_html` atau `~/singgah-pos/web/`)
3. Pastikan **mod_rewrite** aktif dan `.htaccess` diizinkan (`AllowOverride All`)

> **Gateway API = `api-proxy.php`** (bukan mod_proxy). File ini sudah menyalurkan
> request `/api/*` ke backend `http://127.0.0.1:8080` DAN me-forward file upload
> multipart (constraint wajib — lihat AGENTS.md). Pastikan `api-proxy.php` + `.htaccess`
> ikut di-upload ke folder web. `mod_proxy` TIDAK diperlukan jika memakai `api-proxy.php`.

Contoh `.htaccess` minimal (rewrite SPA + route `/api` ke api-proxy.php):

```apache
RewriteEngine On
RewriteRule ^api/(.*)$ /api-proxy.php [QSA,L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /index.html [L]
```

---

## Langkah 7: Verifikasi Deploy

Buka browser https://sosiomen.com:

- ✅ Dashboard Singgah POS muncul
- ✅ Login dengan `owner@singgah.coffee` / `admin`
- ✅ API call berjalan (tanpa CORS error)
- ✅ Produk, order, dan laporan berfungsi

---

## Struktur Folder di Server

```
~/singgah-pos/
├── backend/
│   ├── singgah-backend ← Binary Go (chmod +x)
│   ├── start.sh        ← Di-upload sebagai root start.sh
│   └── .env            ← Kredensial produksi (gitignore, wajib ada)
├── start.sh            ← Script start (hardened GOMAXPROCS/GOMEMLIMIT)
├── ~/public_html/      ← Folder web: index.html, assets/, .htaccess, api-proxy.php
└── logs/
```

---

## Deploy Ulang (Update)

1. `git pull origin main`
2. Rebuild: backend (`CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o backend/singgah-backend ./cmd/server` di `backend/`) + frontend (`npm run build` di `web-dashboard/`)
3. Upload ulang binary, frontend, `api-proxy.php`, `.htaccess`, dan `backend/start.sh`
4. Restart backend: `pkill -f "singgah-backend"` lalu `./start.sh &`

> ⚠️ Jika server lama menjalankan `backend/start.sh` versi hardcoded, setelah pull versi baru
> **wajib** memastikan `backend/.env` ada (isi DATABASE_URL & JWT_SECRET) — jika tidak, backend
> tidak akan start. Kredensial yang pernah ter-commit karena repo publik harus di-rotasi.

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| `502 Bad Gateway` | Backend belum jalan. Cek: `curl http://localhost:8080/health` |
| `403 Forbidden` | `.htaccess` tidak aktif. Pastikan `AllowOverride All` di Apache config |
| `500 Internal Server Error` | Cek log: `tail -f ~/singgah-pos/logs/backend.log`; pastikan `backend/.env` ada |
| CORS error | Pastikan `api-proxy.php` + `.htaccess` ada di folder web |
| Backend mati | Cek log `~/singgah-pos/logs/backend.log` — sering karena `.env` hilang atau `JWT_SECRET`/`DATABASE_URL` kosong. Jalankan ulang: `cd ~/singgah-pos && ./start.sh &` |