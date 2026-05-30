import { useState } from "react"
import { useSelector } from "react-redux"
import { RootState } from "../store"
import type { Expense } from "../types"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Dialog } from "../components/ui/dialog"
import { Search, Plus, Loader2, Trash2, Receipt, Pencil } from "lucide-react"
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from "../hooks/useExpenses"
import { useToast } from "../hooks/use-toast"
import { formatNumber } from "../lib/utils"

export default function Expenses() {
    const [search, setSearch] = useState("")

    // Auth Check
    const { user } = useSelector((state: RootState) => state.auth)
    const canEdit = user?.role === 'owner' || user?.role === 'manager'

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

    // Form State
    const [formData, setFormData] = useState<Partial<Expense>>({
        title: "",
        amount: 0,
        category: "Operational",
        description: "",
        date: new Date().toISOString().split('T')[0]
    })

    const { toast } = useToast()
    const { data: expenses = [], isFetching: isLoading, refetch } = useExpenses()
    const createExpense = useCreateExpense()
    const updateExpense = useUpdateExpense()
    const deleteExpense = useDeleteExpense()

    const handleOpenAdd = () => {
        setEditingExpense(null)
        setFormData({
            title: "",
            amount: 0,
            category: "Operational",
            description: "",
            date: new Date().toISOString().split('T')[0]
        })
        setIsModalOpen(true)
    }

    const handleOpenEdit = (exp: Expense) => {
        setEditingExpense(exp)
        setFormData({
            title: exp.title,
            amount: exp.amount,
            category: exp.category,
            description: exp.description,
            date: new Date(exp.date).toISOString().split('T')[0]
        })
        setIsModalOpen(true)
    }

    const handleSave = async () => {
        try {
            if (editingExpense) {
                await updateExpense.mutateAsync({ id: editingExpense.ID, ...formData })
                toast({ title: "Success", description: "Expense updated", variant: "success" })
            } else {
                await createExpense.mutateAsync(formData)
                toast({ title: "Success", description: "Expense created", variant: "success" })
            }
            setIsModalOpen(false)
        } catch (e: any) {
            toast({ 
                title: "Error", 
                description: e.response?.data?.error || "Failed to save expense", 
                variant: "error" 
            })
        }
    }

    const handleDeleteExpense = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this expense?")) return
        try {
            await deleteExpense.mutateAsync(id)
            toast({ title: "Success", description: "Expense deleted", variant: "success" })
        } catch (e: any) {
            toast({ 
                title: "Error", 
                description: e.response?.data?.error || "Failed to delete expense", 
                variant: "error" 
            })
        }
    }

    const filteredExpenses = expenses.filter(exp =>
        exp.title.toLowerCase().includes(search.toLowerCase()) ||
        exp.category.toLowerCase().includes(search.toLowerCase())
    )

    const totalExpenseAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Pelacakan Pengeluaran</h1>
                    <p className="text-gray-500">Kelola biaya operasional dan pengeluaran Anda.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Segarkan"}
                    </Button>
                    {canEdit && (
                        <Button className="gap-2" onClick={handleOpenAdd}>
                            <Plus className="w-4 h-4" /> Tambah Pengeluaran
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Pengeluaran</CardTitle>
                        <Receipt className="w-4 h-4 text-gray-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">Rp {formatNumber(totalExpenseAmount)}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Expenses Table */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle>Pengeluaran Terbaru</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Cari pengeluaran..."
                                className="pl-9 h-9"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3">Tanggal</th>
                                    <th className="px-6 py-3">Judul</th>
                                    <th className="px-6 py-3">Kategori</th>
                                    <th className="px-6 py-3">Jumlah</th>
                                    <th className="px-6 py-3 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExpenses.map((exp) => (
                                    <tr key={exp.ID} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {new Date(exp.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-semibold text-gray-900">{exp.title}</div>
                                                <div className="text-xs text-gray-500">{exp.description}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-600 font-medium">
                                                {exp.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-red-600">
                                            Rp {formatNumber(exp.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {canEdit && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleOpenEdit(exp)}
                                                        className="text-primary hover:bg-primary/5"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                )}
                                                {user?.role === 'owner' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteExpense(exp.ID)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredExpenses.length === 0 && !isLoading && (
                            <div className="text-center py-8 text-gray-500">
                                No expenses recorded.
                            </div>
                        )}
                    </div>
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
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Judul</label>
                        <Input
                            placeholder="cth. Tagihan Listrik, Sewa, Wi-Fi"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Jumlah (Rp)</label>
                            <Input
                                type="number"
                                value={formData.amount || ''}
                                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Kategori</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Tanggal</label>
                        <Input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Deskripsi</label>
                        <Input
                            placeholder="Detail opsional..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    )
}
