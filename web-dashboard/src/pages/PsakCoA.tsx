import React, { useState, useEffect, useCallback } from "react"
import {
    BookOpen,
    Plus,
    Search,
    Loader2,
    Trash2,
    Pencil,
    Database,
    Filter,
    ChevronDown,
    AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Dialog } from "../components/ui/dialog"
import { EmptyState } from "../components/ui/empty-state"
import { TableSkeleton } from "../components/ui/table-skeleton"
import { useToast } from "../hooks/use-toast"
import { PSAKService, type PSAKAccount } from "../services/psakService"

const ACCOUNT_TYPES = [
    { value: "Asset", label: "Aset (Asset)" },
    { value: "Liability", label: "Kewajiban (Liability)" },
    { value: "Equity", label: "Ekuitas (Equity)" },
    { value: "Revenue", label: "Pendapatan (Revenue)" },
    { value: "Expense", label: "Beban (Expense)" },
] as const

const TYPE_BADGE_CLASSES: Record<string, string> = {
    Asset: "bg-blue-100 text-blue-700 border-blue-200",
    Liability: "bg-red-100 text-red-700 border-red-200",
    Equity: "bg-purple-100 text-purple-700 border-purple-200",
    Revenue: "bg-green-100 text-green-700 border-green-200",
    Expense: "bg-orange-100 text-orange-700 border-orange-200",
}

interface AccountForm {
    code: string
    name: string
    type: string
    parent_id: number | null
    description: string
}

const EMPTY_FORM: AccountForm = { code: "", name: "", type: "Asset", parent_id: null, description: "" }

const PsakCoA: React.FC = () => {
    const { toast } = useToast()
    const [accounts, setAccounts] = useState<PSAKAccount[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterType, setFilterType] = useState<string>("")
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<PSAKAccount | null>(null)
    const [deletingAccount, setDeletingAccount] = useState<PSAKAccount | null>(null)
    const [form, setForm] = useState<AccountForm>(EMPTY_FORM)
    const [isSaving, setIsSaving] = useState(false)
    const [isSeeding, setIsSeeding] = useState(false)
    const fetchAccounts = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await PSAKService.getAccounts(filterType || undefined, undefined)
            setAccounts(data)
        } catch {
            toast({ title: "Gagal memuat data akun", variant: "error" })
        } finally {
            setIsLoading(false)
        }
    }, [filterType, toast])

    useEffect(() => {
        fetchAccounts()
    }, [fetchAccounts])

    const filteredAccounts = accounts.filter((a) => {
        const q = searchQuery.toLowerCase()
        return (
            a.code.toLowerCase().includes(q) ||
            a.name.toLowerCase().includes(q)
        )
    })
    const openCreateDialog = () => {
        setEditingAccount(null)
        setForm(EMPTY_FORM)
        setIsFormOpen(true)
    }

    const openEditDialog = (account: PSAKAccount) => {
        setEditingAccount(account)
        setForm({
            code: account.code,
            name: account.name,
            type: account.type,
            parent_id: account.parent_id,
            description: account.description || "",
        })
        setIsFormOpen(true)
    }

    const openDeleteDialog = (account: PSAKAccount) => {
        setDeletingAccount(account)
        setIsDeleteOpen(true)
    }

    const handleSave = async () => {
        if (!form.code.trim() || !form.name.trim()) {
            toast({ title: "Kode dan nama akun wajib diisi", variant: "warning" })
            return
        }
        setIsSaving(true)
        try {
            if (editingAccount) {
                await PSAKService.updateAccount(editingAccount.id, form)
                toast({ title: "Akun berhasil diperbarui", variant: "success" })
            } else {
                await PSAKService.createAccount(form)
                toast({ title: "Akun berhasil ditambahkan", variant: "success" })
            }
            setIsFormOpen(false)
            fetchAccounts()
        } catch (err: any) {
            const msg = err?.response?.data?.error || "Gagal menyimpan akun"
            toast({ title: msg, variant: "error" })
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deletingAccount) return
        try {
            await PSAKService.deleteAccount(deletingAccount.id)
            toast({ title: "Akun berhasil dihapus", variant: "success" })
            setIsDeleteOpen(false)
            setDeletingAccount(null)
            fetchAccounts()
        } catch (err: any) {
            const msg = err?.response?.data?.error || "Gagal menghapus akun"
            toast({ title: msg, variant: "error" })
        }
    }

    const handleSeed = async () => {
        setIsSeeding(true)
        try {
            const result = await PSAKService.seedAccounts()
            toast({ title: `${result.count} akun default berhasil dimuat`, variant: "success" })
            fetchAccounts()
        } catch (err: any) {
            const msg = err?.response?.data?.error || "Gagal memuat akun default"
            toast({ title: msg, variant: "error" })
        } finally {
            setIsSeeding(false)
        }
    }
    return (
        <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-primary" />
                        Buku Besar
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                        Chart of Accounts — Standar PSAK
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="font-bold border-primary text-primary hover:bg-primary/5"
                        onClick={handleSeed}
                        disabled={isSeeding}
                    >
                        {isSeeding ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Database className="w-4 h-4 mr-2" />
                        )}
                        Seed Default
                    </Button>
                    <Button size="sm" className="font-bold" onClick={openCreateDialog}>
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Akun
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="border-none shadow-xl glass-panel overflow-hidden">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Cari kode atau nama akun..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 bg-white"
                            />
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="h-10 w-full sm:w-48 rounded-md border border-input bg-white pl-9 pr-8 py-2 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">Semua Tipe</option>
                                {ACCOUNT_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Accounts Table */}
            <Card className="border-none shadow-xl glass-panel overflow-hidden">
                <CardHeader className="border-b border-white/20 bg-white/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                Daftar Akun
                            </CardTitle>
                            <CardDescription>
                                {filteredAccounts.length} akun ditemukan
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6">
                            <TableSkeleton rows={5} columns={4} />
                        </div>
                    ) : filteredAccounts.length === 0 ? (
                        <EmptyState
                            icon={BookOpen}
                            title="Belum ada akun"
                            description="Mulai dengan menambahkan akun baru atau memuat akun default PSAK."
                            action={
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={handleSeed} disabled={isSeeding}>
                                        <Database className="w-4 h-4 mr-2" />
                                        Seed Default
                                    </Button>
                                    <Button size="sm" onClick={openCreateDialog}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Tambah Akun
                                    </Button>
                                </div>
                            }
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/20 bg-white/20">
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                            Kode
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                            Nama Akun
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                            Tipe
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                            Aksi
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/10">
                                    {filteredAccounts.map((account) => (
                                        <tr
                                            key={account.id}
                                            className="hover:bg-white/30 transition-colors"
                                        >
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-sm font-bold text-gray-900">
                                                    {account.code}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-semibold text-gray-700">
                                                    {account.name}
                                                </span>
                                                {account.description && (
                                                    <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                                                        {account.description}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TYPE_BADGE_CLASSES[account.type] || "bg-gray-100 text-gray-600 border-gray-200"}`}
                                                >
                                                    {account.type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 text-xs font-bold ${account.is_active ? "text-green-600" : "text-gray-400"}`}
                                                >
                                                    <span
                                                        className={`w-1.5 h-1.5 rounded-full ${account.is_active ? "bg-green-500" : "bg-gray-300"}`}
                                                    />
                                                    {account.is_active ? "Aktif" : "Nonaktif"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-400 hover:text-blue-600"
                                                        onClick={() => openEditDialog(account)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                                                        onClick={() => openDeleteDialog(account)}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add / Edit Dialog */}
            <Dialog
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={editingAccount ? "Edit Akun" : "Tambah Akun Baru"}
                description="Isi data akun sesuai standar PSAK."
                footer={
                    <>
                        <Button variant="outline" size="sm" onClick={() => setIsFormOpen(false)}>
                            Batal
                        </Button>
                        <Button size="sm" onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingAccount ? "Simpan Perubahan" : "Tambah Akun"}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Kode Akun *</label>
                            <Input
                                placeholder="e.g. 1101"
                                value={form.code}
                                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                                className="h-10"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700">Tipe Akun *</label>
                            <div className="relative">
                                <select
                                    value={form.type}
                                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                                >
                                    {ACCOUNT_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Nama Akun *</label>
                        <Input
                            placeholder="e.g. Kas"
                            value={form.name}
                            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                            className="h-10"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Induk Akun</label>
                        <div className="relative">
                            <select
                                value={form.parent_id ?? ""}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        parent_id: e.target.value ? Number(e.target.value) : null,
                                    }))
                                }
                                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                                <option value="">— Tidak ada induk —</option>
                                {accounts
                                    .filter((a) => a.id !== editingAccount?.id)
                                    .map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.code} — {a.name}
                                        </option>
                                    ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Deskripsi</label>
                        <Input
                            placeholder="Deskripsi singkat akun..."
                            value={form.description}
                            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                            className="h-10"
                        />
                    </div>
                </div>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                title="Hapus Akun"
                description="Tindakan ini tidak dapat dibatalkan."
                footer={
                    <>
                        <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)}>
                            Batal
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleDelete}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Hapus
                        </Button>
                    </>
                }
            >
                {deletingAccount && (
                    <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-red-800">
                                Yakin ingin menghapus akun ini?
                            </p>
                            <p className="text-sm text-red-600 mt-1">
                                <span className="font-mono font-bold">{deletingAccount.code}</span> —{" "}
                                {deletingAccount.name}
                            </p>
                            <p className="text-xs text-red-400 mt-2">
                                Akun yang sudah memiliki transaksi tidak dapat dihapus.
                            </p>
                        </div>
                    </div>
                )}
            </Dialog>
        </div>
    )
}

export default PsakCoA
