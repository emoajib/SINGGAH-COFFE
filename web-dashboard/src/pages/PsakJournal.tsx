import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Dialog } from "../components/ui/dialog"
import {
    Plus, Loader2, Trash2, BookOpen, Send, Ban, Eye,
    Filter, RefreshCw, FileText, AlertCircle, CheckCircle2,
} from "lucide-react"
import { PSAKService, type JournalEntry, type PSAKAccount } from "../services/psakService"
import { useToast } from "../hooks/use-toast"
import { formatCurrency, formatDateTime } from "../lib/utils"

interface JournalItemForm {
    account_id: number | null
    debit: number
    credit: number
    description: string
}

interface JournalForm {
    date: string
    description: string
    source_type: string
    items: JournalItemForm[]
}

const EMPTY_ITEM: JournalItemForm = { account_id: null, debit: 0, credit: 0, description: "" }

const STATUS_LABELS: Record<string, string> = {
    draft: "Draft",
    posted: "Posted",
    voided: "Voided",
}

const SOURCE_LABELS: Record<string, string> = {
    manual: "Manual",
    order: "Order",
    expense: "Pengeluaran",
}

export default function PsakJournal() {
    const { toast } = useToast()

    // Data
    const [journals, setJournals] = useState<JournalEntry[]>([])
    const [accounts, setAccounts] = useState<PSAKAccount[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    // Filters
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [statusFilter, setStatusFilter] = useState("")

    // Create Dialog
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [form, setForm] = useState<JournalForm>({
        date: new Date().toISOString().split("T")[0],
        description: "",
        source_type: "manual",
        items: [{ ...EMPTY_ITEM }, { ...EMPTY_ITEM }],
    })

    // View Dialog
    const [isViewOpen, setIsViewOpen] = useState(false)
    const [viewingJournal, setViewingJournal] = useState<JournalEntry | null>(null)

    // Void confirm
    const [voidingId, setVoidingId] = useState<number | null>(null)

    const fetchJournals = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await PSAKService.getJournals(
                statusFilter || undefined,
                startDate || undefined,
                endDate || undefined,
            )
            setJournals(data)
        } catch {
            toast({ title: "Gagal", description: "Gagal memuat data jurnal", variant: "error" })
        } finally {
            setIsLoading(false)
        }
    }, [statusFilter, startDate, endDate])

    useEffect(() => { fetchJournals() }, [fetchJournals])

    useEffect(() => {
        PSAKService.getAccounts(undefined, true).then(setAccounts).catch(() => {})
    }, [])

    const totalDebit = form.items.reduce((s, i) => s + (i.debit || 0), 0)
    const totalCredit = form.items.reduce((s, i) => s + (i.credit || 0), 0)
    const isBalanced = totalDebit === totalCredit && totalDebit > 0

    const openCreate = () => {
        setForm({
            date: new Date().toISOString().split("T")[0],
            description: "",
            source_type: "manual",
            items: [{ ...EMPTY_ITEM }, { ...EMPTY_ITEM }],
        })
        setIsCreateOpen(true)
    }

    const openView = (j: JournalEntry) => {
        setViewingJournal(j)
        setIsViewOpen(true)
    }

    const updateItem = (idx: number, field: keyof JournalItemForm, value: string | number | null) => {
        setForm((prev) => {
            const items = [...prev.items]
            items[idx] = { ...items[idx], [field]: value }
            return { ...prev, items }
        })
    }

    const addItem = () => {
        setForm((prev) => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }))
    }

    const removeItem = (idx: number) => {
        setForm((prev) => {
            if (prev.items.length <= 2) return prev
            return { ...prev, items: prev.items.filter((_, i) => i !== idx) }
        })
    }

    const handleSave = async () => {
        if (!form.description.trim()) {
            toast({ title: "Validasi", description: "Deskripsi wajib diisi", variant: "error" })
            return
        }
        const validItems = form.items.filter((i) => i.account_id && (i.debit > 0 || i.credit > 0))
        if (validItems.length < 2) {
            toast({ title: "Validasi", description: "Minimal 2 baris jurnal (debit & kredit)", variant: "error" })
            return
        }
        if (!isBalanced) {
            toast({ title: "Validasi", description: "Total debit dan kredit harus seimbang", variant: "error" })
            return
        }
        setIsSaving(true)
        try {
            await PSAKService.createJournal({
                date: form.date,
                description: form.description,
                source_type: form.source_type,
                items: validItems.map((i) => ({
                    account_id: i.account_id!,
                    account_code: "",
                    account_name: "",
                    debit: i.debit,
                    credit: i.credit,
                    description: i.description,
                })),
            })
            toast({ title: "Berhasil", description: "Jurnal berhasil dibuat", variant: "success" })
            setIsCreateOpen(false)
            fetchJournals()
        } catch (e: any) {
            toast({ title: "Gagal", description: e.response?.data?.error || "Gagal menyimpan jurnal", variant: "error" })
        } finally {
            setIsSaving(false)
        }
    }

    const handlePost = async (id: number) => {
        try {
            await PSAKService.postJournal(id)
            toast({ title: "Berhasil", description: "Jurnal berhasil di-posting", variant: "success" })
            fetchJournals()
        } catch (e: any) {
            toast({ title: "Gagal", description: e.response?.data?.error || "Gagal posting jurnal", variant: "error" })
        }
    }

    const handleVoid = async (id: number) => {
        setVoidingId(null)
        try {
            await PSAKService.voidJournal(id)
            toast({ title: "Berhasil", description: "Jurnal berhasil dibatalkan (void)", variant: "success" })
            fetchJournals()
        } catch (e: any) {
            toast({ title: "Gagal", description: e.response?.data?.error || "Gagal membatalkan jurnal", variant: "error" })
        }
    }

    return (
        <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-emerald-600" />
                        Jurnal Umum
                    </h1>
                    <p className="text-gray-500 mt-1">Catat dan kelola entri jurnal pembukuan PSAK.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchJournals} disabled={isLoading}>
                        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                    <Button size="sm" className="gap-1.5" onClick={openCreate}>
                        <Plus className="w-4 h-4" /> Buat Jurnal
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="border-none shadow-xl glass-panel overflow-hidden">
                <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-3 items-end">
                        <div className="space-y-1">
                            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Dari Tanggal</label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Sampai Tanggal</label>
                            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Status</label>
                            <select
                                className="flex h-10 w-36 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">Semua Status</option>
                                <option value="draft">Draft</option>
                                <option value="posted">Posted</option>
                                <option value="voided">Voided</option>
                            </select>
                        </div>
                        {(startDate || endDate || statusFilter) && (
                            <Button variant="outline" size="sm" onClick={() => { setStartDate(""); setEndDate(""); setStatusFilter("") }} className="gap-1">
                                <Filter className="w-3.5 h-3.5" /> Hapus Filter
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Journal Table */}
            <Card className="border-none shadow-xl glass-panel overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-lg font-bold">Daftar Jurnal</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : journals.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                            <p>Belum ada entri jurnal</p>
                            <p className="text-xs text-gray-400 mt-1">Klik "Buat Jurnal" untuk menambahkan entri baru</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">No. Jurnal</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Tanggal</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Deskripsi</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Status</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total Debet</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total Kredit</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {journals.map((j) => (
                                        <tr key={j.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs font-bold text-gray-900">{j.entry_number}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDateTime(j.date)}</td>
                                            <td className="px-4 py-3 max-w-[240px] truncate text-gray-700">{j.description}</td>
                                            <td className="px-4 py-3">
                                                <StatusBadge status={j.status} />
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(j.total_debit)}</td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(j.total_credit)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openView(j)} title="Lihat Detail">
                                                        <Eye className="w-4 h-4 text-gray-500 hover:text-blue-600" />
                                                    </Button>
                                                    {j.status === "draft" && (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePost(j.id)} title="Posting Jurnal">
                                                                <Send className="w-4 h-4 text-emerald-600 hover:text-emerald-700" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setVoidingId(j.id)} title="Batalkan Jurnal">
                                                                <Ban className="w-4 h-4 text-red-500 hover:text-red-700" />
                                                            </Button>
                                                        </>
                                                    )}
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

            {/* Create Journal Dialog */}
            <Dialog
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                title="Buat Jurnal Baru"
                description="Isi data jurnal dan baris entri di bawah ini."
                footer={
                    <>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Batal</Button>
                        <Button onClick={handleSave} disabled={isSaving || !isBalanced}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Simpan Jurnal"}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Tanggal</label>
                            <Input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Sumber</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={form.source_type}
                                onChange={(e) => setForm((p) => ({ ...p, source_type: e.target.value }))}
                            >
                                <option value="manual">Manual</option>
                                <option value="order">Order</option>
                                <option value="expense">Pengeluaran</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Deskripsi</label>
                        <Input placeholder="Deskripsi jurnal..." value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
                    </div>

                    {/* Items Table */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Baris Entri Jurnal</label>
                            <Button variant="outline" size="sm" onClick={addItem} className="gap-1 h-7 text-xs">
                                <Plus className="w-3 h-3" /> Tambah Baris
                            </Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 w-[40%]">Akun</th>
                                        <th className="px-2 py-2 text-right text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Debet</th>
                                        <th className="px-2 py-2 text-right text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Kredit</th>
                                        <th className="px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Keterangan</th>
                                        <th className="px-2 py-2 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {form.items.map((item, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="px-2 py-1.5">
                                                <select
                                                    className="w-full rounded border border-gray-200 bg-white px-2 py-1.5 text-xs"
                                                    value={item.account_id ?? ""}
                                                    onChange={(e) => updateItem(idx, "account_id", e.target.value ? Number(e.target.value) : null)}
                                                >
                                                    <option value="">Pilih Akun</option>
                                                    {accounts.map((a) => (
                                                        <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="h-7 text-xs text-right"
                                                    value={item.debit || ""}
                                                    onChange={(e) => updateItem(idx, "debit", Number(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    className="h-7 text-xs text-right"
                                                    value={item.credit || ""}
                                                    onChange={(e) => updateItem(idx, "credit", Number(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <Input
                                                    className="h-7 text-xs"
                                                    placeholder="Ket..."
                                                    value={item.description}
                                                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                                                />
                                            </td>
                                            <td className="px-2 py-1.5 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6"
                                                    onClick={() => removeItem(idx)}
                                                    disabled={form.items.length <= 2}
                                                >
                                                    <Trash2 className="w-3 h-3 text-gray-400 hover:text-red-500" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50 font-bold">
                                        <td className="px-2 py-2 text-xs text-right">Total</td>
                                        <td className="px-2 py-2 text-right text-xs">{formatCurrency(totalDebit)}</td>
                                        <td className="px-2 py-2 text-right text-xs">{formatCurrency(totalCredit)}</td>
                                        <td colSpan={2} className="px-2 py-2 text-right">
                                            {isBalanced ? (
                                                <span className="text-emerald-600 flex items-center justify-end gap-1 text-xs">
                                                    <CheckCircle2 className="w-3 h-3" /> Seimbang
                                                </span>
                                            ) : (
                                                <span className="text-red-500 flex items-center justify-end gap-1 text-xs">
                                                    <AlertCircle className="w-3 h-3" /> Tidak Seimbang
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            </Dialog>

            {/* View Journal Detail Dialog */}
            <Dialog
                isOpen={isViewOpen}
                onClose={() => setIsViewOpen(false)}
                title={`Detail Jurnal — ${viewingJournal?.entry_number ?? ""}`}
                footer={<Button variant="outline" onClick={() => setIsViewOpen(false)}>Tutup</Button>}
            >
                {viewingJournal && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">Tanggal</span>
                                <span className="font-medium text-gray-900">{formatDateTime(viewingJournal.date)}</span>
                            </div>
                            <div>
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">Status</span>
                                <StatusBadge status={viewingJournal.status} />
                            </div>
                            <div className="col-span-2">
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">Deskripsi</span>
                                <span className="text-gray-700">{viewingJournal.description}</span>
                            </div>
                            <div>
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 block mb-1">Sumber</span>
                                <span className="text-gray-600">{SOURCE_LABELS[viewingJournal.source_type] || viewingJournal.source_type}</span>
                            </div>
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Akun</th>
                                        <th className="px-3 py-2 text-right text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Debet</th>
                                        <th className="px-3 py-2 text-right text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Kredit</th>
                                        <th className="px-3 py-2 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {viewingJournal.items.map((item) => (
                                        <tr key={item.id} className="border-t">
                                            <td className="px-3 py-2">
                                                <div className="font-mono font-bold text-gray-900">{item.account_code}</div>
                                                <div className="text-gray-500">{item.account_name}</div>
                                            </td>
                                            <td className="px-3 py-2 text-right font-bold text-gray-900">{item.debit > 0 ? formatCurrency(item.debit) : "-"}</td>
                                            <td className="px-3 py-2 text-right font-bold text-gray-900">{item.credit > 0 ? formatCurrency(item.credit) : "-"}</td>
                                            <td className="px-3 py-2 text-gray-500">{item.description}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-50 font-bold">
                                        <td className="px-3 py-2 text-right text-xs">Total</td>
                                        <td className="px-3 py-2 text-right text-xs">{formatCurrency(viewingJournal.total_debit)}</td>
                                        <td className="px-3 py-2 text-right text-xs">{formatCurrency(viewingJournal.total_credit)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </Dialog>

            {/* Void Confirmation Dialog */}
            <Dialog
                isOpen={voidingId !== null}
                onClose={() => setVoidingId(null)}
                title="Batalkan Jurnal?"
                description="Jurnal yang sudah di-void tidak dapat dikembalikan ke status draft."
                footer={
                    <>
                        <Button variant="outline" onClick={() => setVoidingId(null)}>Batal</Button>
                        <Button variant="destructive" onClick={() => voidingId && handleVoid(voidingId)}>
                            Ya, Batalkan
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-gray-600">
                    Anda yakin ingin membatalkan jurnal ini? Tindakan ini tidak dapat dibatalkan.
                </p>
            </Dialog>
        </div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        draft: "bg-yellow-100 text-yellow-800 border-yellow-200",
        posted: "bg-emerald-100 text-emerald-800 border-emerald-200",
        voided: "bg-red-100 text-red-800 border-red-200",
    }
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
            {STATUS_LABELS[status] || status}
        </span>
    )
}
