import { useState } from "react"
import { useSelector } from "react-redux"
import { RootState } from "../store"
import type { Expense } from "../types"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Dialog } from "../components/ui/dialog"
import { Search, Plus, Loader2, Trash2, Receipt, Pencil, ClipboardList, Edit3, Banknote, CreditCard, Clock, Filter } from "lucide-react"
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "../hooks/useExpenses"
import { useToast } from "../hooks/use-toast"
import { formatNumber } from "../lib/utils"

interface RoutineTemplate {
    name: string
    category: string
    cost_type: 'fixed' | 'variable'
    defaultDesc?: string
}

const ROUTINE_TEMPLATES: RoutineTemplate[] = [
    { name: "Tagihan Listrik & Air", category: "Operational", cost_type: "fixed", defaultDesc: "Listrik, air, dan utilitas operasional" },
    { name: "Gas LPG", category: "Operational", cost_type: "fixed", defaultDesc: "Isi ulang tabung gas LPG" },
    { name: "BBM (Bensin) Kendaraan", category: "Operational", cost_type: "fixed", defaultDesc: "Bahan bakar operasional / mobilitas" },
    { name: "Sewa Tempat / Lapak / Parkir", category: "Operational", cost_type: "fixed", defaultDesc: "Sewa lapak / retribusi harian atau bulanan" },
    { name: "Internet / Wi-Fi / Pulsa", category: "Operational", cost_type: "fixed", defaultDesc: "Koneksi POS dan operasional toko" },
    { name: "Gaji / Upah Karyawan", category: "Salary", cost_type: "fixed", defaultDesc: "Gaji / upah barista atau operator" },
    { name: "Perlengkapan Warung (Tisu, Sabun, Plastik)", category: "Operational", cost_type: "variable", defaultDesc: "Tisu, sabun, plastik kresek, dll" },
    { name: "Servis & Perawatan Mesin / Alat", category: "Maintenance", cost_type: "fixed", defaultDesc: "Servis espresso maker, grinder, alat" },
    { name: "Pemasaran & Promosi (Iklan/Banner)", category: "Marketing", cost_type: "variable", defaultDesc: "Media sosial, promo, spanduk" },
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
        category: "Operational",
        cost_type: "variable",
        payment_method: "Cash",
        description: "",
        date: new Date().toISOString().split('T')[0]
    })

    const { toast } = useToast()
    const { data: expenses = [], isFetching: isLoading, refetch } = useExpenses(startDate, endDate, categoryFilter)
    const createExpense = useCreateExpense()
    const updateExpense = useUpdateExpense()
    const deleteExpense = useDeleteExpense()

    const handleOpenAdd = () => {
        setEditingExpense(null)
        setEntryType('routine')
        setSelectedRoutineName("")
        const now = new Date()
        setFormTime(now.toTimeString().slice(0, 5))
        setFormData({
            title: "",
            amount: 0,
            category: "Operational",
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
        const matchesSearch = exp.title.toLowerCase().includes(search.toLowerCase()) ||
            exp.category.toLowerCase().includes(search.toLowerCase())
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

        return matchesSearch && matchesMethod && matchesTime
    })

    const totalExpenseAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0)
    const totalCashExpense = filteredExpenses.filter(exp => (exp.payment_method || 'Cash') === 'Cash').reduce((sum, exp) => sum + exp.amount, 0)
    const totalQrisExpense = filteredExpenses.filter(exp => exp.payment_method === 'QRIS').reduce((sum, exp) => sum + exp.amount, 0)

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
                            <label className="text-xs font-medium text-gray-500">Kategori</label>
                            <select
                                className="flex h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                <option value="">Semua Kategori</option>
                                <option value="Operational">Operasional</option>
                                <option value="Marketing">Pemasaran</option>
                                <option value="Maintenance">Pemeliharaan</option>
                                <option value="Salary">Gaji</option>
                                <option value="Other">Lainnya</option>
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

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Pengeluaran Tunai (Cash)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-900">Rp {formatNumber(totalCashExpense)}</div>
                        <p className="text-xs text-emerald-600 mt-1">
                            Arus keluar kas fisik warung
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-gradient-to-br from-purple-50 to-indigo-50 border-l-4 border-purple-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-purple-800">Pengeluaran QRIS / Bank</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900">Rp {formatNumber(totalQrisExpense)}</div>
                        <p className="text-xs text-purple-600 mt-1">
                            Arus keluar saldo non-tunai
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Expenses List */}
            <Card className="border-none shadow-sm">
                <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle className="text-lg font-bold">Riwayat Pengeluaran</CardTitle>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Cari pengeluaran..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
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
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                                        {exp.category}
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
                                            category: "Operational",
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
                                <option value="Operational">Operasional</option>
                                <option value="Marketing">Pemasaran</option>
                                <option value="Maintenance">Pemeliharaan</option>
                                <option value="Salary">Gaji</option>
                                <option value="Other">Lainnya</option>
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
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">Deskripsi / Catatan (Opsional)</label>
                        <Input
                            placeholder="Detail pembelian, kuantiti, supplier, dll..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    )
}
