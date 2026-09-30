# Standard Operating Procedure (SOP) Akuntansi & Bagan Akun (Chart of Accounts)
## Singgah Coffee POS — Standar PSAK / SAK EMKM

> **Vetted by AI - Manual Review Required by Senior Engineer/Manager**

Dokumen ini adalah pedoman tata kelola keuangan, hierarki bagan akun (CoA), segregasi peran (*segregation of duties*), serta prosedur penutupan buku pada Sistem POS Singgah Coffee.

---

### 1. Struktur Bagan Akun (Hierarki 3 Level)

Sistem menggunakan 5 tipe dasar akuntansi (`asset`, `liability`, `equity`, `revenue`, `expense`) dengan arsitektur hierarki 3 level:

* **Level 1 (Induk Utama / Header):** Nomor akun kepala `x000` (Folder utama). Dilarang untuk posting transaksi.
* **Level 2 (Sub-Induk / Akun Kelompok):** Nomor akun `xx00` atau akun kepala kelompok. Dilarang untuk posting jika berstatus header.
* **Level 3 (Akun Transaksi / Posting):** Akun anak tempat mencatat jurnal debit/kredit harian.

#### Kamus Akun Standar Singgah Coffee
| Kode | Nama Akun | Tipe | Level | Sifat / Flag | Saldo Normal | Fungsi & Keterangan |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **1000** | **ASET** | `asset` | 1 | Header | Debit | Folder induk seluruh aset |
| **1100** | **Aset Lancar** | `asset` | 2 | Header | Debit | Pengelompok kas, piutang, persediaan |
| `1101` | Kas | `asset` | 3 | Posting | Debit | Uang fisik di laci kasir |
| `1102` | Piutang Usaha | `asset` | 3 | Posting | Debit | Piutang pelanggan / open bill belum lunas |
| `1103` | Persediaan | `asset` | 3 | Posting | Debit | Nilai persediaan bahan baku (perpetual) |
| `1104` | Bank / QRIS | `asset` | 3 | Posting | Debit | Rekening bank & settlement QRIS |
| `1105` | PPN Masukan | `asset` | 3 | Posting | Debit | Pajak masukan saat pembelian bahan baku |
| **1200** | **Aset Tetap** | `asset` | 2 | Header | Debit | Pengelompok mesin, alat, dan depresiasi |
| `1201` | Peralatan | `asset` | 3 | Posting | Debit | Mesin espresso, grinder, blender, kulkas |
| `1202` | Akumulasi Depresiasi | `asset` | 3 | Kontra Aset | **Kredit** | Pengurang nilai buku aset peralatan |
| **2000** | **KEWAJIBAN** | `liability` | 1 | Header | Kredit | Folder induk utang |
| **2100** | **Kewajiban Lancar** | `liability` | 2 | Header | Kredit | Utang tempo < 1 tahun |
| `2101` | Utang Usaha | `liability` | 3 | Posting | Kredit | Utang ke supplier / pemasok bahan |
| `2102` | Utang Pajak (PPN/PB1) | `liability` | 3 | Posting | Kredit | Utang pajak restoran/PPN atas penjualan |
| **2200** | **Kewajiban Jangka Panjang** | `liability` | 2 | Header | Kredit | Utang tempo > 1 tahun |
| `2201` | Utang Jangka Panjang | `liability` | 3 | Posting | Kredit | Utang modal investor / pinjaman modal |
| **3000** | **EKUITAS** | `equity` | 1 | Header | Kredit | Folder modal dan hak pemilik |
| `3101` | Modal Usaha | `equity` | 2 | Posting | Kredit | Setoran modal awal dan tambahan modal |
| `3102` | Laba Ditahan | `equity` | 2 | Posting | Kredit | Akumulasi laba tahun-tahun sebelumnya |
| `3103` | Prive | `equity` | 2 | Kontra Ekuitas | **Debit** | Penarikan dana pribadi oleh pemilik kedai |
| `3999` | *Laba (Rugi) Berjalan* | `equity` | 2 | Sintetis | Kredit/Debit | Dihitung otomatis oleh sistem di Neraca |
| **4000** | **PENDAPATAN** | `revenue` | 1 | Header | Kredit | Folder penjualan dan omzet |
| `4101` | Pendapatan Penjualan | `revenue` | 2 | Posting | Kredit | Omzet penjualan F&B kasir |
| `4102` | Pendapatan Service | `revenue` | 2 | Posting | Kredit | Pendapatan service charge |
| `4103` | Pendapatan Lain-lain | `revenue` | 2 | Posting | Kredit | Pendapatan sewa venue, merchandise, bunga |
| **5000** | **BEBAN** | `expense` | 1 | Header | Debit | Folder beban biaya |
| **5100** | **Harga Pokok Penjualan** | `expense` | 2 | Header | Debit | Pengelompok HPP bahan baku |
| `5101` | HPP / Beban Pokok | `expense` | 3 | Posting | Debit | HPP murni resep produk yang terjual |
| **5200** | **Beban Operasional** | `expense` | 2 | Header | Debit | Biaya operasional kedai |
| `5201` | Beban Operasional | `expense` | 3 | Posting | Debit | Bahan penunjang (sedotan, tisu, kresek) |
| `5202` | Beban Gaji | `expense` | 3 | Posting | Debit | Gaji tetap barista dan staf |
| `5203` | Beban Sewa | `expense` | 3 | Posting | Debit | Amortisasi/beban sewa tempat kedai |
| `5204` | Beban Listrik & Air | `expense` | 3 | Posting | Debit | Tagihan PLN, PDAM, dan internet WiFi |
| `5205` | Beban Depresiasi | `expense` | 3 | Posting | Debit | Biaya penyusutan mesin dan peralatan |
| `5206` | Beban Pemeliharaan Peralatan | `expense` | 3 | Posting | Debit | Servis mesin espresso, kalibrasi, ganti part |
| **5300** | **Beban Non-Operasional & Finansial** | `expense` | 2 | Header | Debit | Pengelompok biaya non-rutin |
| `5301` | Beban Bunga | `expense` | 3 | Posting | Debit | Biaya bunga pinjaman / biaya MDR bank |
| `5302` | Beban Lain-lain | `expense` | 3 | Posting | Debit | Beban administrasi dan kerugian lain |

---

### 2. Segregasi Peran & Hak Akses (Zero Trust Governance)

1. **Kasir / Barista:**
   * **Akses:** DIBLOKIR TOTAL (`403 Forbidden`).
   * **Alasan:** Kasir hanya bertugas melayani pesanan kasir, mencocokkan uang laci fisik kasir (`1101`), dan operasional mesin espresso. Pencatatan jurnal kasir terjadi secara otomatis di latar belakang oleh sistem.
2. **Manajer:**
   * **Akses:** Akses Bersyarat (*Conditional Access*).
   * **Mekanisme:** Manajer hanya dapat melihat menu `Buku Besar (CoA)`, `Jurnal Umum`, dan `Laporan PSAK` jika Owner telah mengaktifkan saklar *"Izinkan Manajer Mengakses Akun Akuntansi & Jurnal"* di menu Pengaturan Toko.
   * **Batasan:** Manajer tidak diizinkan mengubah struktur dasar akun (tambah/edit/hapus akun induk hanya bisa dilakukan oleh Owner).
3. **Owner (Pemilik):**
   * **Akses:** Penuh (*Full Access*). Mengelola akun, delegasi akses manajer, dan pembagian laba (*profit sharing*).

---

### 3. Prosedur Operasional Standar (SOP)

#### SOP 1: Penarikan Pribadi (Prive) vs Beban Operasional
* **Ketentuan:** Pemilik kedai kopi sering kali mengambil kas untuk kebutuhan pribadi. Pengambilan ini **DILARANG KERAS** dicatat sebagai Beban Operasional (`5201`) atau Beban Lainnya (`5302`).
* **Dampak Buruk Jika Salah Catat:** Mencatat prive sebagai beban akan mengecilkan Laba Bersih kedai dan merugikan barista dalam perhitungan bagi hasil kemitraan (*profit sharing*).
* **Alur Benar:** Catat penarikan kas pemilik ke akun **`3103 Prive`** melalui menu Buku Kas / Jurnal Manual:
  * **Debit:** `3103 Prive` (Mengurangi Ekuitas)
  * **Kredit:** `1101 Kas` (atau `1104 Bank/QRIS` jika transfer)

#### SOP 2: Beban Pemeliharaan (`5206`) vs Pembelian Aset Tetap (`1201`)
* **Gunakan 5206 (Beban Pemeliharaan Peralatan):** Jika pengeluaran bersifat mempertahankan kinerja alat (servis mesin kopi, ganti gasket, descaling, penggantian mata pisau grinder).
* **Gunakan 1201 (Peralatan / Aset Tetap):** Jika pengeluaran menghasilkan penambahan alat baru bernilai material dengan masa manfaat > 1 tahun (beli mesin espresso baru, tambah chiller, pasang AC).

#### SOP 3: Larangan Memposting Transaksi ke Akun Induk (Header)
* Akun berkode kepala berakhiran `000` atau `00` dengan flag `is_header = true` dilarang digunakan dalam transaksi jurnal.
* Sistem backend dan formulir antarmuka web secara otomatis menolak dan men-disable akun header.
