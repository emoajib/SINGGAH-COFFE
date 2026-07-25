# 🎯 PRODUCT & INGREDIENT MANAGEMENT - USER GUIDE

## 📋 Overview

Sistem ini memungkinkan **Owner** dan **Manager** untuk:
1. ✅ **Menambah/Edit Produk** dengan recipe (resep bahan baku)
2. ✅ **Update Harga Ingredient** saat harga pasar berubah
3. ✅ **Auto-Calculate Product Cost** berdasarkan recipe
4. ✅ **Monitor Profit Margin** secara real-time
5. ✅ **Recalculate All Product Costs** otomatis saat ingredient price berubah

---

## 🚀 Cara Menggunakan

### **1. Product Management (Products & Recipes)**

#### **Akses Menu:**
1. Login sebagai **Owner** atau **Manager**
2. Klik menu **"Products & Recipes"** di sidebar

#### **Menambah Produk Baru:**

1. **Klik tombol "Add Product"**
2. **Isi informasi dasar:**
   - Product Name (contoh: "Kopi Susu Gula Aren")
   - Category (contoh: "Kopi Susu")
   - SKU (contoh: "KSGA-001")
   - Price (Rp) - harga jual
   - Stock - stok awal (optional)
   - Description - deskripsi produk

3. **Tambahkan Recipe (Resep):**
   - Klik **"Add Ingredient"**
   - Pilih ingredient dari dropdown
   - Masukkan quantity (jumlah yang dibutuhkan per 1 produk)
   - Ulangi untuk semua ingredient yang diperlukan
   
   **Contoh Recipe untuk "Kopi Susu Gula Aren":**
   ```
   - Kopi Robusta: 15 gram
   - Susu UHT: 90 gram
   - Gula Aren: 25 gram
   - Cup: 1 pcs
   - Air Mineral: 50 ml
   ```

4. **Review Cost Calculation:**
   - Sistem akan otomatis menghitung:
     - **Estimated Cost**: Total biaya bahan baku
     - **Estimated Profit**: Harga jual - Cost
     - **Profit Margin**: Persentase keuntungan
   
5. **Klik "Save Product"**

#### **Mengedit Produk:**

1. Klik icon **Edit (✏️)** pada product card
2. Ubah informasi yang diperlukan
3. Tambah/hapus ingredient di recipe
4. Review cost calculation yang ter-update
5. Klik "Save Product"

#### **Menghapus Produk:**

1. Klik icon **Trash (🗑️)** pada product card
2. Konfirmasi penghapusan
3. Produk dan recipe-nya akan dihapus

---

### **2. Ingredient Management (Ingredients & Pricing)**

#### **Akses Menu:**
1. Login sebagai **Owner** atau **Manager**
2. Klik menu **"Ingredients & Pricing"** di sidebar

#### **Melihat Daftar Ingredient:**

Tabel menampilkan:
- **Ingredient Name**: Nama bahan baku
- **Unit**: Satuan (gram, ml, pcs, dll)
- **Current Stock**: Stok saat ini
- **Min Stock**: Minimum stok (untuk alert)
- **Cost/Unit**: Harga per satuan
- **Status**: 
  - 🔴 **Low Stock** (stok ≤ min stock)
  - 🟡 **Warning** (stok 100-150% dari min stock)
  - 🟢 **Good** (stok > 150% dari min stock)

#### **Update Ingredient Price (Saat Harga Pasar Berubah):**

1. **Klik icon Edit (✏️)** pada ingredient yang ingin diupdate
2. **Edit field yang diperlukan:**
   - Name - nama ingredient
   - Unit - satuan
   - **Cost Per Unit** - **HARGA BARU** (ini yang paling penting!)
   - Min Stock - minimum stok

3. **Lihat Price Change Indicator:**
   - 🔺 **Red Arrow** + percentage = Harga naik
   - 🔻 **Green Arrow** + percentage = Harga turun

4. **Klik icon Save (💾)**

5. **Sistem akan otomatis:**
   - ✅ Update ingredient price
   - ✅ **Recalculate cost** untuk SEMUA produk yang menggunakan ingredient ini
   - ✅ Update profit margin untuk produk-produk tersebut

6. **Konfirmasi:**
   - Alert muncul: "Ingredient updated successfully! Product costs have been recalculated."

---

## 💡 Use Cases & Scenarios

### **Scenario 1: Harga Susu UHT Naik**

**Situasi:**
- Harga Susu UHT di pasar naik dari Rp 25/gram menjadi Rp 30/gram

**Langkah:**
1. Buka **"Ingredients & Pricing"**
2. Cari "Susu UHT" di tabel
3. Klik Edit
4. Ubah **Cost Per Unit** dari `25` menjadi `30`
5. Lihat indicator: 🔺 **+20%** (harga naik 20%)
6. Klik Save

**Hasil:**
- Susu UHT price updated: Rp 30/gram
- **Kopi Susu Gula Aren** cost recalculated:
  - Sebelum: Rp 6,300
  - Sesudah: Rp 6,750 (+Rp 450)
- **Kopi Susu** cost recalculated:
  - Sebelum: Rp 5,050
  - Sesudah: Rp 5,500 (+Rp 450)
- Profit margin ter-update otomatis

**Action Required:**
- Review profit margin yang baru
- Pertimbangkan untuk adjust harga jual jika margin terlalu kecil

---

### **Scenario 2: Menambah Produk Baru "Kopi Arabika Premium"**

**Langkah:**
1. Buka **"Products & Recipes"**
2. Klik **"Add Product"**
3. Isi data:
   ```
   Name: Kopi Arabika Premium
   Category: Kopi
   SKU: KAP-001
   Price: 15000
   Description: Kopi arabika single origin premium
   ```
4. Tambah Recipe:
   ```
   - Kopi Arabika: 20 gram
   - Gula Pasir: 15 gram
   - Cup: 1 pcs
   - Air Mineral: 100 ml
   ```
5. Review Cost Calculation:
   ```
   Estimated Cost: Rp 5,650
   Selling Price: Rp 15,000
   Estimated Profit: Rp 9,350
   Profit Margin: 62.33%
   ```
6. Klik **"Save Product"**

**Hasil:**
- Produk baru tersimpan dengan recipe
- Cost otomatis calculated
- Produk langsung muncul di POS terminal
- Saat terjual, stok ingredient otomatis berkurang

---

### **Scenario 3: Mengubah Recipe Produk Existing**

**Situasi:**
- Ingin mengubah recipe "Kopi Susu" untuk menggunakan lebih sedikit susu (cost reduction)

**Langkah:**
1. Buka **"Products & Recipes"**
2. Cari "Kopi Susu"
3. Klik Edit
4. Ubah recipe:
   - Susu UHT: dari `90 gram` menjadi `75 gram`
5. Review Cost Calculation:
   ```
   Before: Rp 5,050
   After: Rp 4,675 (-Rp 375)
   Profit Margin: 53.25% (naik dari 49.50%)
   ```
6. Klik **"Save Product"**

**Hasil:**
- Recipe ter-update
- Cost berkurang
- Profit margin meningkat
- Transaksi selanjutnya akan menggunakan recipe yang baru

---

## 📊 Features & Benefits

### **Auto-Calculate Cost**
✅ Tidak perlu hitung manual  
✅ Akurat berdasarkan recipe real  
✅ Update otomatis saat ingredient price berubah

### **Real-Time Profit Margin**
✅ Lihat profit margin langsung saat input data  
✅ Bantu decision making untuk pricing  
✅ Monitor profitability setiap produk

### **Centralized Ingredient Pricing**
✅ Update harga di satu tempat  
✅ Semua produk ter-update otomatis  
✅ Konsisten dengan harga pasar

### **Recipe Management**
✅ Dokumentasi resep yang jelas  
✅ Konsistensi kualitas produk  
✅ Mudah training staff baru

### **Stock Deduction Automation**
✅ Stok ingredient berkurang otomatis saat transaksi  
✅ Tidak perlu manual stock counting  
✅ Audit trail lengkap

---

## ⚠️ Important Notes

### **Tentang Cost Calculation:**
- Cost dihitung berdasarkan **recipe × ingredient cost**
- Cost **otomatis ter-update** saat ingredient price berubah
- Cost **TIDAK termasuk** overhead, labor, utilities (hanya material cost)

### **Tentang Stock:**
- Field "Stock" di product adalah untuk **direct stock** (produk jadi yang tidak menggunakan recipe)
- Produk dengan recipe **tidak perlu** field stock, karena availability-nya tergantung ingredient stock

### **Tentang Pricing Strategy:**
- Sistem hanya calculate cost, **pricing decision** tetap di tangan Owner
- Recommended profit margin: **40-60%** untuk F&B industry
- Pertimbangkan kompetitor pricing dan target market

---

## 🔐 Security & Access Control

### **Role-Based Access:**
- **Owner**: Full access (Create, Read, Update, Delete)
- **Manager**: Full access (Create, Read, Update, Delete)
- **Cashier**: Read-only untuk product list (tidak bisa lihat cost)

### **Data Privacy:**
- **Cost data** hanya visible untuk Owner & Manager
- Cashier hanya bisa lihat product name, price, dan stock
- Ingredient cost per unit hidden dari cashier

---

## 📞 Troubleshooting

### **Problem: Cost tidak ter-update setelah ubah ingredient price**
**Solution:**
- Pastikan klik tombol **Save** setelah edit
- Refresh halaman Products & Recipes untuk lihat cost terbaru
- Check backend logs jika masih bermasalah

### **Problem: Tidak bisa tambah ingredient di recipe**
**Solution:**
- Pastikan ingredient sudah ada di database
- Buka "Ingredients & Pricing" untuk verifikasi
- Jika ingredient belum ada, tambahkan dulu melalui Inventory page

### **Problem: Profit margin negatif**
**Solution:**
- Review recipe: apakah quantity ingredient terlalu banyak?
- Review ingredient cost: apakah harga terlalu tinggi?
- Adjust selling price atau optimize recipe

---

## 🎓 Best Practices

### **1. Regular Price Updates**
- Update ingredient prices **minimal 1x per bulan**
- Monitor market prices untuk bahan baku utama
- Set reminder untuk review pricing

### **2. Recipe Optimization**
- Review recipe secara berkala
- Test quality vs cost trade-off
- Dokumentasikan perubahan recipe

### **3. Profit Margin Monitoring**
- Target minimum margin: **40%**
- Review produk dengan margin < 30%
- Consider discontinue produk dengan margin < 20%

### **4. Stock Management**
- Set min stock yang realistis
- Order ingredient sebelum mencapai min stock
- Monitor fast-moving ingredients

---

**Last Updated:** 2026-02-03  
**Version:** 1.0.0  
**Status:** Production Ready ✅
