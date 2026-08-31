import { useState } from "react"
import { useSelector } from "react-redux"
import { RootState } from "../store"
import type { CashRegister } from "../types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Loader2, Pencil, Trash2, X } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { CashRegisterService } from "../services/cashRegisterService"
import { formatNumber } from "../lib/utils"

function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return {
        date: date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        time: date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    }
}

export default function CashRegister() {
    const { user } = useSelector((state: RootState) => state.auth)
    const isOwner = user?.role === "owner"
    const isManager = user?.role === "manager"
    const [cashierName, setCashierName] = useState("")
    const [dateFrom, setDateFrom] = useState("")
    const [dateTo, setDateTo] = useState("")
    const [status, setStatus] = useState("")
    const [editingId, setEditingId] = useState<number | null>(null)
    const [editNotes, setEditNotes] = useState("")
    const queryClient = useQueryClient()

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["cash-registers", cashierName, dateFrom, dateTo, status],
        queryFn: () =>
            CashRegisterService.getCashRegisters({
                cashier_name: cashierName || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
                status: status || undefined,
                limit: 100,
                offset: 0,
            }),
        // BUG FIX: sebelumnya hanya owner yang bisa fetch → manager tidak bisa lihat data.
        // Sekarang manager dan owner bisa fetch (backend scope by outlet_id via JWT).
        enabled: isOwner || isManager,
        refetchInterval: 30_000, // real-time: refresh otomatis setiap 30 detik
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, notes }: { id: number; notes: string }) =>
            CashRegisterService.updateCashRegister(id, { notes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cash-registers"] })
            setEditingId(null)
            setEditNotes("")
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (id: number) => CashRegisterService.deleteCashRegister(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["cash-registers"] })
        },
    })

    const records: CashRegister[] = data ?? []

    const handleEdit = (r: CashRegister) => {
        setEditingId(r.id)
        setEditNotes(r.notes || "")
    }

    const handleSaveEdit = () => {
        if (editingId === null) return
        updateMutation.mutate({ id: editingId, notes: editNotes })
    }

    const handleDelete = (id: number) => {
        if (!confirm("Hapus data kas ini?")) return
        deleteMutation.mutate(id)
    }

    return (
        <div className="space-y-4">
            <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle>Pantauan Uang Kas</CardTitle>
                    <CardDescription>Riwayat buka kas per kasir, tanggal, dan outlet.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-3 mb-4">
                        <Input
                            placeholder="Nama kasir"
                            value={cashierName}
                            onChange={(e) => setCashierName(e.target.value)}
                            className="w-48"
                        />
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-40"
                        />
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-40"
                        />
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
                        >
                            <option value="">Semua Status</option>
                            <option value="open">Terbuka</option>
                            <option value="closed">Tertutup</option>
                        </select>
                        <button
                            onClick={() => refetch()}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                        >
                            Cari
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                        </div>
                    ) : records.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-8">Tidak ada data uang kas ditemukan.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50/50 border-b">
                                    <tr>
                                        <th className="px-4 py-3">Tanggal</th>
                                        <th className="px-4 py-3">Kasir</th>
                                        <th className="px-4 py-3">Outlet</th>
                                        <th className="px-4 py-3 text-right">Uang Receh (Rp)</th>
                                        <th className="px-4 py-3 text-right">Kas Seharusnya (Rp)</th>
                                        <th className="px-4 py-3 text-right">Selisih (Rp)</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Catatan</th>
                                        <th className="px-4 py-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map((r) => {
                                        const { date, time } = formatDate(r.opened_at)
                                        return (
                                            <tr key={r.id} className="border-b hover:bg-gray-50/50">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{date}</div>
                                                    <div className="text-xs text-gray-400">{time}</div>
                                                </td>
                                                <td className="px-4 py-3">{r.cashier_name}</td>
                                                <td className="px-4 py-3">{r.outlet_name || r.outlet_id || "-"}</td>
                                                 <td className="px-4 py-3 text-right font-mono">{formatNumber(r.opening_amount)}</td>
                                                 <td className="px-4 py-3 text-right font-mono">{r.expected_cash ? formatNumber(r.expected_cash) : "-"}</td>
                                                 <td className="px-4 py-3 text-right font-mono">
                                                     {r.expected_cash ? (
                                                         <span className={(r.variance ?? 0) < 0 ? "text-red-600" : (r.variance ?? 0) > 0 ? "text-green-600" : ""}>
                                                             {(r.variance ?? 0) < 0 ? "-" : ""}{formatNumber(Math.abs(r.variance ?? 0))}
                                                         </span>
                                                     ) : (
                                                         "-"
                                                     )}
                                                 </td>
                                                 <td className="px-4 py-3">
                                                    <Badge
                                                        variant={r.status === "open" ? "default" : "secondary"}
                                                        className={
                                                            r.status === "open"
                                                                ? "bg-green-100 text-green-800"
                                                                : "bg-slate-100 text-slate-600"
                                                        }
                                                    >
                                                        {r.status === "open" ? "Terbuka" : "Tertutup"}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">
                                                    {r.notes || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                     {/* Hanya owner yang bisa edit/hapus; manager hanya bisa baca */}
                                                     {isOwner ? (
                                                     <div className="flex items-center justify-center gap-2">
                                                         <button
                                                             onClick={() => handleEdit(r)}
                                                             className="p-1 text-blue-600 hover:text-blue-800"
                                                             title="Edit catatan"
                                                         >
                                                             <Pencil className="w-4 h-4" />
                                                         </button>
                                                         <button
                                                             onClick={() => handleDelete(r.id)}
                                                             className="p-1 text-red-600 hover:text-red-800"
                                                             title="Hapus"
                                                         >
                                                             <Trash2 className="w-4 h-4" />
                                                         </button>
                                                     </div>
                                                     ) : (
                                                         <span className="text-xs text-slate-400">Pantau saja</span>
                                                     )}
                                                 </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {editingId !== null && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Edit Catatan</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setEditingId(null)}>
                                <X className="w-4 h-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Catatan</label>
                                <Input
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    placeholder="Masukkan catatan..."
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={() => setEditingId(null)}>Batal</Button>
                            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
                                {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Simpan
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    )
}