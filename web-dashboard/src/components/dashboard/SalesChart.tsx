import { useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { formatNumber } from "../../lib/utils"
import { Download, FileSpreadsheet, FileCode, Database, Loader2, Table } from 'lucide-react'
import * as XLSX from 'xlsx'
import api from '../../lib/api'
import { useToast } from '../../hooks/use-toast'
import type { Order, Expense } from '../../types'

// Vetted by AI - Manual Review Required by Senior Engineer/Manager

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface SalesChartProps {
    data?: { name: string; total: number }[]
    weeklyData?: { name: string; total: number }[]
    monthlyData?: { name: string; total: number }[]
    yearlyData?: { name: string; total: number }[]
}

const PERIOD_CONFIG: Record<Period, { title: string; desc: string }> = {
    daily: {
        title: "Tren Penjualan Hari Ini (Per Jam)",
        desc: "Grafik performa penjualan real-time per jam hari ini"
    },
    weekly: {
        title: "Tren Penjualan Mingguan (7 Hari)",
        desc: "Grafik akumulasi penjualan harian dalam 7 hari terakhir"
    },
    monthly: {
        title: "Tren Penjualan Bulanan (30 Hari)",
        desc: "Grafik akumulasi penjualan harian dalam 30 hari terakhir"
    },
    yearly: {
        title: "Tren Penjualan Tahunan (12 Bulan)",
        desc: "Grafik akumulasi penjualan bulanan dalam 1 tahun terakhir"
    }
}

export function SalesChart({ data = [], weeklyData = [], monthlyData = [], yearlyData = [] }: SalesChartProps) {
    const [period, setPeriod] = useState<Period>('daily')
    const [showExportMenu, setShowExportMenu] = useState(false)
    const [isExportingExcel, setIsExportingExcel] = useState(false)
    const { toast } = useToast()

    const getActiveData = () => {
        switch (period) {
            case 'daily':
                return data
            case 'weekly':
                return weeklyData
            case 'monthly':
                return monthlyData
            case 'yearly':
                return yearlyData
            default:
                return data
        }
    }

    const activeData = getActiveData()
    const currentTotal = activeData.reduce((sum, item) => sum + (item.total || 0), 0)

    // Helper untuk membuat dataset time series siap data sains (Pandas / Scikit-Learn)
    const generateTimeSeriesDataset = () => {
        let runningTotal = 0
        return activeData.map((item, idx) => {
            const rev = item.total || 0
            runningTotal += rev
            
            // Hitung growth rate vs periode sebelumnya
            const prevRev = idx > 0 ? (activeData[idx - 1].total || 0) : 0
            const growthRate = prevRev > 0 ? Number(((rev - prevRev) / prevRev * 100).toFixed(2)) : 0

            // Hitung Moving Average 3 periode (SMA-3)
            let maSum = rev
            let maCount = 1
            if (idx >= 1) { maSum += (activeData[idx - 1].total || 0); maCount++ }
            if (idx >= 2) { maSum += (activeData[idx - 2].total || 0); maCount++ }
            const ma3 = Number((maSum / maCount).toFixed(2))

            return {
                period_index: idx,
                period_type: period,
                period_label: item.name,
                revenue: rev,
                cumulative_revenue: runningTotal,
                growth_rate_pct: growthRate,
                moving_average_3p: ma3
            }
        })
    }

    // Ekspor Dataset Multi-Sheet Excel (.xlsx) Lengkap & Siap Olah Data Sains
    const exportMultiSheetExcel = async () => {
        setIsExportingExcel(true)
        setShowExportMenu(false)
        try {
            const now = new Date()
            const end = new Date(now)
            const start = new Date(now)
            
            if (period === 'daily') {
                // Hari ini saja
            } else if (period === 'weekly') {
                start.setDate(end.getDate() - 6)
            } else if (period === 'monthly') {
                start.setDate(end.getDate() - 29)
            } else if (period === 'yearly') {
                start.setFullYear(end.getFullYear() - 1)
            }
            
            const startStr = start.toISOString().split('T')[0]
            const endStr = end.toISOString().split('T')[0]

            // Ambil data transaksi pesanan dan pengeluaran secara paralel
            const [ordersRes, expensesRes] = await Promise.all([
                api.get<Order[]>('/orders', { params: { limit: 10000, start: startStr, end: endStr } }).catch(() => ({ data: [] as Order[] })),
                api.get<Expense[]>('/expenses', { params: { start: startStr, end: endStr } }).catch(() => ({ data: [] as Expense[] }))
            ])

            const orders = Array.isArray(ordersRes.data) ? ordersRes.data : []
            const expenses = Array.isArray(expensesRes.data) ? expensesRes.data : []
            const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

            // --- SHEET 1: REKAP HARIAN (TIME SERIES AGGREGATION) ---
            const timeSeriesDataset = generateTimeSeriesDataset()
            const dailyMap: Record<string, {
                revenue: number
                orderCount: number
                cashAmount: number
                qrisAmount: number
                expenseAmount: number
            }> = {}

            orders.forEach(ord => {
                const rawDate = ord.created_at || ord.order_time || ''
                const dKey = rawDate ? rawDate.split('T')[0] : startStr
                if (!dailyMap[dKey]) {
                    dailyMap[dKey] = { revenue: 0, orderCount: 0, cashAmount: 0, qrisAmount: 0, expenseAmount: 0 }
                }
                const amt = ord.total_amount || 0
                dailyMap[dKey].revenue += amt
                dailyMap[dKey].orderCount += 1
                if ((ord.payment_method || '').toLowerCase() === 'cash') {
                    dailyMap[dKey].cashAmount += amt
                } else {
                    dailyMap[dKey].qrisAmount += amt
                }
            })

            expenses.forEach(exp => {
                const rawDate = exp.date ? (typeof exp.date === 'string' ? exp.date.split('T')[0] : '') : startStr
                if (!dailyMap[rawDate]) {
                    dailyMap[rawDate] = { revenue: 0, orderCount: 0, cashAmount: 0, qrisAmount: 0, expenseAmount: 0 }
                }
                dailyMap[rawDate].expenseAmount += (exp.amount || 0)
            })

            const sortedDates = Object.keys(dailyMap).sort()
            let runningRev = 0
            const rekapHarianRows = sortedDates.map((dateKey, idx) => {
                const d = dailyMap[dateKey]
                runningRev += d.revenue
                const prevRev = idx > 0 ? dailyMap[sortedDates[idx - 1]].revenue : 0
                const growthRate = prevRev > 0 ? Number(((d.revenue - prevRev) / prevRev * 100).toFixed(2)) : 0
                
                let smaSum = d.revenue
                let smaCount = 1
                if (idx >= 1) { smaSum += dailyMap[sortedDates[idx - 1]].revenue; smaCount++ }
                if (idx >= 2) { smaSum += dailyMap[sortedDates[idx - 2]].revenue; smaCount++ }
                const sma3 = Number((smaSum / smaCount).toFixed(0))

                const dt = new Date(dateKey)
                const dayName = isNaN(dt.getTime()) ? '-' : dayNames[dt.getDay()]
                const aov = d.orderCount > 0 ? Math.round(d.revenue / d.orderCount) : 0
                const netProfit = d.revenue - d.expenseAmount

                return {
                    Tanggal: dateKey,
                    Hari: dayName,
                    Total_Omzet_Rp: d.revenue,
                    Jumlah_Transaksi: d.orderCount,
                    Rata_Rata_Keranjang_AOV_Rp: aov,
                    Penjualan_Tunai_Cash_Rp: d.cashAmount,
                    Penjualan_NonTunai_QRIS_Rp: d.qrisAmount,
                    Total_Pengeluaran_Beban_Rp: d.expenseAmount,
                    Laba_Bersih_Harian_Rp: netProfit,
                    Pertumbuhan_Omzet_Pct: growthRate,
                    Moving_Average_3D_Rp: sma3,
                    Akumulasi_Omzet_Berjalan_Rp: runningRev
                }
            })

            const finalRekapRows = rekapHarianRows.length > 0 ? rekapHarianRows : timeSeriesDataset.map(r => ({
                Periode_Index: r.period_index + 1,
                Label_Waktu: r.period_label,
                Total_Omzet_Rp: r.revenue,
                Akumulasi_Omzet_Rp: r.cumulative_revenue,
                Pertumbuhan_Pct: r.growth_rate_pct,
                Moving_Average_3P_Rp: r.moving_average_3p
            }))

            // --- SHEET 2: DETAIL TRANSAKSI (PER STRUK) ---
            const detailTransaksiRows = orders.map(ord => {
                const dateObj = ord.created_at ? new Date(ord.created_at) : (ord.order_time ? new Date(ord.order_time) : null)
                const dateStrVal = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : '-'
                const timeStrVal = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toTimeString().slice(0, 8) : '-'
                const dayVal = dateObj && !isNaN(dateObj.getTime()) ? dayNames[dateObj.getDay()] : '-'

                const items = ord.items || []
                const totalQty = items.reduce((sum, it) => sum + (it.quantity || 0), 0)
                const itemSummary = items.map(it => `${it.quantity}x ${it.product?.name || 'Item'}`).join('; ')

                return {
                    ID_Transaksi: ord.id,
                    Nomor_Struk: ord.order_number,
                    Tanggal: dateStrVal,
                    Waktu_Jam: timeStrVal,
                    Hari: dayVal,
                    Total_Nominal_Rp: ord.total_amount,
                    Metode_Pembayaran: ord.payment_method || 'Cash',
                    Status_Bayar: ord.payment_status || 'Paid',
                    Status_Pesanan: ord.status || 'Completed',
                    Kasir: ord.cashier_name || 'Kasir',
                    Pelanggan: ord.customer_name || 'Pelanggan Umum',
                    Total_Qty_Item: totalQty,
                    Rincian_Menu_Dipesan: itemSummary
                }
            })

            // --- SHEET 3: DETAIL ITEM TERJUAL (PRODUCT LINE ITEMS) ---
            const itemTerjualRows: any[] = []
            orders.forEach(ord => {
                const dateObj = ord.created_at ? new Date(ord.created_at) : (ord.order_time ? new Date(ord.order_time) : null)
                const dateStrVal = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : '-'
                const timeStrVal = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toTimeString().slice(0, 8) : '-'
                const items = ord.items || []

                items.forEach(it => {
                    const qty = it.quantity || 1
                    const unitPrice = it.price || 0
                    const subtotal = qty * unitPrice
                    itemTerjualRows.push({
                        ID_Transaksi: ord.id,
                        Nomor_Struk: ord.order_number,
                        Tanggal: dateStrVal,
                        Waktu_Jam: timeStrVal,
                        Kategori_Produk: it.product?.category || 'Menu Kafe',
                        Nama_Produk: it.product?.name || 'Item',
                        Kuantiti: qty,
                        Harga_Satuan_Rp: unitPrice,
                        Subtotal_Penjualan_Rp: subtotal,
                        Metode_Bayar: ord.payment_method || 'Cash'
                    })
                })
            })

            // --- SHEET 4: PENGELUARAN HARIAN (EXPENSES) ---
            const pengeluaranRows = expenses.map(exp => {
                const expDate = exp.date ? (typeof exp.date === 'string' ? exp.date : '') : ''
                const datePart = expDate ? expDate.split('T')[0] : '-'
                const timePart = expDate && expDate.includes('T') ? expDate.split('T')[1].slice(0, 5) : '-'
                return {
                    ID_Pengeluaran: exp.id,
                    Tanggal: datePart,
                    Waktu_Jam: timePart,
                    Judul_Pengeluaran: exp.title,
                    Kategori: exp.category,
                    Tipe_Biaya: exp.cost_type === 'fixed' ? 'Biaya Tetap' : 'Biaya Variabel',
                    Nominal_Rp: exp.amount,
                    Metode_Bayar: exp.payment_method || 'Cash',
                    Catatan_Keterangan: exp.description || exp.notes || '-'
                }
            })

            // --- SHEET 5: KAMUS DATA & METADATA ---
            const kamusDataRows = [
                { Sheet: 'Rekap_Harian', Kolom: 'Tanggal', Tipe: 'Date (YYYY-MM-DD)', Deskripsi: 'Tanggal kalender agregasi operasional harian' },
                { Sheet: 'Rekap_Harian', Kolom: 'Hari', Tipe: 'String', Deskripsi: 'Nama hari (Senin-Minggu) untuk analisis efek musiman akhir pekan' },
                { Sheet: 'Rekap_Harian', Kolom: 'Total_Omzet_Rp', Tipe: 'Numeric', Deskripsi: 'Total penerimaan kotor penjualan pada hari tersebut' },
                { Sheet: 'Rekap_Harian', Kolom: 'Jumlah_Transaksi', Tipe: 'Numeric', Deskripsi: 'Frekuensi struk transaksi belanja yang berhasil' },
                { Sheet: 'Rekap_Harian', Kolom: 'Rata_Rata_Keranjang_AOV_Rp', Tipe: 'Numeric', Deskripsi: 'Average Order Value (Total Omzet / Jumlah Transaksi)' },
                { Sheet: 'Rekap_Harian', Kolom: 'Penjualan_Tunai_Cash_Rp', Tipe: 'Numeric', Deskripsi: 'Penerimaan uang fisik tunai pada laci kasir' },
                { Sheet: 'Rekap_Harian', Kolom: 'Penjualan_NonTunai_QRIS_Rp', Tipe: 'Numeric', Deskripsi: 'Penerimaan non-tunai via QRIS / transfer' },
                { Sheet: 'Rekap_Harian', Kolom: 'Total_Pengeluaran_Beban_Rp', Tipe: 'Numeric', Deskripsi: 'Akumulasi beban kas keluar pada tanggal terkait' },
                { Sheet: 'Rekap_Harian', Kolom: 'Laba_Bersih_Harian_Rp', Tipe: 'Numeric', Deskripsi: 'Estimasi laba operasional harian (Omzet - Pengeluaran)' },
                { Sheet: 'Rekap_Harian', Kolom: 'Pertumbuhan_Omzet_Pct', Tipe: 'Numeric (%)', Deskripsi: 'Persentase perubahan omzet dibanding hari sebelumnya' },
                { Sheet: 'Rekap_Harian', Kolom: 'Moving_Average_3D_Rp', Tipe: 'Numeric', Deskripsi: 'Simple Moving Average 3 Hari untuk perataan tren (Forecasting)' },
                { Sheet: 'Detail_Transaksi', Kolom: 'Nomor_Struk', Tipe: 'String', Deskripsi: 'Nomor nota unik per transaksi kasir' },
                { Sheet: 'Detail_Transaksi', Kolom: 'Waktu_Jam', Tipe: 'Time (HH:mm:ss)', Deskripsi: 'Jam transaksi untuk analisis jam sibuk (Peak Hours)' },
                { Sheet: 'Detail_Item_Terjual', Kolom: 'Nama_Produk', Tipe: 'String', Deskripsi: 'Nama menu/produk untuk analisis BCG Matrix & Association Rule' },
                { Sheet: 'Detail_Item_Terjual', Kolom: 'Kuantiti', Tipe: 'Numeric', Deskripsi: 'Volume penjualan item' },
                { Sheet: 'Pengeluaran_Harian', Kolom: 'Kategori', Tipe: 'Categorical', Deskripsi: '6 Kategori baku: Operasional, Bahan Baku (HPP), Gaji & Upah, dll' },
                { Sheet: 'Pengeluaran_Harian', Kolom: 'Tipe_Biaya', Tipe: 'Categorical', Deskripsi: 'Biaya Tetap (Fixed) atau Biaya Variabel (BEP Model)' }
            ]

            // Inisialisasi Workbook Excel
            const wb = XLSX.utils.book_new()

            // 1. Tambah Sheet Rekap Harian
            const ws1 = XLSX.utils.json_to_sheet(finalRekapRows)
            ws1['!cols'] = [
                { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 22 },
                { wch: 20 }, { wch: 22 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 24 }
            ]
            XLSX.utils.book_append_sheet(wb, ws1, 'Rekap_Harian')

            // 2. Tambah Sheet Detail Transaksi
            const ws2 = XLSX.utils.json_to_sheet(detailTransaksiRows.length > 0 ? detailTransaksiRows : [{ Keterangan: 'Belum ada data transaksi di periode ini' }])
            ws2['!cols'] = [
                { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 10 },
                { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 40 }
            ]
            XLSX.utils.book_append_sheet(wb, ws2, 'Detail_Transaksi')

            // 3. Tambah Sheet Detail Item Terjual
            const ws3 = XLSX.utils.json_to_sheet(itemTerjualRows.length > 0 ? itemTerjualRows : [{ Keterangan: 'Belum ada data item terjual di periode ini' }])
            ws3['!cols'] = [
                { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 18 },
                { wch: 26 }, { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 14 }
            ]
            XLSX.utils.book_append_sheet(wb, ws3, 'Detail_Item_Terjual')

            // 4. Tambah Sheet Pengeluaran Harian
            const ws4 = XLSX.utils.json_to_sheet(pengeluaranRows.length > 0 ? pengeluaranRows : [{ Keterangan: 'Belum ada data pengeluaran di periode ini' }])
            ws4['!cols'] = [
                { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 22 },
                { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 32 }
            ]
            XLSX.utils.book_append_sheet(wb, ws4, 'Pengeluaran_Harian')

            // 5. Tambah Sheet Kamus Data
            const ws5 = XLSX.utils.json_to_sheet(kamusDataRows)
            ws5['!cols'] = [{ wch: 20 }, { wch: 26 }, { wch: 20 }, { wch: 55 }]
            XLSX.utils.book_append_sheet(wb, ws5, 'Kamus_Data')

            // Unduh file Excel
            const fileDate = new Date().toISOString().slice(0, 10)
            XLSX.writeFile(wb, `Singgah_POS_Dataset_${period}_${fileDate}.xlsx`)

            toast({
                title: "Dataset Excel Berhasil Diekspor",
                description: `Workbook 5-sheet (${finalRekapRows.length} baris rekap, ${detailTransaksiRows.length} transaksi) berhasil diunduh.`,
                variant: "success"
            })
        } catch (error: any) {
            console.error("Gagal mengekspor dataset Excel:", error)
            toast({
                title: "Ekspor Gagal",
                description: error?.message || "Terjadi kesalahan saat mengekspor dataset.",
                variant: "error"
            })
        } finally {
            setIsExportingExcel(false)
        }
    }

    // Ekspor ke CSV murni tanpa format simbol (Data Science UTF-8 RFC 4180)
    const exportDatasetCSV = () => {
        const dataset = generateTimeSeriesDataset()
        if (dataset.length === 0) return

        const headers = ["period_index", "period_type", "period_label", "revenue", "cumulative_revenue", "growth_rate_pct", "moving_average_3p"]
        const rows = dataset.map(row => [
            row.period_index,
            `"${row.period_type}"`,
            `"${row.period_label.replace(/"/g, '""')}"`,
            row.revenue,
            row.cumulative_revenue,
            row.growth_rate_pct,
            row.moving_average_3p
        ])

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        const dateStr = new Date().toISOString().slice(0, 10)
        link.setAttribute("href", url)
        link.setAttribute("download", `singgah_pos_${period}_sales_dataset_${dateStr}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setShowExportMenu(false)
    }

    // Ekspor ke JSON murni untuk Python pandas.read_json atau machine learning pipeline
    const exportDatasetJSON = () => {
        const dataset = generateTimeSeriesDataset()
        if (dataset.length === 0) return

        const jsonContent = JSON.stringify(dataset, null, 2)
        const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        const dateStr = new Date().toISOString().slice(0, 10)
        link.setAttribute("href", url)
        link.setAttribute("download", `singgah_pos_${period}_sales_dataset_${dateStr}.json`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setShowExportMenu(false)
    }

    const formatYAxis = (val: number) => {
        if (val >= 1_000_000) {
            return `Rp${(val / 1_000_000).toFixed(1)}M`
        }
        if (val >= 1_000) {
            return `Rp${Math.round(val / 1_000)}k`
        }
        return `Rp${val}`
    }

    return (
        <Card className="col-span-1 md:col-span-3">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
                <div>
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-base sm:text-lg">{PERIOD_CONFIG[period].title}</CardTitle>
                        {currentTotal > 0 && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                                Total: Rp {formatNumber(currentTotal)}
                            </span>
                        )}
                    </div>
                    <CardDescription className="text-xs sm:text-sm mt-0.5">
                        {PERIOD_CONFIG[period].desc}
                    </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {/* Period Selector Tabs */}
                    <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0" role="tablist" aria-label="Pilih Periode Grafik">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={period === 'daily'}
                            onClick={() => setPeriod('daily')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                period === 'daily'
                                    ? 'bg-white text-primary shadow-sm border border-slate-200/60'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Harian
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={period === 'weekly'}
                            onClick={() => setPeriod('weekly')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                period === 'weekly'
                                    ? 'bg-white text-primary shadow-sm border border-slate-200/60'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Mingguan
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={period === 'monthly'}
                            onClick={() => setPeriod('monthly')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                period === 'monthly'
                                    ? 'bg-white text-primary shadow-sm border border-slate-200/60'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Bulanan
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={period === 'yearly'}
                            onClick={() => setPeriod('yearly')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                period === 'yearly'
                                    ? 'bg-white text-primary shadow-sm border border-slate-200/60'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Tahunan
                        </button>
                    </div>

                    {/* Data Science Export Button */}
                    <div className="relative">
                        <button
                            type="button"
                            disabled={isExportingExcel}
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-all border border-slate-700 disabled:opacity-60"
                            title="Unduh dataset terstruktur untuk pemodelan data science (Excel Multi-Sheet / Python / Google Colab)"
                        >
                            {isExportingExcel ? (
                                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                            ) : (
                                <Database className="w-3.5 h-3.5 text-amber-400" />
                            )}
                            {isExportingExcel ? "Menyiapkan..." : "Ekspor Dataset"}
                            <Download className="w-3 h-3 text-slate-300 ml-0.5" />
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-1.5 animate-in fade-in slide-in-from-top-1">
                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center justify-between">
                                    <span>Dataset {period.toUpperCase()}</span>
                                    <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1 rounded">Clean & Tidy</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={exportMultiSheetExcel}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-slate-800 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg text-left transition-colors"
                                >
                                    <Table className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <div>
                                        <div className="font-bold flex items-center gap-1">
                                            Excel Multi-Sheet (*.xlsx)
                                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-normal">5 Sheet</span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-normal">Rekap harian, transaksi, item, pengeluaran & kamus data</div>
                                    </div>
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                    type="button"
                                    onClick={exportDatasetCSV}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg text-left transition-colors"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <div>
                                        <div>Format CSV (*.csv)</div>
                                        <div className="text-[10px] text-slate-400 font-normal">Time-series murni untuk Pandas & R</div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={exportDatasetJSON}
                                    className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg text-left transition-colors mt-0.5"
                                >
                                    <FileCode className="w-4 h-4 text-blue-600 shrink-0" />
                                    <div>
                                        <div>Format JSON (*.json)</div>
                                        <div className="text-[10px] text-slate-400 font-normal">Untuk Python dict & API pipeline</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pl-2 pt-2">
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={activeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4B3621" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#4B3621" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={formatYAxis}
                            />
                            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-200" />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [`Rp ${formatNumber(value)}`, 'Total Penjualan']}
                            />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#4B3621"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#colorTotal)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
