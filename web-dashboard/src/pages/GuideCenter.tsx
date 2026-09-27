// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useState, useMemo } from "react"
import { useSelector } from "react-redux"
import { RootState } from "../store"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import {
  Search, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck,
  Coffee, Sparkles, HelpCircle,
  Clock, Landmark, Lightbulb, ChevronRight
} from "lucide-react"

interface GuideStep {
  title: string
  description: string
  actionTab?: string
  actionLabel?: string
  tip?: string
  warning?: string
}

interface GuideItem {
  id: string
  title: string
  category: 'cashier' | 'manager' | 'owner'
  summary: string
  badge: string
  readTime: string
  steps: GuideStep[]
}

interface GuideCenterProps {
  setActiveTab?: (tab: string) => void
}

export default function GuideCenter({ setActiveTab }: GuideCenterProps) {
  const { user } = useSelector((state: RootState) => state.auth)
  const userRole = (user?.role || 'cashier').toLowerCase().trim() as 'owner' | 'manager' | 'cashier'

  // Default role tab & guide based on RBAC rules
  const defaultRole = userRole === 'owner' ? 'owner' : userRole === 'manager' ? 'manager' : 'cashier'
  const [selectedRole, setSelectedRole] = useState<'owner' | 'manager' | 'cashier'>(defaultRole)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedGuideId, setSelectedGuideId] = useState<string>(() => {
    if (userRole === 'owner') return "owner-bagi-hasil"
    if (userRole === 'manager') return "manager-hpp-resep"
    return "cashier-buka-kasir"
  })
  const [checklist, setChecklist] = useState<Record<string, boolean>>({})

  const toggleCheck = (id: string) => {
    setChecklist(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // Master Data Panduan & SOP Singgah Coffee
  const guides: GuideItem[] = useMemo(() => [
    // ================= PANDUAN OWNER =================
    {
      id: "owner-bagi-hasil",
      title: "Panduan Menghitung Bagi Hasil & Potongan Kasbon Barista",
      category: "owner",
      badge: "Keuangan & Bagi Hasil",
      readTime: "4 menit baca",
      summary: "Cara menghitung pembagian keuntungan transparan dengan barista, mengatur kehadiran/libur, mencatat kasbon, dan mencetak dokumen serah terima A4 resmi.",
      steps: [
        {
          title: "Langkah 1: Masuk ke Menu Bagi Hasil",
          description: "Pilih menu 'Bagi Hasil' di sidebar kiri. Menu ini khusus dirancang untuk Owner guna memantau hak keuntungan secara presisi.",
          actionTab: "profit-sharing",
          actionLabel: "Buka Menu Bagi Hasil",
          tip: "Bagi hasil dapat dihitung mingguan, dua mingguan, atau bulanan sesuai kesepakatan kafe."
        },
        {
          title: "Langkah 2: Tentukan Tanggal, Jam & Basis Bagi Hasil",
          description: "Masukkan rentang Tanggal Mulai dan Tanggal Akhir beserta jam operasional (misal: 00:00 s/d 23:59). Pilih Jenis Basis Bagi Hasil: 'Laba Bersih (Net Profit)' jika beban operasional toko memotong laba bersama, atau 'Laba Kotor (Gross Margin)' jika beban toko ditanggung sendiri oleh Owner.",
          tip: "Sebagian besar kedai kopi memilih Laba Bersih untuk kemitraan bagi hasil yang adil."
        },
        {
          title: "Langkah 3: Atur Porsi % dan Kehadiran Barista",
          description: "Ketik porsi Owner % (misal 60%) dan sistem otomatis membagi sisa 40% ke seluruh barista yang terdaftar. Klik tombol kehadiran barista untuk mengatur tanggal libur atau cuti penuh barista tersebut jika ada yang tidak masuk kerja.",
          tip: "Jika barista libur 2 hari dari 30 hari periode, potongan jatah liburnya otomatis dialihkan menambah hak Owner."
        },
        {
          title: "Langkah 4: Hitung Preview & Sinkronkan Kasbon Barista",
          description: "Klik 'Hitung Preview Bagi Hasil'. Sistem secara cerdas akan mendeteksi kasbon aktif (pending) yang pernah diambil barista pada periode tersebut. Jatah bersih barista otomatis dipotongkan sebesar nominal kasbon, dan uang kasbon tersebut dikembalikan masuk ke jatah Owner.",
          actionTab: "profit-sharing",
          actionLabel: "Hitung Preview Sekarang",
          warning: "Jika terdapat kasbon baru yang baru dicatat atau nota baru, Anda cukup mengklik tombol 'Sinkronkan Data' pada draft untuk memperbarui perhitungan seketika tanpa perlu membuat ulang!"
        },
        {
          title: "Langkah 5: Finalize & Cetak Dokumen Bukti Serah Terima A4",
          description: "Setelah seluruh angka disetujui, klik 'Finalize Periode Ini'. Seluruh kasbon terkait akan otomatis dilunaskan (settled) di dalam sistem. Klik tombol 'Cetak Bukti Bagi Hasil' untuk mencetak dokumen format A4 lengkap dengan lembar tanda tangan basah Owner dan seluruh Barista.",
          tip: "Simpan arsip cetak bukti bagi hasil sebagai bukti pertanggungjawaban kas yang sah dan mengikat."
        }
      ]
    },
    {
      id: "owner-rekap-pengeluaran",
      title: "Panduan Rekap Pengeluaran Kas Laci vs Digital & Burn Rate",
      category: "owner",
      badge: "Pengeluaran & Likuiditas",
      readTime: "3 menit baca",
      summary: "Cara membaca analitik pengeluaran, memisahkan uang keluar laci tunai kasir vs transfer QRIS, serta membaca indikator kesehatan kas toko.",
      steps: [
        {
          title: "Langkah 1: Masuk ke Menu Pengeluaran",
          description: "Buka menu 'Pengeluaran' di sidebar. Di bagian atas halaman, Anda akan disajikan 4 Kartu Eksekutif Analisis Pengeluaran.",
          actionTab: "expenses",
          actionLabel: "Buka Halaman Pengeluaran"
        },
        {
          title: "Langkah 2: Gunakan Quick Filter Waktu",
          description: "Gunakan tombol cepat seperti 'Hari Ini', 'Kemarin', '7 Hari Terakhir', atau 'Bulan Ini' untuk langsung memfilter data tanpa mengetik tanggal manual.",
          tip: "Filter 'Bulan Ini' sangat ideal untuk melihat total belanja operasional bulanan toko."
        },
        {
          title: "Langkah 3: Periksa Kartu 'Kas Laci (Tunai)' vs 'Digital / QRIS'",
          description: "Kartu Kas Laci Tunai mencatat semua uang fisik yang diambil kasir dari laci (beli es, galon, dsb). Kartu Digital mencatat nota yang dibayar via transfer rekening bank atau QRIS Owner. Pastikan angka kas laci cocok dengan pengeluaran di laci fisik.",
          tip: "Memisahkan tunai dan digital mencegah salah paham antara uang laci fisik kasir dengan mutasi bank."
        },
        {
          title: "Langkah 4: Pantau Rasio Beban terhadap Omzet & Burn Rate",
          description: "Periksa rasio persentase beban terhadap omzet. Idealnya untuk kedai kopi F&B, beban operasional harian berada di bawah 25-35% dari omzet. Jika burn rate harian melonjak, periksa kartu 'Top 3 Pos Pengeluaran Terbesar' untuk mengidentifikasi penyebabnya.",
          warning: "Jika rasio beban melebihi 40%, segera evaluasi pemborosan bahan baku atau utilitas toko."
        },
        {
          title: "Langkah 5: Beralih ke Tampilan 'Rekap Harian Kas (Matrix)'",
          description: "Klik tombol switcher tampilan 'Rekap Harian Kas' di atas tabel. Tampilan tabel ini menyajikan baris per tanggal dengan kolom Tunai vs Digital, transaksi terbanyak, dan total harian, mempermudah audit pembukuan harian.",
          tip: "Tampilan matriks harian sangat praktis untuk dicetak atau difoto sebagai rekonsiliasi kas harian."
        }
      ]
    },
    {
      id: "owner-catat-kasbon",
      title: "SOP & Cara Mencatat Kasbon Barista",
      category: "owner",
      badge: "Kasbon & Karyawan",
      readTime: "2 menit baca",
      summary: "Tata cara mencatat pinjaman kasbon barista dari laci kas maupun transfer serta bagaimana sistem melindunginya agar tidak dobel potong.",
      steps: [
        {
          title: "Langkah 1: Buka Tab 'Kasbon Barista'",
          description: "Di menu 'Bagi Hasil', klik tab 'Kasbon Barista' di pojok kanan atas, atau klik tombol '+ Catat Kasbon Barista'.",
          actionTab: "profit-sharing",
          actionLabel: "Buka Tab Kasbon"
        },
        {
          title: "Langkah 2: Isi Formulir Catat Kasbon",
          description: "Pilih nama barista dari daftar, masukkan tanggal kasbon, dan pilih Metode Kas Keluar: 'Cash (Kas Laci Toko)' jika uang diambil langsung dari kasir, atau 'Transfer' jika dikirim dari rekening Owner.",
          tip: "Jika memilih Cash, sistem secara otomatis mencatat pengeluaran di Buku Kas kasir dengan referensi kasbon sehingga uang fisik di laci tetap seimbang."
        },
        {
          title: "Langkah 3: Tulis Keperluan Kasbon",
          description: "Ketik alasan kasbon (misal: 'Bensin & pulsa mendadak', 'Servis motor', dsb). Masukkan nominal Rupiah, lalu klik 'Simpan Catatan Kasbon'.",
          tip: "Status kasbon akan otomatis menjadi 'PENDING' sampai periode bagi hasil di-finalize."
        },
        {
          title: "Langkah 4: Pemotongan Otomatis & Pemulihan Kas Owner",
          description: "Anda tidak perlu menghitung manual! Saat periode bagi hasil dihitung, kasbon barista tersebut otomatis memotong jatah barista bersangkutan dan menambahkan uang kembali ke jatah Owner.",
          warning: "Kasbon yang berstatus Pending dapat dibatalkan/dihapus sewaktu-waktu sebelum periode bagi hasil di-finalize."
        }
      ]
    },
    {
      id: "owner-bep-psak",
      title: "Panduan Analisis Titik Impas (BEP) & Standar Akuntansi PSAK",
      category: "owner",
      badge: "Analitik & Akuntansi",
      readTime: "4 menit baca",
      summary: "Memahami berapa cup kopi yang wajib terjual per hari agar modal kembali (BEP), serta membaca Jurnal Umum & Laporan PSAK.",
      steps: [
        {
          title: "Langkah 1: Buka Analisis BEP",
          description: "Pilih menu 'Analisis BEP' di sidebar. Halaman ini menghitung Titik Impas otomatis dari Biaya Tetap (sewa tempat, gaji, internet) dan Biaya Variabel (bahan per cup).",
          actionTab: "bep",
          actionLabel: "Buka Analisis BEP"
        },
        {
          title: "Langkah 2: Baca Target Penjualan Cup Harian",
          description: "Perhatikan angka 'Target Cup per Hari'. Ini adalah jumlah cup minuman minimal yang harus terjual setiap hari agar operasional toko tidak merugi.",
          tip: "Jika target harian 45 cup dan penjualan rata-rata 60 cup, kedai kopi Anda beroperasi di zona profit yang sehat."
        },
        {
          title: "Langkah 3: Periksa Jurnal Umum & Buku Besar PSAK",
          description: "Sistem POS Singgah Coffee dilengkapi standar akuntansi PSAK otomatis. Setiap ada penjualan dan belanja, sistem menjurnal sisi Debit dan Kredit secara seimbang di menu 'Jurnal Umum' dan 'Buku Besar (CoA)'.",
          actionTab: "psak-reports",
          actionLabel: "Buka Laporan PSAK"
        }
      ]
    },

    // ================= PANDUAN MANAJER =================
    {
      id: "manager-menu-resep",
      title: "Panduan Manajemen Menu, Bahan Baku & Resep HPP",
      category: "manager",
      badge: "Menu & HPP",
      readTime: "3 menit baca",
      summary: "Cara memasukkan data bahan baku, mengatur takaran resep produk kopi, dan memastikan modal HPP terhitung otomatis saat kasir bertransaksi.",
      steps: [
        {
          title: "Langkah 1: Masuk ke Menu Bahan & Resep",
          description: "Pilih menu 'Bahan & Resep' di sidebar. Di sini Anda mengelola inventaris bahan baku (biji kopi, susu, sirup, cup) dan daftar produk jadi.",
          actionTab: "products",
          actionLabel: "Buka Menu Bahan & Resep"
        },
        {
          title: "Langkah 2: Daftarkan Bahan Baku & Harga Beli",
          description: "Daftarkan bahan baku lengkap dengan satuan pakainya (misal: Biji Kopi House Blend dalam satuan 'gram', Susu UHT dalam 'ml', Cup 14oz dalam 'pcs'). Masukkan harga beli per kemasan agar sistem mengetahui biaya per gram/ml.",
          tip: "Selalu update harga beli bahan baku jika terjadi kenaikan harga dari supplier pasar."
        },
        {
          title: "Langkah 3: Pasang Resep pada Produk Menu",
          description: "Buka produk (misal: 'Kopi Susu Gula Aren'). Tambahkan item resep: 18 gram Biji Kopi, 120 ml Susu, 20 ml Gula Aren, 1 pcs Cup 14oz. Sistem otomatis menjumlahkan HPP murni per cup.",
          warning: "Tanpa resep yang benar, stok bahan baku tidak akan berkurang otomatis dan laporan HPP laba kotor tidak akurat!"
        },
        {
          title: "Langkah 4: Atur Ambang Batas Stok Menipis (Alert)",
          description: "Set batas minimum stok bahan baku (misal sisa 500 gram biji kopi). Sistem akan memunculkan peringatan warna kuning/merah jika bahan baku mulai habis.",
          actionTab: "kebutuhan-stok",
          actionLabel: "Lihat Kebutuhan Stok"
        }
      ]
    },
    {
      id: "manager-shift-kas",
      title: "SOP Pengawasan Shift Kasir & Rekonsiliasi Tutup Kas",
      category: "manager",
      badge: "Kas Laci & Shift",
      readTime: "3 menit baca",
      summary: "Memastikan kasir disiplin mengisi modal awal laci kasir dan melakukan audit uang fisik saat tutup shift.",
      steps: [
        {
          title: "Langkah 1: Pantau Buka Kasir Pagi Hari",
          description: "Pastikan kasir yang bertugas membuka shift dengan modal kembalian kasir (Cash Float) yang benar di menu 'Kas'.",
          actionTab: "cash-registers",
          actionLabel: "Buka Menu Kasir"
        },
        {
          title: "Langkah 2: Rekonsiliasi Tutup Shift Kasir",
          description: "Saat pergantian shift atau tutup toko, dampingi kasir menghitung seluruh uang kertas dan koin fisik di laci kasir. Bandingkan dengan total 'Uang Kas Sistem'.",
          tip: "Jika ada selisih lebih atau kurang, wajib dicatat alasannya di kolom keterangan sebelum shift ditutup."
        },
        {
          title: "Langkah 3: Otorisasi Pembatalan Transaksi (Void)",
          description: "Hanya Manajer dan Owner yang memiliki wewenang menyetujui void struk di menu 'Penjualan'. Periksa kebenaran alasan pembatalan (misal salah ketik pesanan) sebelum menyetujui void.",
          actionTab: "sales",
          actionLabel: "Lihat Riwayat Penjualan"
        }
      ]
    },

    // ================= PANDUAN KASIR =================
    {
      id: "cashier-buka-kasir",
      title: "SOP Buka Kasir: Input Modal Awal Kas (Cash Float)",
      category: "cashier",
      badge: "Buka Kasir Pagi",
      readTime: "2 menit baca",
      summary: "Langkah pertama yang wajib dilakukan kasir setiap pagi sebelum melayani transaksi pelanggan pertama.",
      steps: [
        {
          title: "Langkah 1: Masuk ke Terminal Kasir",
          description: "Buka menu 'Terminal Kasir' di sidebar atau klik ikon kasir. Jika shift baru belum dibuka, sistem otomatis memunculkan jendela 'Input Modal Awal Kasir'.",
          actionTab: "pos",
          actionLabel: "Buka Terminal Kasir"
        },
        {
          title: "Langkah 2: Hitung Uang Fisik Modal Kembalian",
          description: "Hitung uang pecahan receh / kembalian yang disiapkan di laci kasir (misal: Rp 100.000 atau Rp 200.000).",
          tip: "Pastikan uang kembalian pecahan Rp 2.000, Rp 5.000, dan Rp 10.000 mencukupi."
        },
        {
          title: "Langkah 3: Simpan Modal Awal",
          description: "Ketik nominal modal awal ke dalam sistem dan klik 'Buka Kasir'. Anda sekarang siap melayani pelanggan dengan uang kembalian yang tercatat rapi.",
          warning: "Dilarang memulai transaksi tanpa menginput modal awal, karena akan menyebabkan selisih perhitungan di akhir shift!"
        }
      ]
    },
    {
      id: "cashier-transaksi-bayar",
      title: "Panduan Menerima Pesanan & Pembayaran Kasir",
      category: "cashier",
      badge: "Layanan Transaksi",
      readTime: "3 menit baca",
      summary: "Cara memilih menu, varian es/panas, catatan khusus barista, memilih metode bayar, dan mencetak struk belanja.",
      steps: [
        {
          title: "Langkah 1: Pilih Menu & Varian Pesanan",
          description: "Sentuh atau klik menu minuman/makanan yang dipesan pelanggan. Jika produk memiliki varian ukuran, level es, atau topping tambahan, pilih opsi yang diinginkan.",
          actionTab: "pos",
          actionLabel: "Buka Kasir POS"
        },
        {
          title: "Langkah 2: Tambahkan Catatan Pelanggan",
          description: "Ketik catatan khusus barista jika pelanggan meminta (misal: 'Less Sugar 50%', 'Extra Ice', atau 'Take-away'). Catatan ini langsung tampil di layar monitor barista.",
          tip: "Catatan yang jelas mencegah kesalahan pembuatan minuman oleh barista."
        },
        {
          title: "Langkah 3: Tanyakan Nomor HP Pelanggan untuk Poin Member",
          description: "Tanyakan apakah pelanggan sudah terdaftar member. Masukkan nomor HP/WhatsApp pelanggan agar transaksi otomatis mendapatkan stempel loyalitas.",
          tip: "Pelanggan dapat mengecek stempel digital mereka sendiri melalui link kartu member di ponsel mereka."
        },
        {
          title: "Langkah 4: Pilih Metode Pembayaran",
          description: "Pilih Tunai (ketik nominal uang pelanggan, sistem menghitung kembalian otomatis), atau QRIS (tampilkan QRIS ke pelanggan dan tunggu notifikasi berhasil), atau Transfer Bank.",
          tip: "Untuk pelanggan yang ingin bayar terpisah, gunakan fitur 'Split Bill' yang tersedia di keranjang kasir."
        },
        {
          title: "Langkah 5: Selesaikan Pembayaran & Cetak Struk",
          description: "Klik 'Bayar & Cetak Struk'. Tiket pesanan otomatis dikirim ke layar Antrian Barista (KDS) dan struk pelanggan langsung tercetak.",
          actionTab: "queue",
          actionLabel: "Lihat Layar Antrian Barista"
        }
      ]
    },
    {
      id: "cashier-tutup-kasir",
      title: "SOP Tutup Kasir: Hitung Uang Fisik Laci & Selesai Shift",
      category: "cashier",
      badge: "Tutup Kasir Malam",
      readTime: "2 menit baca",
      summary: "Panduan menghitung uang kas laci saat tutup toko malam dan mencocokkannya dengan kas sistem agar tidak selisih.",
      steps: [
        {
          title: "Langkah 1: Selesaikan Seluruh Pesanan Gantung",
          description: "Pastikan tidak ada pesanan kasir yang tertahan atau belum dibayar di keranjang kasir.",
          actionTab: "pos",
          actionLabel: "Periksa Kasir"
        },
        {
          title: "Langkah 2: Masuk ke Menu Kasir & Klik 'Tutup Kas'",
          description: "Buka menu 'Kas' dan pilih shift aktif Anda, lalu klik tombol 'Tutup Kas'.",
          actionTab: "cash-registers",
          actionLabel: "Buka Menu Kas"
        },
        {
          title: "Langkah 3: Hitung Uang Fisik Kertas & Koin",
          description: "Keluarkan seluruh uang dari laci kasir dan hitung per pecahan. Masukkan total uang fisik yang Anda hitung ke dalam formulir tutup kas.",
          warning: "Hitung dengan teliti dua kali untuk memastikan tidak ada lembaran uang yang menempel."
        },
        {
          title: "Langkah 4: Serah Terima Shift",
          description: "Klik 'Simpan & Tutup Shift'. Sistem akan mencetak lembar rekap shift dan menyimpan riwayat transaksi secara aman untuk diaudit oleh Manajer dan Owner.",
          tip: "Jika terdapat selisih uang fisik, tuliskan penjelasan singkat di kolom catatan kasir."
        }
      ]
    }
  ], [])

  // Filter master panduan berdasarkan hak akses (Role-Based Access Control)
  // Owner: akses semua panduan (Owner, Manajer, Kasir)
  // Manajer: HANYA akses panduan Manajer dan Kasir (Panduan Owner disembunyikan total)
  // Kasir: HANYA akses panduan Kasir (Panduan Owner & Manajer disembunyikan total)
  const accessibleGuides = useMemo(() => {
    return guides.filter(g => {
      if (userRole === 'owner') return true
      if (userRole === 'manager') return g.category === 'manager' || g.category === 'cashier'
      return g.category === 'cashier'
    })
  }, [guides, userRole])

  // Filter guides yang dapat diakses berdasarkan tab aktif dan input pencarian
  const filteredGuides = useMemo(() => {
    return accessibleGuides.filter(g => {
      // Pastikan kategori yang dipilih diizinkan untuk role saat ini
      const matchRole = userRole === 'owner' 
        ? g.category === selectedRole 
        : userRole === 'manager'
          ? (selectedRole === 'cashier' ? g.category === 'cashier' : g.category === 'manager')
          : g.category === 'cashier'

      const q = searchQuery.toLowerCase().trim()
      const matchSearch = !q ||
        g.title.toLowerCase().includes(q) ||
        g.summary.toLowerCase().includes(q) ||
        g.badge.toLowerCase().includes(q) ||
        g.steps.some(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
      return matchRole && matchSearch
    })
  }, [accessibleGuides, selectedRole, searchQuery, userRole])

  // Active guide being viewed (fallback otomatis ke panduan pertama yang berhak diakses)
  const activeGuide = useMemo(() => {
    return accessibleGuides.find(g => g.id === selectedGuideId) || filteredGuides[0] || accessibleGuides[0]
  }, [accessibleGuides, selectedGuideId, filteredGuides])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ================= HERO HEADER ================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-semibold text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              Pusat Panduan & Standar Operasional Prosedur (SOP) Singgah Coffee
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Buku Panduan & SOP Operasional
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Panduan interaktif langkah demi langkah yang disesuaikan khusus untuk <strong>Owner</strong>, <strong>Manajer</strong>, dan <strong>Kasir/Barista</strong> agar seluruh operasional kafe berjalan efisien, transparan, dan bebas kesalahan.
            </p>
          </div>

          {/* Role Status Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shrink-0 text-center sm:text-right min-w-[200px]">
            <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Login Sebagai:</span>
            <span className={`inline-block mt-1 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
              userRole === 'owner' ? 'bg-amber-400 text-amber-950' : userRole === 'manager' ? 'bg-blue-400 text-blue-950' : 'bg-emerald-400 text-emerald-950'
            }`}>
              {userRole === 'owner' ? '👑 Owner / Pemilik' : userRole === 'manager' ? '💼 Manajer Toko' : '☕ Kasir / Barista'}
            </span>
            <p className="text-[11px] text-slate-300 mt-2 font-medium">
              Outlet: Singgah Coffee & Eatery
            </p>
          </div>
        </div>

        {/* Role Switcher Tabs (Disesuaikan Ketat Sesuai Hak Akses Role) */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-sm border border-white/10">
            {/* Tab Owner: HANYA untuk Owner */}
            {userRole === 'owner' && (
              <button
                onClick={() => {
                  setSelectedRole('owner')
                  setSelectedGuideId("owner-bagi-hasil")
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedRole === 'owner' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                Panduan Owner ({guides.filter(g => g.category === 'owner').length})
              </button>
            )}

            {/* Tab Manajer: Tampil untuk Owner & Manajer (Kasir Dilarang) */}
            {(userRole === 'owner' || userRole === 'manager') && (
              <button
                onClick={() => {
                  setSelectedRole('manager')
                  setSelectedGuideId("manager-hpp-resep")
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedRole === 'manager' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Panduan Manajer ({guides.filter(g => g.category === 'manager').length})
              </button>
            )}

            {/* Tab Kasir: Tampil untuk Semua Role */}
            <button
              onClick={() => {
                setSelectedRole('cashier')
                setSelectedGuideId("cashier-buka-kasir")
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedRole === 'cashier' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              Panduan Kasir ({guides.filter(g => g.category === 'cashier').length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder={userRole === 'cashier' ? "Cari SOP kasir, buka kas, order..." : "Cari SOP (kasbon, bagi hasil, kas laci...)"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:bg-white/15 focus:border-amber-400"
            />
          </div>
        </div>
      </div>

      {/* ================= SOP CHECKLIST HARIAN (QUICK ACTION) ================= */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="pb-3 border-b bg-slate-50/60">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Checklist Kesiapan Operasional Harian Singgah Coffee
            </div>
            <span className="text-xs text-slate-500 font-normal">
              {Object.values(checklist).filter(Boolean).length} dari 6 checklist selesai
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Sesi Pagi */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md inline-block">
                Pagi / Buka Toko
              </span>
              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={!!checklist['ch-1']}
                  onChange={() => toggleCheck('ch-1')}
                  className="rounded text-primary mt-0.5"
                />
                <span className={checklist['ch-1'] ? 'line-through text-slate-400' : 'font-medium'}>
                  Input modal awal kasir laci (*Cash Float*) sebelum melayani pelanggan.
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={!!checklist['ch-2']}
                  onChange={() => toggleCheck('ch-2')}
                  className="rounded text-primary mt-0.5"
                />
                <span className={checklist['ch-2'] ? 'line-through text-slate-400' : 'font-medium'}>
                  Cek stok susu, es batu, cup take-away & tes koneksi printer struk.
                </span>
              </label>
            </div>

            {/* Sesi Siang */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block">
                Siang / Operasional
              </span>
              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={!!checklist['ch-3']}
                  onChange={() => toggleCheck('ch-3')}
                  className="rounded text-primary mt-0.5"
                />
                <span className={checklist['ch-3'] ? 'line-through text-slate-400' : 'font-medium'}>
                  Input nota belanja belanjaan dadakan (es batu, galon) ke modul Pengeluaran.
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={!!checklist['ch-4']}
                  onChange={() => toggleCheck('ch-4')}
                  className="rounded text-primary mt-0.5"
                />
                <span className={checklist['ch-4'] ? 'line-through text-slate-400' : 'font-medium'}>
                  Catat kasbon barista ke modul Bagi Hasil jika ada pinjaman kas toko.
                </span>
              </label>
            </div>

            {/* Sesi Malam */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md inline-block">
                Malam / Tutup Toko
              </span>
              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={!!checklist['ch-5']}
                  onChange={() => toggleCheck('ch-5')}
                  className="rounded text-primary mt-0.5"
                />
                <span className={checklist['ch-5'] ? 'line-through text-slate-400' : 'font-medium'}>
                  Tutup Kasir: hitung uang fisik laci kasir & cocokan dengan kas sistem.
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={!!checklist['ch-6']}
                  onChange={() => toggleCheck('ch-6')}
                  className="rounded text-primary mt-0.5"
                />
                <span className={checklist['ch-6'] ? 'line-through text-slate-400' : 'font-medium'}>
                  Owner: review rekap harian kas dan sinkronkan draft bagi hasil periode.
                </span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================= MAIN CONTENT: LIST SOP & DETAIL GUIDE ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Guide Navigation Cards */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Daftar Modul SOP ({filteredGuides.length})
            </h3>
            <span className="text-[11px] text-slate-400">Pilih untuk membaca</span>
          </div>

          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {filteredGuides.map((guide) => {
              const isActive = guide.id === activeGuide?.id
              return (
                <div
                  key={guide.id}
                  onClick={() => setSelectedGuideId(guide.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative ${
                    isActive
                      ? 'bg-indigo-50/80 border-indigo-300 shadow-md ring-1 ring-indigo-300'
                      : 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      guide.category === 'owner'
                        ? 'bg-amber-100 text-amber-800'
                        : guide.category === 'manager'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {guide.badge}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {guide.readTime}
                    </span>
                  </div>

                  <h4 className={`text-sm font-bold leading-snug ${isActive ? 'text-indigo-950' : 'text-slate-900'}`}>
                    {guide.title}
                  </h4>

                  <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                    {guide.summary}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {guide.steps.length} Langkah Mudah
                    </span>
                    <span className={`flex items-center gap-1 font-bold text-xs ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                      Baca SOP <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Detailed Step-by-Step SOP Card */}
        {activeGuide && (
          <div className="lg:col-span-8">
            <Card className="border-slate-200 shadow-md overflow-hidden bg-white">
              <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                    activeGuide.category === 'owner'
                      ? 'bg-amber-100 text-amber-900'
                      : activeGuide.category === 'manager'
                      ? 'bg-blue-100 text-blue-900'
                      : 'bg-emerald-100 text-emerald-900'
                  }`}>
                    {activeGuide.badge}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                    <Clock className="w-3.5 h-3.5" /> {activeGuide.readTime}
                  </div>
                </div>
                <CardTitle className="text-xl font-black text-slate-900 leading-tight">
                  {activeGuide.title}
                </CardTitle>
                <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  {activeGuide.summary}
                </p>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                <div className="space-y-6">
                  {activeGuide.steps.map((step, idx) => (
                    <div key={idx} className="relative pl-8 pb-6 border-l-2 border-indigo-100 last:border-l-0 last:pb-0">
                      {/* Step Number Dot */}
                      <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-md">
                        {idx + 1}
                      </div>

                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {step.title}
                          </h4>
                          {step.actionTab && setActiveTab && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActiveTab(step.actionTab!)}
                              className="text-xs h-7 gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shrink-0 font-bold"
                            >
                              {step.actionLabel || "Buka Modul"} <ArrowRight className="w-3 h-3" />
                            </Button>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {step.description}
                        </p>

                        {/* Pro Tip Box */}
                        {step.tip && (
                          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2 mt-2">
                            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-bold">Tips Operasional: </strong>
                              <span>{step.tip}</span>
                            </div>
                          </div>
                        )}

                        {/* Warning Box */}
                        {step.warning && (
                          <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/80 text-xs text-rose-900 flex items-start gap-2 mt-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-bold">Peringatan Penting: </strong>
                              <span>{step.warning}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Quick Help Card */}
                <div className="pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <HelpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">Perlu Bimbingan Lebih Lanjut?</h5>
                      <p className="text-[11px] text-slate-500">Seluruh modul dilengkapi konfirmasi otomatis dan proteksi zero-data-loss.</p>
                    </div>
                  </div>
                  {activeGuide.steps[0]?.actionTab && setActiveTab && (
                    <Button
                      size="sm"
                      onClick={() => setActiveTab(activeGuide.steps[0].actionTab!)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5 shrink-0"
                    >
                      Coba Langsung di Aplikasi <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
