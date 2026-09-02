import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Loader2, Calculator, CheckCircle, Trash2, RefreshCw, DollarSign, FileText } from "lucide-react"
import { useProfitSharing } from "../hooks/useProfitSharing"
import { useToast } from "../hooks/use-toast"
import { formatNumber } from "../lib/utils"
import type { ProfitSharingPreview, ProfitSharingPeriod } from "../types"

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  finalized: "Finalized",
  paid: "Dibayar",
}
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-100 text-yellow-800",
  finalized: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
}

export default function ProfitSharing() {
  const { toast } = useToast()
  const {
    periods, isLoading,
    previewMutation, finalizeMutation, markPaidMutation, recalculateMutation, deleteMutation,
  } = useProfitSharing()

  const [startDate, setStartDate] = useState("")
  const [startTime, setStartTime] = useState("00:00")
  const [endDate, setEndDate] = useState("")
  const [endTime, setEndTime] = useState("23:59")
  const [ratio, setRatio] = useState(50)
  const [preview, setPreview] = useState<ProfitSharingPreview | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [detailPeriod, setDetailPeriod] = useState<ProfitSharingPeriod | null>(null)
  const handlePreview = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Error", description: "Pilih tanggal mulai dan akhir", variant: "error" })
      return
    }
    // Tambahkan offset WIB (+07:00) agar backend mengenali timezone dengan benar.
    // Tanpa ini parseDatePS akan menginterpretasi waktu sebagai UTC → geser 7 jam.
    const startDT = `${startDate}T${startTime}:00+07:00`
    const endDT = `${endDate}T${endTime}:00+07:00`
    try {
      const result = await previewMutation.mutateAsync({ start: startDT, end: endDT, ratio })
      setPreview(result)
      setShowPreview(true)
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.error || "Gagal hitung preview", variant: "error" })
    }
  }

  const handleFinalize = async (id: number) => {
    try {
      await finalizeMutation.mutateAsync({ id, ratio })
      toast({ title: "Berhasil", description: "Periode berhasil di-finalize", variant: "success" })
      setShowPreview(false)
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.error || "Gagal finalize", variant: "error" })
    }
  }

  const handleMarkPaid = async (id: number) => {
    try {
      await markPaidMutation.mutateAsync(id)
      toast({ title: "Berhasil", description: "Periode ditandai sebagai dibayar", variant: "success" })
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.error || "Gagal mark paid", variant: "error" })
    }
  }

  const handleRecalculate = async (id: number) => {
    try {
      await recalculateMutation.mutateAsync({ id, ratio })
      toast({ title: "Berhasil", description: "Periode berhasil dihitung ulang", variant: "success" })
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.error || "Gagal hitung ulang", variant: "error" })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus periode ini?")) return
    try {
      await deleteMutation.mutateAsync(id)
      toast({ title: "Berhasil", description: "Periode berhasil dihapus", variant: "success" })
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.error || "Gagal hapus", variant: "error" })
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bagi Hasil</h1>
          <p className="text-sm text-gray-500">Hitung dan kelola pembagian keuntungan dengan owner</p>
        </div>
      </div>

      {/* Preview Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Hitung Preview Bagi Hasil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jam Mulai</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jam Akhir</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rasio Keeper (%)</label>
              <Input type="number" min={0} max={100} value={ratio} onChange={(e) => setRatio(Number(e.target.value))} />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handlePreview} disabled={previewMutation.isPending} className="w-full md:w-auto">
              {previewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
              Hitung Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Periods Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Daftar Periode
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : periods.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Belum ada periode bagi hasil</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Periode</th>
                    <th className="text-right py-3 px-2">Basis</th>
                    <th className="text-right py-3 px-2">Laba Bersih</th>
                    <th className="text-right py-3 px-2">Keeper</th>
                    <th className="text-right py-3 px-2">Owner</th>
                    <th className="text-center py-3 px-2">Status</th>
                    <th className="text-center py-3 px-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p) => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div className="font-medium">{p.period_start} - {p.period_end}</div>
                      </td>
                      <td className="py-3 px-2 text-right">{formatNumber(p.basis_amount)}</td>
                      <td className="py-3 px-2 text-right font-medium">{formatNumber(p.net_profit)}</td>
                      <td className="py-3 px-2 text-right text-green-600 font-semibold">{formatNumber(p.keeper_amount)}</td>
                      <td className="py-3 px-2 text-right text-blue-600 font-semibold">{formatNumber(p.owner_amount)}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status] || "bg-gray-100"}`}>
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setDetailPeriod(p)}>
                            <FileText className="w-4 h-4" />
                          </Button>
                          {p.status === "draft" && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleFinalize(p.id)} disabled={finalizeMutation.isPending}>
                                <CheckCircle className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} disabled={deleteMutation.isPending}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          {p.status === "finalized" && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleMarkPaid(p.id)} disabled={markPaidMutation.isPending}>
                                <DollarSign className="w-4 h-4 text-green-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} disabled={deleteMutation.isPending}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </>
                          )}
                          {p.status === "paid" && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleRecalculate(p.id)} disabled={recalculateMutation.isPending} title="Edit (kembali ke draft)">
                                <RefreshCw className="w-4 h-4 text-orange-500" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} disabled={deleteMutation.isPending} title="Hapus periode">
                                <Trash2 className="w-4 h-4 text-red-500" />
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

      {/* Detail Modal */}
      {detailPeriod && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailPeriod(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Detail Periode {detailPeriod.period_start} - {detailPeriod.period_end}</h2>
              <button onClick={() => setDetailPeriod(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-gray-500">Status</span><p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${STATUS_COLORS[detailPeriod.status]}`}>{STATUS_LABELS[detailPeriod.status]}</p></div>
                <div><span className="text-sm text-gray-500">Rasio</span><p className="font-medium">{detailPeriod.ratio}%</p></div>
                <div><span className="text-sm text-gray-500">Basis (Pendapatan Kotor)</span><p className="font-medium">{formatNumber(detailPeriod.basis_amount)}</p></div>
                <div><span className="text-sm text-gray-500">Total Modal (COGS)</span><p className="font-medium">{formatNumber(detailPeriod.total_cogs)}</p></div>
                <div><span className="text-sm text-gray-500">Total Pengeluaran (non-bagi hasil)</span><p className="font-medium">{formatNumber(detailPeriod.total_expenses)}</p></div>
                <div><span className="text-sm text-gray-500">Laba Bersih</span><p className="font-bold text-lg">{formatNumber(detailPeriod.net_profit)}</p></div>
                <div className="bg-green-50 p-3 rounded-lg"><span className="text-sm text-green-600">Bagian Keeper</span><p className="font-bold text-lg text-green-700">{formatNumber(detailPeriod.keeper_amount)}</p></div>
                <div className="bg-blue-50 p-3 rounded-lg"><span className="text-sm text-blue-600">Bagian Owner</span><p className="font-bold text-lg text-blue-700">{formatNumber(detailPeriod.owner_amount)}</p></div>
              </div>
              {detailPeriod.per_product && (() => {
                try {
                  const products = JSON.parse(detailPeriod.per_product) as { product_name: string; revenue: number; cogs: number; gross_margin: number }[]
                  if (!products.length) return null
                  return (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Rincian per Produk</h3>
                      <table className="w-full text-sm">
                        <thead><tr className="border-b"><th className="text-left py-2">Produk</th><th className="text-right py-2">Pendapatan</th><th className="text-right py-2">Modal</th><th className="text-right py-2">Laba Kotor</th></tr></thead>
                        <tbody>
                          {products.map((pp, i) => (
                            <tr key={i} className="border-b"><td className="py-2">{pp.product_name}</td><td className="text-right">{formatNumber(pp.revenue)}</td><td className="text-right">{formatNumber(pp.cogs)}</td><td className="text-right font-medium">{formatNumber(pp.gross_margin)}</td></tr>
                          ))}
                          <tr className="border-b bg-gray-50 font-bold">
                            <td className="py-2">Total</td>
                            <td className="text-right">{formatNumber(products.reduce((s, p) => s + p.revenue, 0))}</td>
                            <td className="text-right">{formatNumber(products.reduce((s, p) => s + p.cogs, 0))}</td>
                            <td className="text-right">{formatNumber(products.reduce((s, p) => s + p.gross_margin, 0))}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )
                } catch { return null }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && preview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Preview Bagi Hasil</h2>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-gray-500">Periode</span><p className="font-medium">{preview.period.period_start} - {preview.period.period_end}</p></div>
                <div><span className="text-sm text-gray-500">Rasio Keeper</span><p className="font-medium">{preview.calculation.ratio}%</p></div>
                <div><span className="text-sm text-gray-500">Pendapatan Kotor (sebelum pajak)</span><p className="font-medium">{formatNumber(preview.calculation.basis_amount)}</p></div>
                <div><span className="text-sm text-gray-500">Total Modal (COGS)</span><p className="font-medium">{formatNumber(preview.calculation.total_cogs)}</p></div>
                <div><span className="text-sm text-gray-500">Laba Kotor</span><p className="font-medium">{formatNumber(preview.calculation.gross_profit)}</p></div>
                <div><span className="text-sm text-gray-500">Total Pengeluaran (non-bagi hasil)</span><p className="font-medium">{formatNumber(preview.calculation.total_expenses)}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><span className="text-sm text-gray-600">Laba Bersih</span><p className="font-bold text-lg">{formatNumber(preview.calculation.net_profit)}</p></div>
                <div></div>
                {preview.calculation.net_profit < 0 && (
                  <div className="col-span-2 bg-yellow-50 border border-yellow-200 p-2 rounded text-xs text-yellow-700">
                    Laba bersih negatif — pembagian dihitung dari Laba Kotor ({formatNumber(preview.calculation.gross_profit)})
                  </div>
                )}
                <div className="bg-green-50 p-3 rounded-lg"><span className="text-sm text-green-600">Bagian Keeper ({preview.calculation.ratio}%)</span><p className="font-bold text-xl text-green-700">{formatNumber(preview.calculation.keeper_share)}</p></div>
                <div className="bg-blue-50 p-3 rounded-lg"><span className="text-sm text-blue-600">Bagian Owner ({100 - preview.calculation.ratio}%)</span><p className="font-bold text-xl text-blue-700">{formatNumber(preview.calculation.owner_share)}</p></div>
              </div>
              {preview.calculation.breakdown && preview.calculation.breakdown.length > 0 && (
                <div>
                      <h3 className="font-semibold text-sm mb-2">Rincian Pengeluaran</h3>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left py-2">Kategori</th><th className="text-right py-2">Jumlah</th></tr></thead>
                    <tbody>
                      {preview.calculation.breakdown.map((b, i) => (
                        <tr key={i} className="border-b"><td className="py-2">{b.category}</td><td className="text-right">{formatNumber(b.amount)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {preview.calculation.per_product && preview.calculation.per_product.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Rincian per Produk</h3>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left py-2">Produk</th><th className="text-right py-2">Pendapatan</th><th className="text-right py-2">Modal</th><th className="text-right py-2">Laba Kotor</th></tr></thead>
                    <tbody>
                      {preview.calculation.per_product.map((pp, i) => (
                        <tr key={i} className="border-b"><td className="py-2">{pp.product_name}</td><td className="text-right">{formatNumber(pp.revenue)}</td><td className="text-right">{formatNumber(pp.cogs)}</td><td className="text-right font-medium">{formatNumber(pp.gross_margin)}</td></tr>
                      ))}
                      <tr className="border-b bg-gray-50 font-bold">
                        <td className="py-2">Total</td>
                        <td className="text-right">{formatNumber(preview.calculation.per_product.reduce((s, p) => s + p.revenue, 0))}</td>
                        <td className="text-right">{formatNumber(preview.calculation.per_product.reduce((s, p) => s + p.cogs, 0))}</td>
                        <td className="text-right">{formatNumber(preview.calculation.per_product.reduce((s, p) => s + p.gross_margin, 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
              {preview.calculation.note && <p className="text-sm text-gray-500 italic">{preview.calculation.note}</p>}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowPreview(false)}>Batal</Button>
                <Button onClick={() => handleFinalize(preview.period.id)} disabled={finalizeMutation.isPending}>
                  {finalizeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Finalize Periode Ini
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
