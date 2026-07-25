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

# Upload .env backend
scp -P 22 -i ~/.ssh/id_rsa \
  backend/.env \
  user@sosiomen.com:~/singgah-pos/backend/.env

# Upload server-start.sh
scp -P 22 -i ~/.ssh/id_rsa \
  server-start.sh \
  user@sosiomen.com:~/singgah-pos/start.sh
```

Ganti `user` dengan username SSH kamu dan `sosiomen.com` dengan domain/port server kamu.

---

## Langkah 5: Jalankan Backend via SSH

SSH ke server:

```bash
ssh user@sosiomen.com

cd ~/singgah-pos
chmod +x backend/main start.sh
./start.sh &
```

Cek backend berjalan:

```bash
curl http://localhost:8080/health
```

Harus mengembalikan `{"status":"ok"}`.

---

## Langkah 6: Konfigurasi Domain di cPanel/Apache

1. Login cPanel → **Domains** atau **Zone Editor**
2. Arahkan domain `sosiomen.com` ke folder `~/singgah-pos/web/`
3. Pastikan **mod_rewrite** dan **mod_proxy** aktif di Apache
4. Pastikan `.htaccess` diizinkan (AllowOverride All)

Atau jika menggunakan `.htaccess` di folder web:

```apache
RewriteEngine On
RewriteCond %{REQUEST_URI} ^/api(.*)$ [NC]
RewriteRule ^/api(.*)$ http://127.0.0.1:8080/api$1 [P,L]
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
│   ├── main          ← Binary Go (chmod +x)
│   └── .env          ← Konfigurasi environment
├── start.sh          ← Script start backend
├── web/
│   ├── index.html
│   ├── assets/
│   ├── .htaccess
│   └── ...
└── logs/
```

---

## Deploy Ulang (Update)

Ketika ada perubahan kode:

1. `git pull origin main`
2. Ulangi Langkah 1–2 (build)
3. Upload ulang file via SCP
4. Restart backend: `pkill -f "singgah-pos/backend/main"` lalu `./start.sh &`

---

## Troubleshooting

| Masalah | Solusi |
|---|---|
| `502 Bad Gateway` | Backend belum jalan. Cek: `curl http://localhost:8080/health` |
| `403 Forbidden` | `.htaccess` tidak aktif. Pastikan `AllowOverride All` di Apache config |
| `500 Internal Server Error` | Cek log: `tail -f ~/singgah-pos/logs/` |
| CORS error | Pastikan `.htaccess` ada di `~/singgah-pos/web/` dan mod_proxy aktif |
| Backend mati | Jalankan ulang: `cd ~/singgah-pos && ./start.sh &` |