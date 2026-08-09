import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { RootState } from "../store"
import type { ProductionTarget, RequirementResponse } from "../types"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Loader2, Save, ShoppingCart, Target } from "lucide-react"
import { RequirementService } from "../services/requirementService"
import { useToast } from "../hooks/use-toast"
import { formatCurrency, formatNumber } from "../lib/utils"

export default function KebutuhanStok() {
    const { user } = useSelector((state: RootState) => state.auth)
    const canEdit = user?.role === 'owner' || user?.role === 'manager'

    const [targets, setTargets] = useState<ProductionTarget[]>([])
    const [requirements, setRequirements] = useState<RequirementResponse | null>(null)
    const [periodDays, setPeriodDays] = useState(10)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const { toast } = useToast()

    const loadAll = async () => {
        setIsLoading(true)
        try {
            const [tg, req] = await Promise.all([
                RequirementService.getTargets(),
                RequirementService.getRequirements(),
            ])
            setTargets(tg)
            setRequirements(req)
            setPeriodDays(req.period_days || 10)
        } catch (err) {
            toast({
                title: "Error",
                description: "Gagal memuat data kebutuhan stok",
                variant: "error",
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleTargetChange = (productID: number, value: number) => {
        setTargets(prev => prev.map(t => (t.product_id === productID ? { ...t, target_cup: value } : t)))
    }

    const handleSave = async () => {
        if (!canEdit) return
        setIsSaving(true)
        try {
            const payload = {
                period_days: periodDays || 10,
                targets: targets.map(t => ({ product_id: t.product_id, target_cup: t.target_cup || 0 })),
            }
            await RequirementService.saveTargets(payload)
            toast({ title: "Berhasil", description: "Target produksi tersimpan", variant: "success" })
            await loadAll()
        } catch (err) {
            toast({ title: "Error", description: "Gagal menyimpan target produksi", variant: "error" })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black text-slate-800">Kebutuhan Stok</h1>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Perencanaan belanja bahan baku berdasarkan target produksi menu per periode.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-600">Periode (hari)</label>
                    <Input
                        type="number"
                        min={1}
                        value={periodDays}
                        onChange={e => setPeriodDays(Number(e.target.value))}
                        className="w-24"
                        disabled={!canEdit}
                    />
                    <Button size="sm" onClick={handleSave} disabled={!canEdit || isSaving} className="gap-1.5">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Simpan
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Memuat data...
                </div>
            ) : (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">Total Target Cup</CardTitle>
                                <Target className="h-4 w-4 text-gray-400" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-black text-slate-800">{formatNumber(requirements?.total_target_cup ?? 0)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">Rata-rata Cup / Hari</CardTitle>
                                <Target className="h-4 w-4 text-gray-400" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-black text-slate-800">{formatNumber(Math.round(requirements?.avg_cup_per_day ?? 0))}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">Periode (hari)</CardTitle>
                                <Target className="h-4 w-4 text-gray-400" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-black text-slate-800">{requirements?.period_days ?? 0}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-gray-500">Estimasi Biaya Belanja</CardTitle>
                                <ShoppingCart className="h-4 w-4 text-gray-400" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-2xl font-black text-emerald-600">{formatCurrency(requirements?.total_estimated_cost ?? 0)}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Target Produksi per Menu</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {targets.map(t => (
                                    <div key={t.product_id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-800">{t.product_name}</p>
                                            <p className="text-xs text-gray-500">cup per periode</p>
                                        </div>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={t.target_cup}
                                            disabled={!canEdit}
                                            onChange={e => handleTargetChange(t.product_id, Number(e.target.value))}
                                            className="w-20 text-right"
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Daftar Belanja Bahan Baku</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-gray-500">
                                            <th className="py-2 pr-3 font-semibold">Bahan</th>
                                            <th className="py-2 pr-3 font-semibold">Kategori</th>
                                            <th className="py-2 pr-3 text-right font-semibold">Total Kebutuhan</th>
                                            <th className="py-2 pr-3 text-right font-semibold">Belanja (Satuan Beli)</th>
                                            <th className="py-2 pr-3 text-right font-semibold">Estimasi Biaya</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {requirements?.ingredients.map(i => (
                                            <tr key={i.ingredient_id} className="border-b border-slate-100">
                                                <td className="py-2 pr-3 font-medium text-slate-800">{i.name}</td>
                                                <td className="py-2 pr-3 text-gray-500">{i.category || "-"}</td>
                                                <td className="py-2 pr-3 text-right text-slate-700">
                                                    {formatNumber(i.total_needed)} {i.unit}
                                                </td>
                                                <td className="py-2 pr-3 text-right text-slate-700">
                                                    {formatNumber(i.need_in_purchase_unit)} {i.purchase_unit}
                                                </td>
                                                <td className="py-2 pr-3 text-right font-semibold text-slate-800">
                                                    {formatCurrency(i.estimated_cost)}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td colSpan={4} className="py-3 pr-3 text-right font-bold text-slate-800">
                                                TOTAL ESTIMASI
                                            </td>
                                            <td className="py-3 text-right font-black text-emerald-600">
                                                {formatCurrency(requirements?.total_estimated_cost ?? 0)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
