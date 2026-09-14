import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { SalesChart } from "../components/dashboard/SalesChart"
import { TopSellingItems } from "../components/dashboard/TopSellingItems"
import { useEffect, useState } from "react"
import { InventoryService } from "../services/inventoryService"
import { AlertTriangle, Loader2, ShoppingCart, Download, FileText, FileSpreadsheet, Calendar } from "lucide-react"
import { getImageUrl, formatCurrency } from "../lib/utils"
import { useDashboard } from "../hooks/useDashboard"
import { useSettings } from "../hooks/useSettings"
import { Button } from "../components/ui/button"
import { Dialog } from "../components/ui/dialog"
import { useSelector } from "react-redux"
import { RootState } from "../store"
import type { Ingredient, ProductSalesVolume } from "../types"

// Vetted by AI - Manual Review Required by Senior Engineer/Manager

interface DashboardHomeProps {
    setActiveTab: (tab: string) => void
}

export default function DashboardHome({ setActiveTab }: DashboardHomeProps) {
    const { user } = useSelector((state: RootState) => state.auth)
    const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([])
    const [showLowStockDetails, setShowLowStockDetails] = useState(false)

    const { data: settings } = useSettings()
    const logoUrl = settings?.outlet_logo_url || ""
    const outletName = settings?.outlet_name || "Singgah Coffee"

    const [dateFilterStart, setDateFilterStart] = useState("")
    const [dateFilterEnd, setDateFilterEnd] = useState("")
    const [productFilter, setProductFilter] = useState("")

    // Ekspor Data State & Handlers
    const [showExportModal, setShowExportModal] = useState(false)
    const [exportStart, setExportStart] = useState(() => {
        const d = new Date()
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
    })
    const [exportEnd, setExportEnd] = useState(() => new Date().toISOString().split('T')[0])
    const [isExporting, setIsExporting] = useState(false)

    const handleExportPdf = async () => {
        try {
            setIsExporting(true)
            const token = localStorage.getItem('token')
            const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
            const params = new URLSearchParams({ start: exportStart, end: exportEnd })
            const res = await fetch(`${baseURL}/reports/profit-loss/export/pdf?${params}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
            if (!res.ok) throw new Error("Gagal mengunduh berkas PDF")
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Laporan_Laba_Rugi_${exportStart}_sd_${exportEnd}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (e: any) {
            alert("Gagal mengunduh PDF: " + (e?.message || e))
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportCsv = async () => {
        try {
            setIsExporting(true)
            const token = localStorage.getItem('token')
            const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
            const params = new URLSearchParams({ start: exportStart, end: exportEnd })
            const res = await fetch(`${baseURL}/reports/profit-loss/export/csv?${params}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
            if (!res.ok) throw new Error("Gagal mengunduh berkas CSV")
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Laporan_Keuangan_${exportStart}_sd_${exportEnd}.csv`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (e: any) {
            alert("Gagal mengunduh CSV: " + (e?.message || e))
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportProductSales = () => {
        try {
            setIsExporting(true)
            const items = summary.product_sales || []
            if (items.length === 0) {
                alert("Belum ada data transaksi menu pada periode ini untuk diekspor.")
                return
            }
            const rows: string[] = [
                ["No", "Nama Menu", "Kategori", "Jumlah Terjual (Cup)", "Harga Satuan (Rp)", "HPP Modal (Rp)", "Total Pendapatan (Rp)", "Total Modal (Rp)", "Laba Kotor (Rp)"].join(",")
            ]

            items.forEach((p: ProductSalesVolume, idx: number) => {
                const grossProfit = (p.revenue || 0) - (p.total_cogs || 0)
                const cleanName = `"${(p.name || '').replace(/"/g, '""')}"`
                const cleanCat = `"${(p.category || '').replace(/"/g, '""')}"`
                rows.push([
                    idx + 1,
                    cleanName,
                    cleanCat,
                    p.quantity || 0,
                    Math.round(p.avg_price || 0),
                    Math.round(p.avg_cost || 0),
                    Math.round(p.revenue || 0),
                    Math.round(p.total_cogs || 0),
                    Math.round(grossProfit)
                ].join(","))
            })

            const csvContent = "\uFEFF" + rows.join("\n")
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Detail_Penjualan_Menu_${exportStart}_sd_${exportEnd}.csv`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (e: any) {
            alert("Gagal mengekspor data menu: " + (e?.message || e))
        } finally {
            setIsExporting(false)
        }
    }

    const { data: _summary, isLoading: statsLoading, refetch } = useDashboard(dateFilterStart || undefined, dateFilterEnd || undefined)
    const summary: any = _summary ?? {
        total_sales: 0,
        active_orders: 0,
        low_stock_count: 0,
        transactions_today: 0,
        sales_trend: [] as { name: string; total: number }[],
        weekly_trend: [] as { name: string; total: number }[],
        monthly_trend: [] as { name: string; total: number }[],
        yearly_trend: [] as { name: string; total: number }[],
        category_breakdown: [] as { category: string; total: number }[],
        top_products: [] as { name: string; category: string; sales: number }[],
        product_sales: [] as ProductSalesVolume[],
        total_cups: 0
    }

    const filteredProducts = (summary.product_sales || []).filter((p: ProductSalesVolume) => {
        const matchProduct = !productFilter || p.name.toLowerCase().includes(productFilter.toLowerCase())
        return matchProduct
    })
    const filteredTotalCups = filteredProducts.reduce((sum: number, p: ProductSalesVolume) => sum + p.quantity, 0)

    useEffect(() => {
        const canViewStock = user?.role === 'owner' || user?.role === 'manager'
        if (canViewStock && summary.low_stock_count > 0) {
            InventoryService.getLowStockAlerts().then(res => {
                setLowStockItems(res.alerts || [])
            }).catch(() => {})
        }
    }, [summary.low_stock_count, user?.role])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {logoUrl && (
                        <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-sm shrink-0">
                            <img
                                src={getImageUrl(logoUrl)}
                                alt="Logo"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold text-gray-900">Ringkasan {outletName}</h1>
                        <p className="text-gray-500">Selamat datang kembali di panel administrasi Anda.</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {user?.role === 'owner' && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 hover:bg-slate-50"
                                onClick={() => setShowExportModal(true)}
                            >
                                <Download className="w-4 h-4" />
                                Ekspor Data
                            </Button>
                            <Button size="sm" onClick={() => setActiveTab('pos')}>Pesanan Baru</Button>
                        </>
                    )}
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Penjualan Hari Ini</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : formatCurrency(summary.total_sales)}
                        </div>
                        <p className="text-xs text-green-600 mt-1">Pendapatan Kotor</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Pesanan Aktif</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : summary.active_orders}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Pembayaran tertunda</p>
                    </CardContent>
                </Card>
                <Card
                    className={summary.low_stock_count > 0 ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
                    onClick={() => lowStockItems.length > 0 && setShowLowStockDetails(!showLowStockDetails)}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Stok Menipis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : summary.low_stock_count}
                        </div>
                        <p className={`text-xs mt-1 ${summary.low_stock_count > 0 ? "text-destructive font-bold" : "text-gray-500"}`}>
                            {summary.low_stock_count > 0 ? "Perlu perhatian — klik untuk detail" : "Semua stok aman"}
                        </p>
                        {showLowStockDetails && lowStockItems.length > 0 && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                                {lowStockItems.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 text-sm">
                                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                                        <span className="font-medium flex-1 truncate">{item.name}</span>
                                        <span className="text-muted-foreground">
                                            {item.current_stock} / {item.min_stock} {item.unit}
                                        </span>
                                    </div>
                                ))}
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="w-full text-xs"
                                    onClick={(e) => { e.stopPropagation(); setActiveTab('products') }}
                                >
                                    Kelola Stok →
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Transaksi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : summary.transactions_today}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Pesanan berhasil hari ini</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            {/* Vetted by AI - Manual Review Required by Senior Engineer/Manager */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <SalesChart
                    data={summary.sales_trend || []}
                    weeklyData={summary.weekly_trend || []}
                    monthlyData={summary.monthly_trend || []}
                    yearlyData={summary.yearly_trend || []}
                />
                <TopSellingItems items={summary.top_products || []} />
            </div>

            {/* Product Sales Breakdown */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            Detail Penjualan per Menu
                            <span className="text-sm font-normal text-gray-500 ml-2">
                                Total: {summary.total_cups ?? filteredTotalCups} cup
                            </span>
                        </CardTitle>
                        <div className="flex gap-2 items-center">
                            <input
                                type="date"
                                value={dateFilterStart}
                                onChange={e => setDateFilterStart(e.target.value)}
                                className="text-xs border rounded px-2 py-1"
                                title="Tanggal mulai"
                            />
                            <span className="text-xs text-gray-400">s/d</span>
                            <input
                                type="date"
                                value={dateFilterEnd}
                                onChange={e => setDateFilterEnd(e.target.value)}
                                className="text-xs border rounded px-2 py-1"
                                title="Tanggal selesai"
                            />
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
                                ↻ Refresh
                            </Button>
                            <input
                                type="text"
                                placeholder="Cari menu..."
                                value={productFilter}
                                onChange={e => setProductFilter(e.target.value)}
                                className="text-xs border rounded px-2 py-1 w-40"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredProducts.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Tidak ada data penjualan</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 px-3 font-medium">No</th>
                                        <th className="text-left py-2 px-3 font-medium">Menu</th>
                                        <th className="text-left py-2 px-3 font-medium">Kategori</th>
                                        <th className="text-right py-2 px-3 font-medium">Cup</th>
                                        <th className="text-right py-2 px-3 font-medium">Harga</th>
                                        <th className="text-right py-2 px-3 font-medium">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((p: ProductSalesVolume, i: number) => (
                                        <tr key={p.product_id} className="border-b hover:bg-gray-50">
                                            <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                                            <td className="py-2 px-3 font-medium">{p.name}</td>
                                            <td className="py-2 px-3 text-gray-500">{p.category}</td>
                                            <td className="py-2 px-3 text-right font-bold">{p.quantity}</td>
                                            <td className="py-2 px-3 text-right">{formatCurrency(p.avg_price)}</td>
                                            <td className="py-2 px-3 text-right">{formatCurrency(p.revenue)}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t-2 font-bold bg-gray-100">
                                        <td colSpan={3} className="py-3 px-3">Total</td>
                                        <td className="py-3 px-3 text-right">{filteredTotalCups}</td>
                                        <td className="py-3 px-3"></td>
                                        <td className="py-3 px-3 text-right">
                                            {formatCurrency(filteredProducts.reduce((s: number, p: ProductSalesVolume) => s + p.revenue, 0))}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Export Data Modal */}
            <Dialog
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                title="Ekspor Data Penjualan & Keuangan"
                description="Pilih rentang tanggal dan format dokumen yang ingin Anda unduh."
            >
                <div className="space-y-4 pt-2">
                    {/* Date Range Picker */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            Periode Laporan
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-[10px] text-slate-400 font-medium">Dari Tanggal</span>
                                <input
                                    type="date"
                                    value={exportStart}
                                    onChange={(e) => setExportStart(e.target.value)}
                                    className="w-full text-xs font-semibold p-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 font-medium">Sampai Tanggal</span>
                                <input
                                    type="date"
                                    value={exportEnd}
                                    onChange={(e) => setExportEnd(e.target.value)}
                                    className="w-full text-xs font-semibold p-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Export Action Cards */}
                    <div className="space-y-2.5">
                        <button
                            type="button"
                            disabled={isExporting}
                            onClick={handleExportPdf}
                            className="w-full p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 flex items-center justify-between text-left transition-colors group disabled:opacity-50"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-rose-950">Laporan Laba Rugi (PDF)</p>
                                    <p className="text-xs text-rose-700/80">Dokumen PDF resmi berformat surat lengkap dengan rincian pendapatan & laba bersih</p>
                                </div>
                            </div>
                            <Download className="w-4 h-4 text-rose-500 shrink-0 ml-2" />
                        </button>

                        <button
                            type="button"
                            disabled={isExporting}
                            onClick={handleExportCsv}
                            className="w-full p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 flex items-center justify-between text-left transition-colors group disabled:opacity-50"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-emerald-950">Laporan Keuangan (CSV / Excel)</p>
                                    <p className="text-xs text-emerald-700/80">Data pembukuan ringkas format spreadsheet untuk diolah di Microsoft Excel atau Google Sheets</p>
                                </div>
                            </div>
                            <Download className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />
                        </button>

                        <button
                            type="button"
                            disabled={isExporting}
                            onClick={handleExportProductSales}
                            className="w-full p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 flex items-center justify-between text-left transition-colors group disabled:opacity-50"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <ShoppingCart className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-amber-950">Detail Penjualan Menu (CSV / Excel)</p>
                                    <p className="text-xs text-amber-800/80">Daftar lengkap cup terjual per varian kopi, omzet per produk, HPP modal, dan margin laba</p>
                                </div>
                            </div>
                            <Download className="w-4 h-4 text-amber-600 shrink-0 ml-2" />
                        </button>
                    </div>

                    {isExporting && (
                        <div className="flex items-center justify-center gap-2 p-2 text-xs font-semibold text-primary">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sedang mengunduh berkas laporan...</span>
                        </div>
                    )}
                </div>
            </Dialog>
        </div>
    )
}
