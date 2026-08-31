import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Dialog } from "../components/ui/dialog"
import { Search, Calendar, Filter, Printer, Eye, Loader2, Trash2, CheckCircle2, DollarSign, Wallet, Clock, CreditCard, Banknote } from "lucide-react"
import { useOrders, useVoidOrder, useCompleteOrder } from "../hooks/useOrders"
import { useToast } from "../hooks/use-toast"
import { useSelector } from "react-redux"
import { RootState } from "../store"
import { formatCurrency } from "../lib/utils"
import { useSettings } from "../hooks/useSettings"
import api from "../lib/api"

export default function Sales() {
    const { user } = useSelector((state: RootState) => state.auth)
    const { data: settings } = useSettings()
    const outletName = settings?.outlet_name || "Singgah Coffee"
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedTx, setSelectedTx] = useState<any | null>(null)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")
    const [statusFilter, setStatusFilter] = useState("")
    const [paymentMethodFilter, setPaymentMethodFilter] = useState("")
    const { toast } = useToast()

    const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager'

    const { data: orders = [], isLoading: loading, refetch } = useOrders(50, 0, startDate, endDate, statusFilter)
    const voidOrder = useVoidOrder()
    const completeOrder = useCompleteOrder()

    const [profitLoss, setProfitLoss] = useState<{ gross_profit: number; net_profit: number } | null>(null)
    const [plLoading, setPlLoading] = useState(false)

    useEffect(() => {
        if (!isOwnerOrManager) return
        const fetchPL = async () => {
            setPlLoading(true)
            try {
                const params = new URLSearchParams()
                if (startDate) params.set('start', startDate)
                if (endDate) params.set('end', endDate)
                const res = await api.get('/reports/profit-loss', { params })
                setProfitLoss({ gross_profit: res.data.gross_profit, net_profit: res.data.net_profit })
            } catch {
                setProfitLoss(null)
            } finally {
                setPlLoading(false)
            }
        }
        fetchPL()
    }, [startDate, endDate, isOwnerOrManager])

    const handleToday = () => {
        const today = new Date().toISOString().slice(0, 10)
        setStartDate(today)
        setEndDate(today)
        setStartTime("")
        setEndTime("")
    }

    const [productPerf, setProductPerf] = useState<any[]>([])
    const [ppLoading, setPpLoading] = useState(false)
    const [dailyTarget, setDailyTarget] = useState<any | null>(null)
    const [dtLoading, setDtLoading] = useState(false)

    useEffect(() => {
        if (!isOwnerOrManager) return
        const fetchPP = async () => {
            setPpLoading(true)
            try {
                const params = new URLSearchParams()
                if (startDate) params.set('start', startDate)
                if (endDate) params.set('end', endDate)
                const res = await api.get('/reports/product-performance', { params })
                setProductPerf(res.data.products || [])
            } catch {
                setProductPerf([])
            } finally {
                setPpLoading(false)
            }
        }
        fetchPP()
    }, [startDate, endDate, isOwnerOrManager])

    useEffect(() => {
        if (user?.role !== 'owner') return
        const fetchDT = async () => {
            setDtLoading(true)
            try {
                const params = new URLSearchParams()
                const date = endDate || startDate || new Date().toISOString().slice(0, 10)
                params.set('date', date)
                const res = await api.get('/reports/daily-target', { params })
                setDailyTarget(res.data.daily_target)
            } catch {
                setDailyTarget(null)
            } finally {
                setDtLoading(false)
            }
        }
        fetchDT()
    }, [startDate, endDate, user?.role])

    const handleComplete = async (id: number) => {
        try {
            await completeOrder.mutateAsync(id)
            toast({ title: "Berhasil", description: "Pembayaran berhasil dikonfirmasi Lunas!", variant: "success" })
            if (selectedTx && selectedTx.id === id) {
                setSelectedTx((prev: any) => prev ? { ...prev, status: 'Completed', payment_status: 'Paid' } : null)
            }
        } catch (error: any) {
            toast({ title: "Gagal", description: error.response?.data?.error || "Gagal konfirmasi pembayaran", variant: "error" })
        }
    }

    const handleVoid = async (id: number) => {
        if (!window.confirm("Are you sure you want to void this transaction? This cannot be undone.")) return
        try {
            await voidOrder.mutateAsync(id)
            toast({ title: "Success", description: "Transaction voided successfully", variant: "success" })
        } catch (error: any) {
            toast({ title: "Error", description: error.response?.data?.error || "Failed to void transaction", variant: "error" })
        }
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        return {
            date: date.toLocaleDateString('id-ID'),
            time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
    }

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (order.cashier_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        const matchesPayment = !paymentMethodFilter || order.payment_method === paymentMethodFilter

        let matchesTime = true
        if (startTime || endTime) {
            const ordDateObj = new Date(order.created_at || order.order_time)
            if (!isNaN(ordDateObj.getTime())) {
                const hours = ordDateObj.getHours().toString().padStart(2, '0')
                const minutes = ordDateObj.getMinutes().toString().padStart(2, '0')
                const ordTimeStr = `${hours}:${minutes}`
                if (startTime && ordTimeStr < startTime) matchesTime = false
                if (endTime && ordTimeStr > endTime) matchesTime = false
            }
        }

        return matchesSearch && matchesPayment && matchesTime
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold text-gray-900">Penjualan & Transaksi</h1>
                    <p className="text-gray-500">Pantau semua pembayaran yang berhasil, tertunda, dan filter per jam/waktu.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" onClick={() => refetch()}>
                        <Calendar className="w-4 h-4" /> Segarkan
                    </Button>
                    <Button variant="secondary" className="gap-2 text-primary border-primary" onClick={handleToday}>
                        <Filter className="w-4 h-4" /> Hari Ini
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="border-none shadow-sm">
                <CardContent className="pt-0 pb-4">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Tanggal Mulai</label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-36 sm:w-40"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Tanggal Selesai</label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-36 sm:w-40"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" /> Jam Mulai
                            </label>
                            <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-28"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" /> Jam Selesai
                            </label>
                            <Input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-28"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Status</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="flex h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                            >
                                <option value="">Semua Status</option>
                                <option value="Pending">Pending</option>
                                <option value="Completed">Completed</option>
                                <option value="Void">Void</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Metode Bayar</label>
                            <select
                                value={paymentMethodFilter}
                                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                                className="flex h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                            >
                                <option value="">Semua Metode</option>
                                <option value="Cash">Cash (Tunai)</option>
                                <option value="QRIS">QRIS / Bank</option>
                            </select>
                        </div>
                        {(startDate || endDate || startTime || endTime || statusFilter || paymentMethodFilter) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setStartDate("")
                                    setEndDate("")
                                    setStartTime("")
                                    setEndTime("")
                                    setStatusFilter("")
                                    setPaymentMethodFilter("")
                                }}
                                className="gap-1"
                            >
                                <Filter className="w-3.5 h-3.5" /> Hapus Filter
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Profit Cards - Owner/Manager Only */}
            {isOwnerOrManager && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Laba Kotor</CardTitle>
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            {plLoading ? (
                                <div className="flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
                            ) : (
                                <div className="text-2xl font-bold text-emerald-600">
                                    {formatCurrency(profitLoss?.gross_profit || 0)}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-gray-500">Laba Bersih</CardTitle>
                            <Wallet className="w-4 h-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            {plLoading ? (
                                <div className="flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
                            ) : (
                                <div className="text-2xl font-bold text-blue-600">
                                    {formatCurrency(profitLoss?.net_profit || 0)}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Per-Menu Performance - Owner/Manager Only */}
            {isOwnerOrManager && (
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle>Performa per Menu</CardTitle>
                        <CardDescription>Jumlah terjual, omzet, dan margin estimasi per produk.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {ppLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
                        ) : productPerf.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">Tidak ada data penjualan pada rentang ini.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-500">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 border-b">
                                        <tr>
                                            <th className="px-6 py-3">Produk</th>
                                            <th className="px-6 py-3">Kategori</th>
                                            <th className="px-6 py-3 text-right">Terjual</th>
                                            <th className="px-6 py-3 text-right">Omzet</th>
                                            <th className="px-6 py-3 text-right">Margin Est.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productPerf.map((p) => (
                                            <tr key={p.product_id} className="bg-white border-b hover:bg-gray-50/50">
                                                <td className="px-6 py-4 font-bold text-gray-900">{p.name}</td>
                                                <td className="px-6 py-4">{p.category || '-'}</td>
                                                <td className="px-6 py-4 text-right font-bold">{p.quantity}</td>
                                                <td className="px-6 py-4 text-right">{formatCurrency(p.revenue || 0)}</td>
                                                <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                                    {formatCurrency((p.revenue || 0) - (p.quantity * (p.avg_cost || 0)))}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Daily Target & Realization - Owner Only */}
            {user?.role === 'owner' && (
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Target Harian & Realisasi</CardTitle>
                                <CardDescription>Target per produk vs penjualan aktual ({dailyTarget?.date || '-'}).</CardDescription>
                            </div>
                            <Badge variant={dailyTarget && dailyTarget.total_target_cup > 0 && dailyTarget.total_realized_cup >= dailyTarget.total_target_cup ? 'success' : 'warning'}>
                                {dailyTarget ? `${dailyTarget.total_realized_cup} / ${dailyTarget.total_target_cup} cup` : '-'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {dtLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
                        ) : !dailyTarget || dailyTarget.per_product.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">Belum ada target produk untuk tanggal ini.</div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left text-gray-500">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 border-b">
                                            <tr>
                                                <th className="px-6 py-3">Produk</th>
                                                <th className="px-6 py-3 text-right">Target</th>
                                                <th className="px-6 py-3 text-right">Realisasi</th>
                                                <th className="px-6 py-3 text-right">Selisih</th>
                                                <th className="px-6 py-3 text-right">Capaian</th>
                                                <th className="px-6 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dailyTarget.per_product.map((p: any) => (
                                                <tr key={p.product_id} className="bg-white border-b hover:bg-gray-50/50">
                                                    <td className="px-6 py-4 font-bold text-gray-900">{p.product_name}</td>
                                                    <td className="px-6 py-4 text-right">{(p.daily_target || 0).toFixed(1)}</td>
                                                    <td className="px-6 py-4 text-right font-bold">{p.realized ?? 0}</td>
                                                    <td className="px-6 py-4 text-right">{((p.variance ?? 0) >= 0 ? '+' : '')}{(p.variance || 0).toFixed(1)}</td>
                                                    <td className="px-6 py-4 text-right">{(p.achievement_pct || 0).toFixed(0)}%</td>
                                                    <td className="px-6 py-4">
                                                        <Badge variant={p.status === 'Tercapai' ? 'success' : p.status === 'Di bawah target' ? 'warning' : 'default'}>
                                                            {p.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Kebutuhan Bahan (Sinkron Kebutuhan Stok)</h4>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left text-gray-500">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 border-b">
                                                <tr>
                                                    <th className="px-6 py-3">Bahan</th>
                                                    <th className="px-6 py-3">Kategori</th>
                                                    <th className="px-6 py-3 text-right">Total Butuh</th>
                                                    <th className="px-6 py-3 text-right">@ Pembelian</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dailyTarget.ingredients.map((ing: any) => (
                                                    <tr key={ing.ingredient_id} className="bg-white border-b hover:bg-gray-50/50">
                                                        <td className="px-6 py-4 font-bold text-gray-900">{ing.name}</td>
                                                        <td className="px-6 py-4">{ing.category}</td>
                                                        <td className="px-6 py-4 text-right">{(ing.total_needed || 0).toFixed(2)} {ing.unit}</td>
                                                        <td className="px-6 py-4 text-right">{ing.rounded_purchase_unit} {ing.purchase_unit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Riwayat Transaksi</CardTitle>
                            <CardDescription>Sinkronisasi pesanan waktu nyata.</CardDescription>
                        </div>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Cari no. pesanan..."
                                className="pl-9 h-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 border-b">
                                    <tr>
                                        <th className="px-6 py-3">No. Pesanan</th>
                                        <th className="px-6 py-3">Waktu</th>
                                        <th className="px-6 py-3">Kasir</th>
                                        <th className="px-6 py-3">Jumlah</th>
                                        <th className="px-6 py-3">Pembayaran</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((order) => {
                                        const dt = formatDate(order.created_at)
                                        return (
                                            <tr key={order.id} className="bg-white border-b hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-primary">{order.order_number}</td>
                                                <td className="px-6 py-4">
                                                    <div>{dt.time}</div>
                                                    <div className="text-[10px] text-gray-400">{dt.date}</div>
                                                </td>
                                                <td className="px-6 py-4">{order.cashier_name}</td>
                                                <td className="px-6 py-4 font-bold text-gray-900">
                                                    {formatCurrency(order.total_amount)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                        order.payment_method === 'QRIS'
                                                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                                            : order.payment_method === 'Cash'
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                    }`}>
                                                        {order.payment_method === 'QRIS' ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                                                        {order.payment_method}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={order.status === 'Completed' ? 'success' : 'warning'}>
                                                        {order.status === 'Completed' ? 'Selesai' : order.status === 'Void' ? 'Dibatalkan' : 'Pending'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end items-center gap-2">
                                                    {order.status === 'Pending' && (
                                                        <Button
                                                            size="sm"
                                                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 px-2.5 shadow-sm"
                                                            title="Konfirmasi Lunas / Selesaikan Pembayaran"
                                                            onClick={() => handleComplete(order.id)}
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            <span className="hidden sm:inline">Lunas</span>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-primary"
                                                        onClick={() => setSelectedTx(order)}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    {user?.role === 'owner' && (
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 opacity-50 cursor-not-allowed" title="Driver thermal coming soon">
                                                            <Printer className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {order.status !== 'Void' && (user?.role === 'owner' || user?.role === 'manager') && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                            onClick={() => handleVoid(order.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {filteredOrders.length === 0 && (
                                <div className="text-center py-12 text-gray-400">Tidak ada transaksi ditemukan.</div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Receipt Modal */}
            <Dialog
                isOpen={!!selectedTx}
                onClose={() => setSelectedTx(null)}
                title="Detail E-Struk"
                description={`Identifikasi Pesanan: ${selectedTx?.order_number}`}
                footer={
                    <>
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setSelectedTx(null)}>Tutup</Button>
                        {selectedTx?.status === 'Pending' && (
                            <Button
                                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold"
                                onClick={() => handleComplete(selectedTx.id)}
                            >
                                <CheckCircle2 className="w-4 h-4" /> Tandai Lunas (Selesaikan)
                            </Button>
                        )}
                        {user?.role === 'owner' && (
                            <Button variant="default" className="w-full sm:w-auto gap-2 opacity-50 cursor-not-allowed">
                                <Printer className="w-4 h-4" /> Cetak Struk Fisik
                            </Button>
                        )}
                    </>
                }
            >
                {selectedTx && (
                    <div className="space-y-4 font-mono text-sm bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200">
                        <div className="text-center border-b border-dashed border-gray-300 pb-4">
                             <h3 className="font-bold text-xl uppercase tracking-wider">{outletName}</h3>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase">Catatan Transaksi Resmi</p>
                        </div>

                        <div className="grid grid-cols-2 gap-y-1 text-[10px] text-gray-500 py-2">
                            <span>ID Pesanan:</span> <span className="text-right text-gray-900">{selectedTx.order_number}</span>
                            <span>Tanggal:</span> <span className="text-right text-gray-900">{formatDate(selectedTx.created_at).date}</span>
                            <span>Kasir:</span> <span className="text-right text-gray-900">{selectedTx.cashier_name}</span>
                            <span>Pembayaran:</span> <span className="text-right text-gray-900 uppercase">{selectedTx.payment_method}</span>
                        </div>

                        <div className="border-t border-b border-dashed border-gray-300 py-4 space-y-3">
                            {selectedTx.items?.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between items-start text-xs">
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-800">{item.product?.name || 'Produk Tidak Dikenal'}</div>
                                        <div className="text-[10px] text-gray-400">{item.quantity} x {formatCurrency(item.price)}</div>
                                    </div>
                                    <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="pt-2 space-y-1">
                            <div className="flex justify-between font-black text-lg text-primary pt-2">
                                <span>TOTAL DIBAYAR</span>
                                <span>{formatCurrency(selectedTx.total_amount)}</span>
                            </div>
                        </div>

                        <div className="text-center text-[9px] text-gray-400 pt-6 italic">
                             *** Terima kasih telah memilih {outletName} ***<br />
                            Simpan struk Anda untuk keperluan pertanyaan atau klaim.
                        </div>
                    </div>
                )}
            </Dialog>
        </div>
    )
}
