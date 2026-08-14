# 🔐 Rotasi Kredensial — WAJIB (repo publik)

> **Kapan:** segera setelah percikan yang mengekspos kredensial (lihat `AUDIT_REPORT.md`)
> **Kenapa:** history git bersifat permanen — menghapus secret dari file TIDAK menghapusnya
> dari history. Nilai di bawah sudah tersebar publik dan **harus dirotasi**.
>
> Nilai yang pernah ter-commit (SUDAH PUBLIK — ganti semua). Nilai lama di-redaksi
> di sini agar dokumen ini tidak menyebar ulang secret; detail ada di audit.
> - DB user/pass: `sosb4282_singgah_pos` / `********` (lihat AUDIT_REPORT.md)
> - JWT secret: `********` (start.sh) dan `********` (server-start.sh — nilai berbeda)

## Langkah

### 1. Rotasi password database (via cPanel)
1. Login cPanel → **MySQL® Databases**
2. Pilih user `sosb4282_singgah_pos`, klik **Change Password**
3. Buat password baru yang kuat.
4. **Persingkat waktu risiko:** password baru langsung diset sejak langkah ini.

### 2. Rotasi JWT secret + simpan di `.env`
1. Generate secret baru:
   ```bash
   openssl rand -hex 32
   ```
   (contoh sudah ada di `backend/.env.example`)
2. Edit `~/singgah-pos/backend/.env` di server:
   ```bash
   nano ~/singgah-pos/backend/.env
   ```
   Isi `DATABASE_URL` dengan user+password DB baru, dan `JWT_SECRET` dengan nilai baru.
3. Karena JWT berubah → semua sesi login lama **wajib login ulang**. Ini wajar.

### 3. Update `.env.example` di repo (placeholder saja — jangan nilai asli)
`backend/.env.example` berisi placeholder `<ISI_NILAI_ASLI_DI_SERVER>`. Jangan commit nilai asli.

### 4. Restart backend
```bash
cd ~/singgah-pos
pkill -f "singgah-backend"
./start.sh &
curl http://localhost:8080/health
```

### 5. Verifikasi login ulang
Buka dashboard, login. Kalau masih `401/403`, restart browser / bersihkan localStorage.

## Catatan GitHub
- GitHub akan otomatis memindai commit baru; pastikan tidak ada secret baru.
- Setup **secret scanning** untuk repo (GitHub → Settings → Code security) supaya
  push secret berikutnya di-block.
- Bila repo dijadikan private: tetap rotasi — sejarah git lama masih menyimpan nilai
  selama repo pernah publik (salinan bisa saja sudah tersebar).