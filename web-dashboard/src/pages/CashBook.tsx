import { useState } from "react"
import { useSelector } from "react-redux"
import { RootState } from "../store"
import type { CashBook } from "../types"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Dialog } from "../components/ui/dialog"
import { Search, Plus, Loader2, Trash2, Pencil, Wallet, TrendingUp, TrendingDown, Filter, RefreshCw } from "lucide-react"
import { useCashBook } from "../hooks/useCashBook"
import { useToast } from "../hooks/use-toast"
import { formatNumber } from "../lib/utils"

export default function CashBookPage() {
  const { user } = useSelector((state: RootState) => state.auth)
  const [search, setSearch] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [methodFilter, setMethodFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")

  const { items, isLoading, refetch, createMut, updateMut, deleteMut, syncMut } = useCashBook({
    start: startDate || undefined,
    end: endDate || undefined,
    method: methodFilter || undefined,
    type: typeFilter || undefined,
  })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<CashBook | null>(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    method: 'Cash' as 'Cash' | 'QRIS' | 'Lainnya',
    type: 'income' as 'income' | 'expense',
    amount: 0,
    description: '',
    reference: '',
  })

  const { toast } = useToast()

  const filtered = items.filter((it) =>
    it.description.toLowerCase().includes(search.toLowerCase()) ||
    it.method.toLowerCase().includes(search.toLowerCase())
  )

  const totalIncome = items.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0)
  const totalExpense = items.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0)

  const openAdd = () => {
    setEditing(null)
    setFormData({
      date: new Date().toISOString().split('T')[0],
      method: 'Cash',
      type: 'income',
      amount: 0,
      description: '',
      reference: '',
    })
    setIsModalOpen(true)
  }

  const openEdit = (it: CashBook) => {
    setEditing(it)
    setFormData({
      date: it.date.split('T')[0],
      method: it.method,
      type: it.type,
      amount: it.amount,
      description: it.description,
      reference: it.reference,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, d: formData })
        toast({ title: "Berhasil", description: "Entri Buku Kas diperbarui", variant: "success" })
      } else {
        await createMut.mutateAsync(formData)
        toast({ title: "Berhasil", description: "Entri Buku Kas ditambahkan", variant: "success" })
      }
      setIsModalOpen(false)
    } catch (e: any) {
      toast({ title: "Gagal", description: e.response?.data?.error || "Gagal menyimpan", variant: "error" })
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm("Hapus entri Buku Kas ini?")) return
    try {
      await deleteMut.mutateAsync(id)
      toast({ title: "Berhasil", description: "Entri dihapus", variant: "success" })
    } catch (e: any) {
      toast({ title: "Gagal", description: e.response?.data?.error || "Gagal menghapus", variant: "error" })
    }
  }

  const handleSync = async () => {
    try {
      const res = await syncMut.mutateAsync()
      toast({ title: "Sinkron selesai", description: res.message, variant: "success" })
    } catch (e: any) {
      toast({ title: "Gagal", description: e.response?.data?.error || "Gagal sinkronisasi", variant: "error" })
    }
  }

  if (user?.role !== 'owner') {
    return (
      <div className="space-y-6">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900">Buku Kas</h1>
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Akses ditolak: hanya pemilik yang dapat mengelola Buku Kas.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Buku Kas</h1>
          <p className="text-gray-500">Catat arus kas masuk & keluar (Cash / QRIS / Lainnya).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Segarkan"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncMut.isPending} className="gap-1">
            {syncMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sinkron Transaksi
          </Button>
          <Button size="sm" className="gap-1 sm:gap-2" onClick={openAdd}>
            <Plus className="w-4 h-4" /> Tambah Entri
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="border-none shadow-sm">
        <CardContent className="pt-0 pb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Tanggal Mulai</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-48" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Tanggal Selesai</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-48" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Metode</label>
              <select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}
                className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Semua</option>
                <option value="Cash">Cash</option>
                <option value="QRIS">QRIS</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Tipe</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
                className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Semua</option>
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </select>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setStartDate(""); setEndDate(""); setMethodFilter(""); setTypeFilter("") }}>
              <Filter className="w-4 h-4 mr-1" /> Hapus Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Pemasukan</CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600">Rp {formatNumber(totalIncome)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Pengeluaran</CardTitle>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">Rp {formatNumber(totalExpense)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Saldo Buku Kas</CardTitle>
            <Wallet className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-600">Rp {formatNumber(totalIncome - totalExpense)}</div></CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Riwayat Buku Kas</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <Input placeholder="Cari..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Metode</th>
                  <th className="px-6 py-3">Tipe</th>
                  <th className="px-6 py-3">Deskripsi</th>
                  <th className="px-6 py-3">Jumlah</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => (
                  <tr key={it.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{new Date(it.date).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-600 font-medium">{it.method}</span></td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${it.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {it.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{it.description}</td>
                    <td className={`px-6 py-4 font-bold ${it.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                      Rp {formatNumber(it.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(it)} className="text-primary hover:bg-primary/5">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(it.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                Belum ada entri Buku Kas.
                <div className="text-xs text-gray-400 mt-1">
                  Klik "Sinkron Transaksi" untuk menarik otomatis seluruh penjualan lunas &amp; pengeluaran, atau tambah entri manual.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? "Edit Entri Buku Kas" : "Tambah Entri Buku Kas"}
        footer={
          <>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave}>{editing ? "Simpan Perubahan" : "Simpan"}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tanggal</label>
              <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Jumlah</label>
              <Input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Metode</label>
              <select value={formData.method} onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="Cash">Cash</option>
                <option value="QRIS">QRIS</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipe</label>
              <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Deskripsi</label>
            <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="cth. Setoran harian, Biaya operasional" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Referensi (opsional)</label>
            <Input value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} placeholder="cth. order_id, expense_id" />
          </div>
        </div>
      </Dialog>
    </div>
  )
}
