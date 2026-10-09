import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Badge } from "../../components/ui/badge"
import { Plus, Edit, Trash2, Loader2, Save, X, ArrowUp, ArrowDown } from "lucide-react"
import { ProfitSharingService } from "../../services/profitSharingService"
import { useToast } from "../../hooks/use-toast"
import { useSettings } from "../../hooks/useSettings"
import type { ShiftConfig } from "../../types"

interface ShiftConfigSettingsProps {
    saving: boolean;
}

export function ShiftConfigSettings({ saving }: ShiftConfigSettingsProps) {
    const { toast } = useToast()
    const { data: settings } = useSettings()
    const outletId = settings?.outlet_id ? Number(settings.outlet_id) : 1
    const [shifts, setShifts] = useState<ShiftConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingShift, setEditingShift] = useState<ShiftConfig | null>(null)
    const [formName, setFormName] = useState("")
    const [formKode, setFormKode] = useState("")
    const [formStartTime, setFormStartTime] = useState("07:00")
    const [formEndTime, setFormEndTime] = useState("15:00")
    const [formOwnerPct, setFormOwnerPct] = useState(60)
    const [formBaristaPoolPct, setFormBaristaPoolPct] = useState(40)
    const [formIsActive, setFormIsActive] = useState(true)
    const [formSortOrder, setFormSortOrder] = useState(0)
    const [submitting, setSubmitting] = useState(false)

    const fetchShifts = async () => {
        try {
            const data = await ProfitSharingService.getShiftConfigs()
            setShifts(data.sort((a, b) => a.sort_order - b.sort_order))
        } catch (e) {
            toast({ title: "Error", description: "Gagal memuat konfigurasi shift", variant: "error" })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchShifts()
    }, [])

    const openCreateModal = () => {
        setEditingShift(null)
        setFormName("")
        setFormKode("")
        setFormStartTime("07:00")
        setFormEndTime("15:00")
        setFormOwnerPct(60)
        setFormBaristaPoolPct(40)
        setFormIsActive(true)
        setFormSortOrder(shifts.length)
        setShowModal(true)
    }

    const openEditModal = (shift: ShiftConfig) => {
        setEditingShift(shift)
        setFormName(shift.name)
        setFormKode(shift.kode || "")
        setFormStartTime(shift.start_time.slice(0, 5))
        setFormEndTime(shift.end_time.slice(0, 5))
        setFormOwnerPct(shift.owner_pct)
        setFormBaristaPoolPct(shift.barista_pool_pct)
        setFormIsActive(shift.is_active)
        setFormSortOrder(shift.sort_order)
        setShowModal(true)
    }

    const closeModal = () => {
        setShowModal(false)
        setEditingShift(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formName.trim()) {
            toast({ title: "Error", description: "Nama shift wajib diisi", variant: "error" })
            return
        }
        if (formOwnerPct + formBaristaPoolPct !== 100) {
            toast({ title: "Error", description: "Owner % + Barista Pool % harus total 100%", variant: "error" })
            return
        }
        // Allow overnight shifts (end_time < start_time means crosses midnight)
        // Only reject if exactly equal (zero duration)
        if (formStartTime === formEndTime) {
            toast({ title: "Error", description: "Jam mulai dan jam selesai tidak boleh sama (durasi nol)", variant: "error" })
            return
        }

        setSubmitting(true)
        try {
            const payload = {
                outlet_id: outletId,
                name: formName.trim(),
                kode: formKode.trim(),
                start_time: formStartTime,
                end_time: formEndTime,
                owner_pct: formOwnerPct,
                barista_pool_pct: formBaristaPoolPct,
                is_active: formIsActive,
                sort_order: formSortOrder,
            }

            if (editingShift) {
                await ProfitSharingService.updateShiftConfig(editingShift.id, payload)
                toast({ title: "Berhasil", description: "Shift diperbarui", variant: "success" })
            } else {
                await ProfitSharingService.createShiftConfig(payload)
                toast({ title: "Berhasil", description: "Shift ditambahkan", variant: "success" })
            }
            closeModal()
            fetchShifts()
        } catch (err: any) {
            toast({ title: "Error", description: err?.response?.data?.error || "Gagal menyimpan shift", variant: "error" })
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!window.confirm("Hapus shift ini? Barista yang sudah memilih shift ini akan jadi 'Tanpa Shift'.")) return
        try {
            await ProfitSharingService.deleteShiftConfig(id)
            toast({ title: "Berhasil", description: "Shift dihapus", variant: "success" })
            fetchShifts()
        } catch (err: any) {
            toast({ title: "Error", description: err?.response?.data?.error || "Gagal menghapus shift", variant: "error" })
        }
    }

    const moveShift = async (id: number, direction: 'up' | 'down') => {
        const idx = shifts.findIndex(s => s.id === id)
        if (idx === -1) return
        const newIdx = direction === 'up' ? idx - 1 : idx + 1
        if (newIdx < 0 || newIdx >= shifts.length) return

        const newShifts = [...shifts]
        const [moved] = newShifts.splice(idx, 1)
        newShifts.splice(newIdx, 0, moved)

        const updated = newShifts.map((s, i) => ({ ...s, sort_order: i }))
        setShifts(updated)

        try {
            for (const s of updated) {
                await ProfitSharingService.updateShiftConfig(s.id, { sort_order: s.sort_order })
            }
        } catch (err: any) {
            toast({ title: "Error", description: "Gagal mengupdate urutan", variant: "error" })
            fetchShifts()
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-gray-500 mt-2">Memuat konfigurasi shift...</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Konfigurasi Shift Bagi Hasil</CardTitle>
                        <CardDescription>Atur shift kerja untuk perhitungan bagi hasil multi-shift (Two-Tier per shift)</CardDescription>
                    </div>
                    <Button onClick={openCreateModal} disabled={saving} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Tambah Shift
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {shifts.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 mb-4">Belum ada konfigurasi shift.</p>
                        <p className="text-sm text-gray-400 mb-4">Tambah shift untuk mengaktifkan perhitungan bagi hasil multi-shift.</p>
                        <Button onClick={openCreateModal} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Buat Shift Pertama
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {shifts.map((shift, index) => (
                            <div key={shift.id} className="flex items-center gap-3 p-4 border rounded-xl bg-white hover:bg-gray-50 transition-colors">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-400 hover:text-gray-600"
                                    onClick={() => moveShift(shift.id, 'up')}
                                    disabled={index === 0}
                                    aria-label="Naikkan urutan"
                                >
                                    <ArrowUp className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-gray-400 hover:text-gray-600"
                                    onClick={() => moveShift(shift.id, 'down')}
                                    disabled={index === shifts.length - 1}
                                    aria-label="Turunkan urutan"
                                >
                                    <ArrowDown className="w-4 h-4" />
                                </Button>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-gray-900">{shift.name}</span>
                                        <Badge variant={shift.is_active ? "default" : "secondary"}>
                                            {shift.is_active ? "Aktif" : "Nonaktif"}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-600">
                                        <span>⏰ {shift.start_time.slice(0,5)} – {shift.end_time.slice(0,5)}</span>
                                        <span>👤 Owner {shift.owner_pct}%</span>
                                        <span>☕ Barista Pool {shift.barista_pool_pct}%</span>
                                        <span>📋 Urutan: {shift.sort_order}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={() => openEditModal(shift)} className="gap-1.5">
                                        <Edit className="w-3.5 h-3.5" />
                                        Edit
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDelete(shift.id)} className="gap-1.5 text-destructive border-destructive hover:bg-destructive/10">
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Hapus
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
            <CardFooter className="border-t pt-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900">
                    <p className="font-medium mb-1">Cara kerja Multi-Shift:</p>
                    <ul className="space-y-1 text-[12px] list-disc list-inside">
                        <li>Setiap shift punya <strong>Owner %</strong> dan <strong>Barista Pool %</strong> sendiri (total 100%)</li>
                        <li>Pendapatan & biaya dialokasikan ke shift berdasarkan jam transaksi</li>
                        <li>Per shift dihitung Two-Tier: Owner ambil Owner%, sisanya dibagi ke barista shift tsb</li>
                        <li>Barista libur: potongan dialihkan ke barista lain <strong>di shift yang sama</strong> (Opsi B), sisa ke Owner</li>
                        <li>Barista tanpa shift = "All-Day", ikut pool di <strong>semua shift</strong></li>
                    </ul>
                </div>
            </CardFooter>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b flex items-center justify-between">
                            <h3 className="text-base font-bold text-gray-900">
                                {editingShift ? "Edit Shift" : "Tambah Shift Baru"}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Nama Shift <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    placeholder="Contoh: Pagi, Siang, Malam"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    required
                                    className="font-semibold"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Kode Singkat (maks 3 huruf, unik)
                                </label>
                                <Input
                                    placeholder="Otomatis dari nama bila kosong (cth: P, M)"
                                    value={formKode}
                                    onChange={e => setFormKode(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 3))}
                                    className="font-semibold uppercase"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Jam Mulai <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        type="time"
                                        value={formStartTime}
                                        onChange={e => setFormStartTime(e.target.value)}
                                        required
                                        className="font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Jam Selesai <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        type="time"
                                        value={formEndTime}
                                        onChange={e => setFormEndTime(e.target.value)}
                                        required
                                        className="font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Owner % <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={formOwnerPct}
                                        onChange={e => setFormOwnerPct(Number(e.target.value))}
                                        required
                                        className="font-bold text-blue-700"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                        Barista Pool % <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={formBaristaPoolPct}
                                        onChange={e => setFormBaristaPoolPct(Number(e.target.value))}
                                        required
                                        className="font-bold text-emerald-700"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600">
                                Total: {formOwnerPct + formBaristaPoolPct}% {formOwnerPct + formBaristaPoolPct === 100 ? "✓" : "⚠ Harus 100%"}
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formIsActive}
                                    onChange={e => setFormIsActive(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                                    Shift Aktif (tampil di dropdown bagi hasil)
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Urutan Tampil (Sort Order)
                                </label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={formSortOrder}
                                    onChange={e => setFormSortOrder(Number(e.target.value))}
                                    className="font-bold"
                                />
                                <p className="text-[10px] text-gray-400 mt-0.5">Urutan di dropdown & perhitungan</p>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <Button type="button" variant="outline" onClick={closeModal}>
                                    Batal
                                </Button>
                                <Button type="submit" disabled={submitting || saving} className="gap-2">
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {editingShift ? "Simpan Perubahan" : "Tambah Shift"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Card>
    )
}