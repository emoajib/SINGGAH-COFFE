# 📊 RECIPE MANAGEMENT SYSTEM - SETUP COMPLETE

## ✅ Setup Summary

Sistem manajemen resep telah berhasil dikonfigurasi. Sekarang setiap kali produk terjual melalui POS, sistem akan **otomatis mengurangi stok ingredient** berdasarkan resep yang telah didefinisikan.

---

## 📦 Ingredients (Bahan Baku) yang Tersedia

| ID | Nama Ingredient | Stok Saat Ini | Unit | Min Stock | Cost/Unit |
|----|----------------|---------------|------|-----------|-----------|
| 6  | Kopi Robusta   | 5,000 gram    | gram | 500       | Rp 150    |
| 7  | Kopi Blend     | 5,000 gram    | gram | 500       | Rp 180    |
| 8  | Kopi Arabika   | 5,000 gram    | gram | 500       | Rp 250    |
| 9  | Susu UHT       | 10,000 gram   | gram | 1,000     | Rp 25     |
| 10 | Susu Outside   | 10,000 gram   | gram | 1,000     | Rp 30     |
| 11 | Gula Aren      | 3,000 gram    | gram | 300       | Rp 50     |
| 12 | Gula Pasir     | 5,000 gram    | gram | 500       | Rp 15     |
| 13 | Cup            | 1,000 pcs     | pcs  | 100       | Rp 500    |
| 14 | Air Mineral    | 50,000 ml     | ml   | 5,000     | Rp 1      |

---

## ☕ Produk dengan Resep

### 1. **Kopi Susu Gula Aren** (Rp 12,000)
**Resep per 1 cup:**
- Kopi Robusta: 15 gram (Rp 2,250)
- Susu UHT: 90 gram (Rp 2,250)
- Gula Aren: 25 gram (Rp 1,250)
- Cup: 1 pcs (Rp 500)
- Air Mineral: 50 ml (Rp 50)

**Cost:** Rp 6,300  
**Profit:** Rp 5,700 (47.50% margin)

---

### 2. **Kopi Hitam** (Rp 8,000)
**Resep per 1 cup:**
- Kopi Robusta: 15 gram (Rp 2,250)
- Gula Pasir: 20 gram (Rp 300)
- Cup: 1 pcs (Rp 500)
- Air Mineral: 100 ml (Rp 100)

**Cost:** Rp 3,150  
**Profit:** Rp 4,850 (60.63% margin)

**Note:** Sistem saat ini menggunakan Kopi Robusta sebagai default. Untuk implementasi pilihan kopi (Robusta/Blend/Arabika), perlu pengembangan fitur variant di masa depan.

---

### 3. **Kopi Susu** (Rp 10,000)
**Resep per 1 cup:**
- Kopi Robusta: 15 gram (Rp 2,250)
- Susu UHT: 90 gram (Rp 2,250)
- Cup: 1 pcs (Rp 500)
- Air Mineral: 50 ml (Rp 50)

**Cost:** Rp 5,050  
**Profit:** Rp 4,950 (49.50% margin)

---

### 4. **Kopi Susu Outside** (Rp 11,000)
**Resep per 1 cup:**
- Kopi Robusta: 15 gram (Rp 2,250)
- Susu Outside: 90 gram (Rp 2,700)
- Cup: 1 pcs (Rp 500)
- Air Mineral: 50 ml (Rp 50)

**Cost:** Rp 5,500  
**Profit:** Rp 5,500 (50.00% margin)

---

## 🔄 Cara Kerja Sistem

### Saat Transaksi Terjadi:

1. **Kasir membuat order** melalui POS (Flutter app atau Web Dashboard)
2. **Backend menerima order** dengan detail produk dan quantity
3. **Sistem mengecek recipe** untuk produk yang dipesan
4. **Otomatis mengurangi stok ingredient** sesuai resep × quantity
5. **Mencatat stock mutation** untuk audit trail
6. **Menghitung total** dengan tax & service charge
7. **Menyimpan order** ke database

### Contoh:
Jika kasir menjual **2 cup Kopi Susu Gula Aren**, sistem akan otomatis mengurangi:
- Kopi Robusta: 30 gram (15 × 2)
- Susu UHT: 180 gram (90 × 2)
- Gula Aren: 50 gram (25 × 2)
- Cup: 2 pcs (1 × 2)
- Air Mineral: 100 ml (50 × 2)

---

## 📊 Monitoring Stok

### Melalui Web Dashboard:
1. Login sebagai **Owner** atau **Manager**
2. Buka menu **"Inventory"**
3. Lihat daftar ingredients dengan stok real-time
4. Sistem akan menampilkan **warning** jika stok mendekati minimum
5. Lihat **Stock Mutations** untuk audit trail lengkap

### Melalui Database:
```sql
-- Cek stok ingredient
SELECT name, current_stock, unit, min_stock 
FROM ingredients 
WHERE current_stock < min_stock * 1.5;

-- Lihat history mutasi stok
SELECT * FROM stock_mutations 
ORDER BY created_at DESC 
LIMIT 20;
```

---

## 🔐 Security & Compliance

**⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager**

### Risk Assessment:
- **Data Integrity**: Recipe data tersimpan di database dengan foreign key constraints
- **Concurrency**: Stock deduction menggunakan SQL atomic operations (GORM Expr)
- **Audit Trail**: Semua perubahan stok tercatat di `stock_mutations` table
- **Authorization**: Hanya Owner & Manager yang bisa melihat cost data

### Technical Assumptions:
- Ingredient costs sudah diinput dengan benar
- Recipe quantities sudah diverifikasi oleh kitchen team
- Sistem menggunakan Kopi Robusta sebagai default (belum support variant selection)
- Stock mutation type: "OUT" untuk sales deduction

---

## 🚀 Next Steps & Future Enhancements

### Immediate:
1. ✅ Test transaksi untuk memverifikasi stock deduction
2. ✅ Monitor stock levels untuk reorder point
3. ✅ Train staff untuk menggunakan sistem

### Future Features:
1. **Product Variants**: Pilihan jenis kopi (Robusta/Blend/Arabika) saat order
2. **Low Stock Alerts**: Email/SMS notification saat stok menipis
3. **Purchase Order Integration**: Auto-generate PO saat stok di bawah minimum
4. **Recipe Versioning**: Track perubahan resep untuk historical accuracy
5. **Waste Management**: Track ingredient waste/spoilage
6. **Batch Tracking**: FIFO/FEFO untuk ingredient dengan expiry date

---

## 📞 Support & Troubleshooting

### Jika stok tidak berkurang setelah transaksi:
1. Cek apakah produk memiliki recipe di database
2. Verifikasi ingredient IDs di recipe_items table
3. Review backend logs untuk error messages
4. Pastikan transaction berhasil (status 201)

### Untuk menambah ingredient baru:
```sql
INSERT INTO ingredients (name, unit, current_stock, min_stock, cost_per_unit, created_at, updated_at)
VALUES ('Nama Ingredient', 'unit', 1000, 100, 500, NOW(), NOW());
```

### Untuk menambah recipe item:
```sql
INSERT INTO recipe_items (product_id, ingredient_id, quantity, created_at, updated_at)
VALUES (
    (SELECT id FROM products WHERE sku = 'PRODUCT-SKU'),
    (SELECT id FROM ingredients WHERE name = 'Ingredient Name'),
    15, -- quantity
    NOW(),
    NOW()
);
```

---

**Last Updated:** 2026-02-03  
**Version:** 1.0.0  
**Status:** Production Ready ✅
