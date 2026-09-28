import { useState, useMemo } from "react"
import { useSelector } from "react-redux"
import { RootState } from "../store"
import type { Expense } from "../types"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Dialog } from "../components/ui/dialog"
import { Search, Plus, Loader2, Trash2, Receipt, Pencil, ClipboardList, Edit3, Banknote, CreditCard, Clock, Filter, Flame, TrendingUp, CalendarDays, PieChart, BarChart3, Printer, Download, ChevronDown, ChevronUp } from "lucide-react"
import { useExpenses, useExpenseSummary, useCreateExpense, useUpdateExpense, useDeleteExpense } from "../hooks/useExpenses"
import { useToast } from "../hooks/use-toast"
import { formatNumber } from "../lib/utils"

// 7 Kategori Standar Baku Beban Biaya
export const CANONICAL_CATEGORIES = [
    "Operasional",
    "Bahan Baku (HPP)",
    "Gaji & Upah",
    "Pemeliharaan & Servis",
    "Pemasaran / Marketing",
    "Peralatan",
    "Lainnya"
] as const;

export const CATEGORY_META: Record<string, { label: string; badgeBg: string; barCol: string }> = {
    "Operasional": {
        label: "Operasional",
        badgeBg: "bg-blue-50 text-blue-700 border-blue-200",
        barCol: "bg-blue-600",
    },
    "Bahan Baku (HPP)": {
        label: "Bahan Baku (HPP)",
        badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
        barCol: "bg-amber-600",
    },
    "Gaji & Upah": {
        label: "Gaji & Upah",
        badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        barCol: "bg-emerald-600",
    },
    "Pemeliharaan & Servis": {
        label: "Pemeliharaan & Servis",
        badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
        barCol: "bg-purple-600",
    },
    "Pemasaran / Marketing": {
        label: "Pemasaran / Marketing",
        badgeBg: "bg-rose-50 text-rose-700 border-rose-200",
        barCol: "bg-rose-600",
    },
    "Peralatan": {
        label: "Peralatan",
        badgeBg: "bg-orange-50 text-orange-700 border-orange-200",
        barCol: "bg-orange-500",
    },
    "Lainnya": {
        label: "Lainnya",
        badgeBg: "bg-slate-100 text-slate-700 border-slate-200",
        barCol: "bg-slate-600",
    },
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export const normalizeCategory = (cat?: string): string => {
    if (!cat) return "Lainnya"
    const clean = cat.trim().toLowerCase()
    if (["operational", "operasional", "biaya tetap", "fixed", "beban operasional", "operasional rutin"].includes(clean)) {
        return "Operasional"
    }
    if (["bahan baku", "bahan baku (hpp)", "hpp", "cogs", "raw material"].includes(clean)) {
        return "Bahan Baku (HPP)"
    }
    if (["salary", "gaji", "gaji & upah", "upah", "honor", "bagi hasil"].includes(clean)) {
        return "Gaji & Upah"
    }
    if (["maintenance", "pemeliharaan", "pemeliharaan & servis", "servis", "perawatan"].includes(clean)) {
        return "Pemeliharaan & Servis"
    }
    if (["marketing", "pemasaran", "pemasaran / marketing", "promosi", "iklan"].includes(clean)) {
        return "Pemasaran / Marketing"
    }
    if (["peralatan", "equipment", "alat", "perlengkapan alat", "tools", "inventaris"].includes(clean)) {
        return "Peralatan"
    }
    if (["other", "lainnya", "misc"].includes(clean)) {
        return "Lainnya"
    }
    return "Lainnya"
}

interface RoutineTemplate {
    name: string
    category: string
    cost_type: 'fixed' | 'variable'
    defaultDesc?: string
}

const ROUTINE_TEMPLATES: RoutineTemplate[] = [
    { name: "Tagihan Listrik & Air", category: "Operasional", cost_type: "fixed", defaultDesc: "Listrik, air, dan utilitas operasional" },
    { name: "Gas LPG", category: "Operasional", cost_type: "fixed", defaultDesc: "Isi ulang tabung gas LPG" },
    { name: "BBM (Bensin) Kendaraan", category: "Operasional", cost_type: "fixed", defaultDesc: "Bahan bakar operasional / mobilitas" },
    { name: "Sewa Tempat / Lapak / Parkir", category: "Operasional", cost_type: "fixed", defaultDesc: "Sewa lapak / retribusi harian atau bulanan" },
    { name: "Internet / Wi-Fi / Pulsa", category: "Operasional", cost_type: "fixed", defaultDesc: "Koneksi POS dan operasional toko" },
    { name: "Perlengkapan Warung (Tisu, Sabun, Plastik)", category: "Operasional", cost_type: "variable", defaultDesc: "Tisu, sabun, plastik kresek, dll" },
    { name: "Pembelian Bahan Baku (Kopi/Susu/Sirup/Cup)", category: "Bahan Baku (HPP)", cost_type: "variable", defaultDesc: "Belanja bahan baku minuman/makanan & kemasan" },
    { name: "Gaji & Upah Karyawan / Barista", category: "Gaji & Upah", cost_type: "fixed", defaultDesc: "Gaji pokok, upah harian, lembur barista" },
    { name: "Bagi Hasil / Profit Sharing", category: "Gaji & Upah", cost_type: "variable", defaultDesc: "Bagi hasil periode operasional berjalan" },
    { name: "Servis & Perawatan Mesin / Alat", category: "Pemeliharaan & Servis", cost_type: "fixed" as const, defaultDesc: "Servis espresso maker, grinder, chiller kulkas, alat" },
    { name: "Beli Peralatan Kedai (Gelas/Tamper/Teko/Grinder)", category: "Peralatan", cost_type: "fixed" as const, defaultDesc: "Pembelian peralatan dan inventaris operasional kedai" },
    { name: "Pemasaran & Promosi (Iklan/Banner)", category: "Pemasaran / Marketing", cost_type: "variable" as const, defaultDesc: "Media sosial, promo, spanduk, banner promosi" },
]

export default function Expenses() {
    const [search, setSearch] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [startTime, setStartTime] = useState("")
    const [endTime, setEndTime] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("")
    const [paymentMethodFilter, setPaymentMethodFilter] = useState("")

    // Auth Check
    const { user } = useSelector((state: RootState) => state.auth)
    const canEdit = user?.role === 'owner' || user?.role === 'manager'

    // Modals & Mode
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
    const [entryType, setEntryType] = useState<'routine' | 'custom'>('routine')
    const [selectedRoutineName, setSelectedRoutineName] = useState<string>("")

    // Form Time State
    const [formTime, setFormTime] = useState(new Date().toTimeString().slice(0, 5))

    // Form State
    const [formData, setFormData] = useState<Partial<Expense>>({
        title: "",
        amount: 0,
        category: "Operasional",
        cost_type: "variable",
        payment_method: "Cash",
        description: "",
        date: new Date().toISOString().split('T')[0]
    })

    const { toast } = useToast()
    const [activeView, setActiveView] = useState<'list' | 'daily'>('list')
    const { data: expenses = [], isFetching: isLoading, refetch } = useExpenses(startDate, endDate, categoryFilter)
    const { data: summary } = useExpenseSummary(startDate, endDate)
    const createExpense = useCreateExpense()
    const updateExpense = useUpdateExpense()
    const deleteExpense = useDeleteExpense()

    // Accordion Rincian Kategori State
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})

    const toggleCategoryExpand = (cat: string) => {
        setExpandedCategories(prev => ({
            ...prev,
            [cat]: !prev[cat]
        }))
    }

    const toggleAllCategories = (expand: boolean) => {
        const next: Record<string, boolean> = {}
        categoryBreakdown.forEach(c => {
            next[c.category] = expand
        })
        setExpandedCategories(next)
    }

    // Consolidated Category Breakdown (Zero-double guarantee & complete item list)
    const categoryBreakdown = useMemo(() => {
        const catMap = new Map<string, { category: string; total: number; count: number; items: Expense[] }>()

        // 1. Inisialisasi 6 kategori standar agar urutannya konsisten
        CANONICAL_CATEGORIES.forEach(cat => {
            catMap.set(cat, { category: cat, total: 0, count: 0, items: [] })
        })

        // 2. Masukkan data dari summary backend (yang sudah punya items & total lengkap per periode)
        if (summary?.category_breakdown) {
            summary.category_breakdown.forEach((stat: any) => {
                const canonical = normalizeCategory(stat.category)
                if (!catMap.has(canonical)) {
                    catMap.set(canonical, { category: canonical, total: 0, count: 0, items: [] })
                }
                const entry = catMap.get(canonical)!
                entry.total += Number(stat.total) || 0
                entry.count += Number(stat.count) || 0
                if (Array.isArray(stat.items) && stat.items.length > 0) {
                    const existingIds = new Set(entry.items.map(i => i.id))
                    stat.items.forEach((item: Expense) => {
                        if (!existingIds.has(item.id)) {
                            entry.items.push(item)
                            existingIds.add(item.id)
                        }
                    })
                }
            })
        }

        // 3. Gabungkan juga dari list expenses yang ada di frontend jika summary items belum terisi
        if (Array.isArray(expenses)) {
            expenses.forEach((e: Expense) => {
                const canonical = normalizeCategory(e.category)
                if (!catMap.has(canonical)) {
                    catMap.set(canonical, { category: canonical, total: 0, count: 0, items: [] })
                }
                const entry = catMap.get(canonical)!
                // Jika total masih 0 (summary belum ada), kita akumulasikan
                if (!summary?.category_breakdown || summary.category_breakdown.length === 0) {
                    entry.total += Number(e.amount) || 0
                    entry.count += 1
                }
                const existingIds = new Set(entry.items.map(i => i.id))
                if (!existingIds.has(e.id)) {
                    entry.items.push(e)
                }
            })
        }

        // 4. Hitung persentase dan urutkan items per kategori
        const activeCategories = Array.from(catMap.values()).filter(c => c.count > 0 || c.total > 0)
        const grandTotal = activeCategories.reduce((sum, c) => sum + c.total, 0)

        return activeCategories.map(c => {
            const sortedItems = [...c.items].sort((a, b) => {
                const da = new Date(a.date).getTime()
                const db = new Date(b.date).getTime()
                if (da === db) return (b.id || 0) - (a.id || 0)
                return db - da
            })
            return {
                ...c,
                items: sortedItems,
                percentage: grandTotal > 0 ? Math.round((c.total / grandTotal) * 1000) / 10 : 0
            }
        }).sort((a, b) => b.total - a.total)
    }, [expenses, summary])

    const setPreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'last_month') => {
        const now = new Date()
        const toDateStr = (d: Date) => {
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }
        if (preset === 'today') {
            const todayStr = toDateStr(now)
            setStartDate(todayStr)
            setEndDate(todayStr)
        } else if (preset === 'yesterday') {
            const y = new Date(now)
            y.setDate(y.getDate() - 1)
            const yStr = toDateStr(y)
            setStartDate(yStr)
            setEndDate(yStr)
        } else if (preset === 'week') {
            const w = new Date(now)
            w.setDate(w.getDate() - 6)
            setStartDate(toDateStr(w))
            setEndDate(toDateStr(now))
        } else if (preset === 'month') {
            const first = new Date(now.getFullYear(), now.getMonth(), 1)
            setStartDate(toDateStr(first))
            setEndDate(toDateStr(now))
        } else if (preset === 'last_month') {
            const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const last = new Date(now.getFullYear(), now.getMonth(), 0)
            setStartDate(toDateStr(first))
            setEndDate(toDateStr(last))
        }
        setStartTime("")
        setEndTime("")
    }

    const handleOpenAdd = () => {
        setEditingExpense(null)
        setEntryType('routine')
        setSelectedRoutineName("")
        const now = new Date()
        setFormTime(now.toTimeString().slice(0, 5))
        setFormData({
            title: "",
            amount: 0,
            category: "Operasional",
            cost_type: "variable",
            payment_method: "Cash",
            description: "",
            date: now.toISOString().split('T')[0]
        })
        setIsModalOpen(true)
    }

    const handleOpenEdit = (exp: Expense) => {
        setEditingExpense(exp)
        setEntryType('custom')
        const expDate = new Date(exp.date)
        if (!isNaN(expDate.getTime())) {
            const h = expDate.getHours().toString().padStart(2, '0')
            const m = expDate.getMinutes().toString().padStart(2, '0')
            setFormTime(`${h}:${m}`)
            setFormData({
                title: exp.title,
                amount: exp.amount,
                category: exp.category,
                cost_type: exp.cost_type || "variable",
                payment_method: exp.payment_method || "Cash",
                description: exp.description,
                date: expDate.toISOString().split('T')[0]
            })
        } else {
            setFormTime(new Date().toTimeString().slice(0, 5))
            setFormData({
                title: exp.title,
                amount: exp.amount,
                category: exp.category,
                cost_type: exp.cost_type || "variable",
                payment_method: exp.payment_method || "Cash",
                description: exp.description,
                date: new Date().toISOString().split('T')[0]
            })
        }
        setIsModalOpen(true)
    }

    const handleRoutineSelect = (routineName: string) => {
        setSelectedRoutineName(routineName)
        if (!routineName) return
        const tpl = ROUTINE_TEMPLATES.find(t => t.name === routineName)
        if (tpl) {
            setFormData(prev => ({
                ...prev,
                title: tpl.name,
                category: tpl.category,
                cost_type: tpl.cost_type,
                description: tpl.defaultDesc || "",
            }))
        }
    }

    const handleSave = async () => {
        if (!formData.title?.trim()) {
            toast({ title: "Validasi Gagal", description: "Judul pengeluaran tidak boleh kosong", variant: "error" })
            return
        }
        if (!formData.amount || formData.amount <= 0) {
            toast({ title: "Validasi Gagal", description: "Nominal jumlah harus lebih dari 0", variant: "error" })
            return
        }
        if (formData.category === "Lainnya" && !formData.description?.trim()) {
            toast({ title: "Validasi Gagal", description: "Kategori 'Lainnya' wajib mencantumkan catatan / keterangan", variant: "error" })
            return
        }

        const datePart = formData.date ? formData.date.split('T')[0] : new Date().toISOString().split('T')[0]
        const fullDate = formTime ? `${datePart}T${formTime}:00` : datePart

        const payload = {
            ...formData,
            date: fullDate,
            payment_method: formData.payment_method || "Cash",
        }

        try {
            if (editingExpense) {
                await updateExpense.mutateAsync({ id: editingExpense.id, ...payload })
                toast({ title: "Success", description: "Pengeluaran berhasil diperbarui", variant: "success" })
            } else {
                await createExpense.mutateAsync(payload)
                toast({ title: "Success", description: "Pengeluaran berhasil dicatat", variant: "success" })
            }
            setIsModalOpen(false)
        } catch (e: any) {
            toast({ 
                title: "Error", 
                description: e.response?.data?.error || "Gagal menyimpan pengeluaran", 
                variant: "error" 
            })
        }
    }

    const handleDeleteExpense = async (id: number) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus catatan pengeluaran ini?")) return
        try {
            await deleteExpense.mutateAsync(id)
            toast({ title: "Success", description: "Pengeluaran berhasil dihapus", variant: "success" })
        } catch (e: any) {
            toast({ 
                title: "Error", 
                description: e.response?.data?.error || "Gagal menghapus pengeluaran", 
                variant: "error" 
            })
        }
    }

    const filteredExpenses = expenses.filter(exp => {
        const canonicalCat = normalizeCategory(exp.category)
        const matchesSearch = exp.title.toLowerCase().includes(search.toLowerCase()) ||
            exp.category.toLowerCase().includes(search.toLowerCase()) ||
            canonicalCat.toLowerCase().includes(search.toLowerCase())
        const matchesCategory = !categoryFilter || canonicalCat === categoryFilter
        const matchesMethod = !paymentMethodFilter || (exp.payment_method || 'Cash') === paymentMethodFilter
        
        let matchesTime = true
        if (startTime || endTime) {
            const expDateObj = new Date(exp.date)
            if (!isNaN(expDateObj.getTime())) {
                const hours = expDateObj.getHours().toString().padStart(2, '0')
                const minutes = expDateObj.getMinutes().toString().padStart(2, '0')
                const expTimeStr = `${hours}:${minutes}`
                if (startTime && expTimeStr < startTime) matchesTime = false
                if (endTime && expTimeStr > endTime) matchesTime = false
            }
        }

        return matchesSearch && matchesCategory && matchesMethod && matchesTime
    })

    const totalExpenseAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
    const totalCashExpense = filteredExpenses.filter(exp => (exp.payment_method || 'Cash') === 'Cash').reduce((sum, exp) => sum + exp.amount, 0)
    const totalQrisExpense = filteredExpenses.filter(exp => exp.payment_method === 'QRIS').reduce((sum, exp) => sum + exp.amount, 0)

    // Ekspor Data Pengeluaran ke CSV untuk arsip & data sains
    const exportExpensesCSV = () => {
        if (filteredExpenses.length === 0) {
            toast({ title: "Info", description: "Tidak ada data pengeluaran untuk diekspor", variant: "info" })
            return
        }

        const headers = ["ID", "Tanggal", "Waktu", "Judul_Pengeluaran", "Kategori", "Metode_Bayar", "Tipe_Biaya", "Nominal_Rp"]
        const rows = filteredExpenses.map(exp => {
            const expDate = new Date(exp.date)
            const dateStr = !isNaN(expDate.getTime()) ? expDate.toISOString().slice(0, 10) : exp.date
            const timeStr = !isNaN(expDate.getTime()) ? expDate.toTimeString().slice(0, 5) : '-'
            return [
                exp.id,
                `"${dateStr}"`,
                `"${timeStr}"`,
                `"${(exp.title || '').replace(/"/g, '""')}"`,
                `"${(exp.category || '').replace(/"/g, '""')}"`,
                `"${exp.payment_method || 'Cash'}"`,
                `"${exp.cost_type || 'operational'}"`,
                exp.amount
            ]
        })

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `rekap_pengeluaran_${startDate || 'all'}_sd_${endDate || 'all'}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    // Cetak Slip Rekonsiliasi Kas Laci (Print Window Thermal / A4)
    const handlePrintCashClosingSlip = () => {
        const cashExpenses = filteredExpenses.filter(exp => (exp.payment_method || 'Cash') === 'Cash')
        const printWindow = window.open('', '_blank', 'width=650,height=700')
        if (!printWindow) {
            alert("Harap izinkan pop-up browser untuk mencetak slip rekap kas.")
            return
        }

        const dateRangeLabel = startDate && endDate 
            ? `${startDate} s/d ${endDate}` 
            : startDate 
                ? `Tanggal ${startDate}` 
                : 'Semua Periode'

        const rowsHtml = cashExpenses.map((exp, idx) => `
            <tr style="border-bottom: 1px dashed #ccc;">
                <td style="padding: 6px 4px; text-align: left;">${idx + 1}. ${exp.title}</td>
                <td style="padding: 6px 4px; text-align: left; color: #666; font-size: 11px;">${exp.category}</td>
                <td style="padding: 6px 4px; text-align: right; font-weight: bold;">Rp ${formatNumber(exp.amount)}</td>
            </tr>
        `).join('')

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Rekap Pengeluaran Kas Laci - Singgah Coffee</title>
                <style>
                    body { font-family: monospace, sans-serif; font-size: 12px; margin: 20px; color: #111; }
                    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
                    .header h2 { margin: 0; font-size: 16px; }
                    .header p { margin: 2px 0; font-size: 11px; color: #555; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    .total-box { border-top: 2px solid #000; margin-top: 12px; padding-top: 8px; text-align: right; font-size: 14px; font-weight: bold; }
                    .sign-box { margin-top: 30px; display: flex; justify-content: space-between; text-align: center; }
                    .sign-col { width: 45%; }
                    .sign-line { margin-top: 50px; border-bottom: 1px solid #000; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>SINGGAH COFFEE & EATERY</h2>
                    <p>BUKTI REKONSILIASI PENGELUARAN KAS LACI (PETTY CASH)</p>
                    <p>Periode: <strong>${dateRangeLabel}</strong></p>
                    <p>Dicetak: ${new Date().toLocaleString('id-ID')}</p>
                </div>
                <table>
                    <thead>
                        <tr style="border-bottom: 1px solid #000; font-size: 11px;">
                            <th style="text-align: left; padding-bottom: 4px;">Keterangan</th>
                            <th style="text-align: left; padding-bottom: 4px;">Kategori</th>
                            <th style="text-align: right; padding-bottom: 4px;">Nominal (Rp)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="3" style="text-align:center; padding: 10px;">Tidak ada pengeluaran kas tunai</td></tr>'}
                    </tbody>
                </table>
                <div class="total-box">
                    Total Pengeluaran Kas Laci: Rp ${formatNumber(totalCashExpense)}
                </div>
                <div class="sign-box">
                    <div class="sign-col">
                        <p>Kasir / Barista Penyerah</p>
                        <div class="sign-line"></div>
                        <p style="font-size: 11px; margin-top: 4px;">( ${user?.name || 'Kasir Toko'} )</p>
                    </div>
                    <div class="sign-col">
                        <p>Manajer / Owner Penerima</p>
                        <div class="sign-line"></div>
                        <p style="font-size: 11px; margin-top: 4px;">( .................................... )</p>
                    </div>
                </div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `)
        printWindow.document.close()
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold text-gray-900">Pelacakan Pengeluaran</h1>
                    <p className="text-gray-500">Kelola biaya operasional, pembelian bahan baku, dan pengeluaran kas/QRIS.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Segarkan"}
                    </Button>
                    {canEdit && (
                        <Button size="sm" className="gap-1 sm:gap-2" onClick={handleOpenAdd}>
                            <Plus className="w-4 h-4" /> Tambah Pengeluaran
                        </Button>
                    )}
                </div>
            </div>

            {/* Quick Presets & Filter Bar */}
            <Card className="border-none shadow-sm">
                <CardContent className="pt-4 pb-4">
                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-2 mb-3 pb-3 border-b border-slate-100">
                        <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" /> Periode Cepat:
                        </span>
                        <button
                            type="button"
                            onClick={() => setPreset('today')}
                            className="px-2.5 py-1 text-xs rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                        >
                            Hari Ini
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreset('yesterday')}
                            className="px-2.5 py-1 text-xs rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                        >
                            Kemarin
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreset('week')}
                            className="px-2.5 py-1 text-xs rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                        >
                            7 Hari Terakhir
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreset('month')}
                            className="px-2.5 py-1 text-xs rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                        >
                            Bulan Ini
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreset('last_month')}
                            className="px-2.5 py-1 text-xs rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
                        >
                            Bulan Lalu
                        </button>
                    </div>

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
                            <label className="text-xs font-medium text-gray-500">Kategori</label>
                            <select
                                className="flex h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="">Semua Kategori</option>
                                <option value="Operasional">Operasional</option>
                                <option value="Bahan Baku (HPP)">Bahan Baku (HPP)</option>
                                <option value="Gaji & Upah">Gaji & Upah</option>
                                <option value="Pemeliharaan & Servis">Pemeliharaan & Servis</option>
                                <option value="Pemasaran / Marketing">Pemasaran / Marketing</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-500">Metode Bayar</label>
                            <select
                                className="flex h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                                value={paymentMethodFilter}
                                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                            >
                                <option value="">Semua Metode</option>
                                <option value="Cash">Cash (Tunai)</option>
                                <option value="QRIS">QRIS / Bank</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                        {(startDate || endDate || startTime || endTime || categoryFilter || paymentMethodFilter) && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setStartDate("")
                                    setEndDate("")
                                    setStartTime("")
                                    setEndTime("")
                                    setCategoryFilter("")
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

            {/* Executive Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 border-l-4 border-amber-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-amber-800">Total Pengeluaran</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-900">Rp {formatNumber(totalExpenseAmount)}</div>
                        <p className="text-xs text-amber-600 mt-1">
                            {filteredExpenses.length} transaksi tercatat
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-green-50 border-l-4 border-emerald-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Kas Laci Fisik (Cash)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-900">Rp {formatNumber(totalCashExpense)}</div>
                        <p className="text-xs text-emerald-600 mt-1">
                            Arus kas keluar kasir
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-indigo-50 border-l-4 border-purple-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-purple-800">Digital (QRIS / Bank)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900">Rp {formatNumber(totalQrisExpense)}</div>
                        <p className="text-xs text-purple-600 mt-1">
                            Arus keluar rekening toko
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50 border-l-4 border-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-blue-800 flex items-center justify-between">
                            <span>Burn Rate & Rasio</span>
                            <Flame className="w-3.5 h-3.5 text-blue-500" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900">
                            Rp {formatNumber(summary?.daily_average_burn || (filteredExpenses.length ? Math.round(totalExpenseAmount / Math.max(1, (summary?.daily_recap?.length || 1))) : 0))}
                            <span className="text-xs font-normal text-blue-600">/hari</span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1 flex items-center gap-1 font-medium">
                            <TrendingUp className="w-3 h-3" />
                            Rasio: {summary?.expense_ratio ?? 0}% thdp Omzet
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Visual Breakdown & Top 3 Expenses */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Category Progress Breakdown with Itemized Drill-Down */}
                <Card className="border-none shadow-sm lg:col-span-2">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-100">
                        <div>
                            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
                                <PieChart className="w-4 h-4 text-primary" />
                                Distribusi Kategori Beban
                            </CardTitle>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Klik kategori untuk melihat rincian transaksi pengeluaran
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {categoryBreakdown.length > 0 && (
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[11px] px-2 text-slate-600 hover:text-slate-900 border-slate-200"
                                        onClick={() => toggleAllCategories(true)}
                                    >
                                        Buka Semua
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[11px] px-2 text-slate-600 hover:text-slate-900 border-slate-200"
                                        onClick={() => toggleAllCategories(false)}
                                    >
                                        Tutup Semua
                                    </Button>
                                </div>
                            )}
                            <span className="text-xs text-slate-400 hidden sm:inline">6 Kategori Baku</span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-3">
                        {categoryBreakdown.length === 0 ? (
                            <p className="text-xs text-slate-400 py-6 text-center">Belum ada data kategori untuk periode ini</p>
                        ) : (
                            <div className="space-y-3">
                                {categoryBreakdown.map((cat) => {
                                    const isExpanded = !!expandedCategories[cat.category]
                                    const meta = CATEGORY_META[cat.category] || CATEGORY_META["Lainnya"]
                                    return (
                                        <div
                                            key={cat.category}
                                            className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-2xs transition-all hover:border-slate-300"
                                        >
                                            {/* Baris Ringkasan Kategori (Klik untuk buka/tutup rincian) */}
                                            <div
                                                className="p-3 cursor-pointer select-none hover:bg-slate-50/70 transition-colors"
                                                onClick={() => toggleCategoryExpand(cat.category)}
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors">
                                                            {isExpanded ? (
                                                                <ChevronUp className="w-4 h-4 text-primary" />
                                                            ) : (
                                                                <ChevronDown className="w-4 h-4 text-slate-400" />
                                                            )}
                                                        </div>
                                                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${meta.badgeBg}`}>
                                                            {cat.category}
                                                        </span>
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            • {cat.count} transaksi
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <span className="text-sm font-bold text-slate-900">
                                                                Rp {formatNumber(cat.total)}
                                                            </span>
                                                            <span className="text-[11px] text-slate-500 font-medium ml-1.5">
                                                                ({cat.percentage}%)
                                                            </span>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 px-2 text-[11px] font-semibold text-slate-600 hover:text-primary hover:bg-primary/10 gap-1"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setCategoryFilter(cat.category)
                                                                const el = document.getElementById("expense-data-section")
                                                                if (el) el.scrollIntoView({ behavior: 'smooth' })
                                                            }}
                                                            title={`Filter tabel utama ke kategori ${cat.category}`}
                                                        >
                                                            <Filter className="w-3 h-3" />
                                                            Filter
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Progress Bar Persentase */}
                                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-2">
                                                    <div
                                                        className={`${meta.barCol} h-1.5 rounded-full transition-all duration-300`}
                                                        style={{ width: `${Math.min(100, Math.max(2, cat.percentage))}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Rincian Transaksi Pengeluaran di Bawah Kategori Ini */}
                                            {isExpanded && (
                                                <div className="border-t border-slate-100 bg-slate-50/70 p-3 space-y-2">
                                                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 px-1">
                                                        <span>Daftar Transaksi ({cat.items.length} Item)</span>
                                                        <span>Nominal</span>
                                                    </div>
                                                    {cat.items.length === 0 ? (
                                                        <p className="text-xs text-slate-400 text-center py-2 italic">
                                                            Tidak ada rincian transaksi untuk filter aktif
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                                            {cat.items.map((item, idx) => (
                                                                <div
                                                                    key={item.id || idx}
                                                                    className="p-2 rounded-lg bg-white border border-slate-200/80 flex items-start justify-between gap-3 text-xs hover:border-slate-300 transition-colors"
                                                                >
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className="font-semibold text-slate-800 break-words">
                                                                                {item.title}
                                                                            </span>
                                                                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                                                                (item.payment_method || 'Cash') === 'QRIS'
                                                                                    ? 'bg-purple-100 text-purple-700'
                                                                                    : 'bg-emerald-100 text-emerald-700'
                                                                            }`}>
                                                                                {item.payment_method || 'Cash'}
                                                                            </span>
                                                                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                                                                {item.cost_type === 'fixed' ? 'Tetap' : 'Variabel'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                                                                            <span>
                                                                                {item.date ? new Date(item.date).toLocaleDateString('id-ID', {
                                                                                    day: '2-digit',
                                                                                    month: 'short',
                                                                                    year: 'numeric'
                                                                                }) : '-'}
                                                                                {item.date && !isNaN(new Date(item.date).getTime()) && ` • ${new Date(item.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`}
                                                                            </span>
                                                                            {item.notes && (
                                                                                <span className="italic text-slate-600 font-medium truncate max-w-[200px]" title={item.notes}>
                                                                                    • {item.notes}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right shrink-0 flex items-center gap-2">
                                                                        <span className="font-bold text-slate-900">
                                                                            Rp {formatNumber(item.amount)}
                                                                        </span>
                                                                        {canEdit && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="sm"
                                                                                className="h-6 w-6 p-0 text-slate-400 hover:text-blue-600"
                                                                                onClick={() => handleOpenEdit(item)}
                                                                                title="Edit rincian pengeluaran ini"
                                                                            >
                                                                                <Pencil className="w-3 h-3" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top 3 Pos Pengeluaran Terbesar */}
                <Card className="border-none shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
                            <BarChart3 className="w-4 h-4 text-amber-600" />
                            Top 3 Pengeluaran Terbesar
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(!summary?.top_expenses || summary.top_expenses.length === 0) ? (
                            <p className="text-xs text-slate-400 py-4 text-center">Belum ada data pengeluaran</p>
                        ) : (
                            <div className="space-y-2.5 pt-1">
                                {summary.top_expenses.slice(0, 3).map((top: any, idx: number) => (
                                    <div key={top.id || idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <p className="text-xs font-semibold text-slate-800 truncate">{top.title}</p>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5 pl-5">
                                                {top.category} • {top.date ? new Date(top.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-xs font-bold text-slate-900">
                                                Rp {formatNumber(top.amount)}
                                            </span>
                                            <span className="block text-[10px] text-slate-400">{top.payment_method || 'Cash'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Expenses List & Daily View */}
            <Card id="expense-data-section" className="border-none shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <CardTitle className="text-lg font-bold">Data Pengeluaran</CardTitle>
                        <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
                            <button
                                type="button"
                                onClick={() => setActiveView('list')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                                    activeView === 'list' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Daftar Transaksi
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveView('daily')}
                                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                                    activeView === 'daily' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                Rekap Harian Kas
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={handlePrintCashClosingSlip}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 shadow-2xs transition-all"
                            title="Cetak struk rekonsiliasi pengeluaran kas laci untuk serah terima shift kasir"
                        >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            Cetak Rekap Kas
                        </button>
                        <button
                            type="button"
                            onClick={exportExpensesCSV}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs transition-all"
                            title="Unduh seluruh data pengeluaran dalam format file Excel / CSV"
                        >
                            <Download className="w-3.5 h-3.5 text-emerald-600" />
                            Ekspor CSV
                        </button>
                        {activeView === 'list' && (
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Cari pengeluaran..."
                                    className="pl-8"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {activeView === 'daily' ? (
                        (!summary?.daily_recap || summary.daily_recap.length === 0) ? (
                            <div className="text-center py-8 text-gray-500">
                                <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                                <p>Tidak ada data rekap harian untuk periode ini</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                                        <tr>
                                            <th className="px-4 py-3">Tanggal</th>
                                            <th className="px-4 py-3 text-right">Kas Laci Fisik (Cash)</th>
                                            <th className="px-4 py-3 text-right">Digital (QRIS / Bank)</th>
                                            <th className="px-4 py-3 text-center">Jml Transaksi</th>
                                            <th className="px-4 py-3 text-right">Total Kas Keluar</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summary.daily_recap.map((d: any) => (
                                            <tr key={d.date} className="border-b hover:bg-gray-50/50">
                                                <td className="px-4 py-3 font-semibold text-slate-800">
                                                    {new Date(d.date).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-4 py-3 text-right text-emerald-700 font-bold">
                                                    Rp {formatNumber(d.cash_amount)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-purple-700 font-bold">
                                                    Rp {formatNumber(d.non_cash_amount)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                                                        {d.count} trx
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                                                    Rp {formatNumber(d.total_amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    ) : isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : filteredExpenses.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                            <p>Tidak ada data pengeluaran ditemukan</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                                    <tr>
                                        <th className="px-4 py-3">Tanggal & Waktu</th>
                                        <th className="px-4 py-3">Judul</th>
                                        <th className="px-4 py-3">Kategori</th>
                                        <th className="px-4 py-3">Metode Bayar</th>
                                        <th className="px-4 py-3">Tipe Biaya</th>
                                        <th className="px-4 py-3 text-right">Jumlah</th>
                                        {canEdit && <th className="px-4 py-3 text-right">Aksi</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredExpenses.map((exp) => {
                                        const d = new Date(exp.date)
                                        const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' }) : exp.date
                                        const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) : ""

                                        return (
                                            <tr key={exp.id} className="border-b hover:bg-gray-50/50">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="font-semibold text-slate-800">{dateStr}</div>
                                                    {timeStr && <div className="text-[11px] text-slate-400 flex items-center gap-0.5 mt-0.5"><Clock className="w-3 h-3" /> {timeStr}</div>}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    <div>{exp.title}</div>
                                                    {exp.description && (
                                                        <div className="text-xs text-gray-400 font-normal">{exp.description}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                                        CATEGORY_META[normalizeCategory(exp.category)]?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200'
                                                    }`}>
                                                        {normalizeCategory(exp.category)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                        (exp.payment_method || 'Cash') === 'QRIS'
                                                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                                            : (exp.payment_method || 'Cash') === 'Cash'
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                    }`}>
                                                        {(exp.payment_method || 'Cash') === 'QRIS' ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                                                        {exp.payment_method || 'Cash'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                                        exp.cost_type === 'fixed' 
                                                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    }`}>
                                                        {exp.cost_type === 'fixed' ? 'Tetap (Fixed)' : 'Variabel'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900">
                                                    Rp {formatNumber(exp.amount)}
                                                </td>
                                                {canEdit && (
                                                    <td className="px-4 py-3 text-right space-x-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => handleOpenEdit(exp)}
                                                        >
                                                            <Pencil className="w-4 h-4 text-gray-500 hover:text-blue-600" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => handleDeleteExpense(exp.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Expense Modal (Add/Edit) */}
            <Dialog
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingExpense ? "Edit Pengeluaran" : "Tambah Pengeluaran Baru"}
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                        <Button onClick={handleSave}>
                            {editingExpense ? "Simpan Perubahan" : "Simpan Pengeluaran"}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    {!editingExpense && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                Jenis Pengeluaran
                            </label>
                            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEntryType('routine')
                                        handleRoutineSelect(selectedRoutineName)
                                    }}
                                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                                        entryType === 'routine'
                                            ? 'bg-white text-primary shadow-sm font-semibold'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <ClipboardList className="w-3.5 h-3.5" />
                                    Operasional (Template Rutin)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEntryType('custom')
                                        setFormData(prev => ({
                                            ...prev,
                                            title: "",
                                            category: "Operasional",
                                            cost_type: "variable",
                                            description: "",
                                        }))
                                    }}
                                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                                        entryType === 'custom'
                                            ? 'bg-white text-primary shadow-sm font-semibold'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Manual
                                </button>
                            </div>
                        </div>
                    )}

                    {!editingExpense && entryType === 'routine' && (
                        <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/50 p-3">
                            <label className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
                                <ClipboardList className="w-4 h-4 text-blue-600" />
                                Pilih Template Biaya Operasional:
                            </label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500"
                                value={selectedRoutineName}
                                onChange={(e) => handleRoutineSelect(e.target.value)}
                            >
                                <option value="">-- Pilih Biaya Rutin --</option>
                                {ROUTINE_TEMPLATES.map((tpl) => (
                                    <option key={tpl.name} value={tpl.name}>
                                        {tpl.name} ({tpl.cost_type === 'fixed' ? 'Biaya Tetap' : 'Operasional'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* METODE PEMBAYARAN: Visual Toggle Cards */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                            Metode Pembayaran (Sumber Kas)
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, payment_method: 'Cash' })}
                                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all text-left ${
                                    (formData.payment_method || 'Cash') === 'Cash'
                                        ? 'border-emerald-500 bg-emerald-50/80 shadow-sm text-emerald-900 font-bold'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Banknote className={`w-4 h-4 ${(formData.payment_method || 'Cash') === 'Cash' ? 'text-emerald-600' : 'text-slate-400'}`} />
                                    <span className="text-xs">Cash (Tunai)</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-normal">Kas Toko / Kasir</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, payment_method: 'QRIS' })}
                                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all text-left ${
                                    formData.payment_method === 'QRIS'
                                        ? 'border-purple-500 bg-purple-50/80 shadow-sm text-purple-900 font-bold'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-1.5 mb-1">
                                    <CreditCard className={`w-4 h-4 ${formData.payment_method === 'QRIS' ? 'text-purple-600' : 'text-slate-400'}`} />
                                    <span className="text-xs">QRIS / Bank</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-normal">Transfer Non-Tunai</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, payment_method: 'Lainnya' })}
                                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all text-left ${
                                    formData.payment_method === 'Lainnya'
                                        ? 'border-blue-500 bg-blue-50/80 shadow-sm text-blue-900 font-bold'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Receipt className={`w-4 h-4 ${formData.payment_method === 'Lainnya' ? 'text-blue-600' : 'text-slate-400'}`} />
                                    <span className="text-xs">Lainnya</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-normal">Giro / Bon / Tempo</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Judul Pengeluaran</label>
                        <Input
                            placeholder="cth. Pembelian: Susu Full Cream UHT / Tagihan Listrik"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Jumlah Nominal (Rp)</label>
                            <Input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={formData.amount || ''}
                                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) || 0 })}
                                className="font-bold text-base text-slate-900"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Kategori</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            >
                                <option value="Operasional">Operasional</option>
                                <option value="Bahan Baku (HPP)">Bahan Baku (HPP)</option>
                                <option value="Gaji & Upah">Gaji & Upah</option>
                                <option value="Pemeliharaan & Servis">Pemeliharaan & Servis</option>
                                <option value="Pemasaran / Marketing">Pemasaran / Marketing</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Tanggal</label>
                            <Input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" /> Jam
                            </label>
                            <Input
                                type="time"
                                value={formTime}
                                onChange={(e) => setFormTime(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Tipe Biaya (BEP)</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
                                value={formData.cost_type || "variable"}
                                onChange={(e) => setFormData({ ...formData, cost_type: e.target.value as any })}
                            >
                                <option value="variable">Variabel (Harian)</option>
                                <option value="fixed">Tetap (Rutin)</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                            Deskripsi / Catatan {formData.category === 'Lainnya' ? <span className="text-rose-600 font-bold ml-1">*Wajib diisi untuk Kategori Lainnya</span> : <span className="text-slate-400 font-normal ml-1">(Opsional)</span>}
                        </label>
                        <Input
                            placeholder={formData.category === 'Lainnya' ? "Wajib cantumkan alasan / detail pengeluaran lainnya..." : "Detail pembelian, kuantiti, supplier, dll..."}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className={formData.category === 'Lainnya' && !formData.description?.trim() ? 'border-rose-400 bg-rose-50/20' : ''}
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    )
}
