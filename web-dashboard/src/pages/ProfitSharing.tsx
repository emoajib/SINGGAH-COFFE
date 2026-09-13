import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Loader2, Calculator, CheckCircle, Trash2, RefreshCw, DollarSign, FileText, UserPlus, X } from "lucide-react"
import { useProfitSharing } from "../hooks/useProfitSharing"
import { useToast } from "../hooks/use-toast"
import { formatNumber, formatDateTime } from "../lib/utils"
import type { ProfitSharingPreview, ProfitSharingPeriod, ProfitSharingPerson } from "../types"

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
  const [basisType, setBasisType] = useState("net")
  const [ownerPct, setOwnerPct] = useState(60)
  const [people, setPeople] = useState<ProfitSharingPerson[]>([
    { id: 0, period_id: 0, name: "Owner", role: "owner", share_pct: 60, amount: 0, is_on_leave: false, leave_reduction: 0 },
  ])
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [newPersonName, setNewPersonName] = useState("")
  const [newPersonPct, setNewPersonPct] = useState(10)
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
      const result = await previewMutation.mutateAsync({ start: startDT, end: endDT, ratio, basisType, ownerPct, people })
      setPreview(result)
      setShowPreview(true)
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.error || "Gagal hitung preview", variant: "error" })
    }
  }

  const addPerson = () => {
    if (!newPersonName.trim()) {
      toast({ title: "Error", description: "Nama harus diisi", variant: "error" })
      return
    }
    if (newPersonPct <= 0 || newPersonPct > 100) {
      toast({ title: "Error", description: "Persentase harus antara 1-100", variant: "error" })
      return
    }
    const newPerson: ProfitSharingPerson = {
      id: 0,
      period_id: 0,
      name: newPersonName.trim(),
      role: "barista",
      share_pct: newPersonPct,
      amount: 0,
      is_on_leave: false,
      leave_reduction: 0,
    }
    setPeople([...people, newPerson])
    setNewPersonName("")
    setNewPersonPct(10)
    setShowAddPerson(false)
  }

  const removePerson = (index: number) => {
    const person = people[index]
    if (person.role === "owner") {
      toast({ title: "Error", description: "Tidak bisa menghapus owner", variant: "error" })
      return
    }
    setPeople(people.filter((_, i) => i !== index))
  }

  const toggleLeave = (index: number) => {
    const updated = [...people]
    updated[index] = { ...updated[index], is_on_leave: !updated[index].is_on_leave }
    setPeople(updated)
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

          {/* Multi-Person Settings */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Pengaturan Bagi Hasil Multi-Person</h3>
              <Button variant="outline" size="sm" onClick={() => setShowAddPerson(true)}>
                <UserPlus className="w-4 h-4 mr-1" /> Tambah Orang
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Basis</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  value={basisType}
                  onChange={(e) => setBasisType(e.target.value)}
                >
                  <option value="net">Laba Bersih (Net Profit)</option>
                  <option value="gross">Laba Kotor (Gross Profit)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner %</label>
                <Input type="number" min={0} max={100} value={ownerPct} onChange={(e) => setOwnerPct(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Barista %</label>
                <Input type="number" value={100 - ownerPct} disabled className="bg-gray-100" />
              </div>
            </div>
            
            {/* People List */}
            <div className="space-y-2">
              {people.map((person, index) => (
                <div key={index} className="flex items-center gap-3 p-2 bg-white rounded border">
                  <span className={`text-xs px-2 py-0.5 rounded ${person.role === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                    {person.role === 'owner' ? 'Owner' : 'Barista'}
                  </span>
                  <span className="flex-1 text-sm font-medium">{person.name}</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={person.share_pct}
                    onChange={(e) => {
                      const updated = [...people]
                      updated[index] = { ...updated[index], share_pct: Number(e.target.value) }
                      setPeople(updated)
                    }}
                    className="w-20 text-right"
                    disabled={person.role === 'owner'}
                  />
                  <span className="text-sm text-gray-500">%</span>
                  {person.role !== 'owner' && (
                    <>
                      <Button
                        variant={person.is_on_leave ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleLeave(index)}
                        className={person.is_on_leave ? "bg-red-500 hover:bg-red-600" : ""}
                      >
                        {person.is_on_leave ? "Cuti" : "Aktif"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removePerson(index)}>
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Add Person Form */}
            {showAddPerson && (
              <div className="mt-3 p-3 bg-white rounded border">
                <div className="flex items-center gap-3">
                  <Input
                    placeholder="Nama barista"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={newPersonPct}
                    onChange={(e) => setNewPersonPct(Number(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-500">%</span>
                  <Button size="sm" onClick={addPerson}>Tambah</Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddPerson(false)}>Batal</Button>
                </div>
              </div>
            )}
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
                        <div className="font-medium">{formatDateTime(p.period_start)} — {formatDateTime(p.period_end)}</div>
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
              <h2 className="text-lg font-bold">Detail Periode: {formatDateTime(detailPeriod.period_start)} — {formatDateTime(detailPeriod.period_end)}</h2>
              <button onClick={() => setDetailPeriod(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-gray-500">Status</span><p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 ${STATUS_COLORS[detailPeriod.status]}`}>{STATUS_LABELS[detailPeriod.status]}</p></div>
                <div><span className="text-sm text-gray-500">Rasio</span><p className="font-medium">{detailPeriod.ratio}%</p></div>
                <div><span className="text-sm text-gray-500">Pendapatan Kotor</span><p className="font-medium">{formatNumber(detailPeriod.basis_amount)}</p></div>
                <div><span className="text-sm text-gray-500">Total Modal (COGS)</span><p className="font-medium">{formatNumber(detailPeriod.total_cogs)}</p></div>
                <div><span className="text-sm text-gray-500">Total Pengeluaran (non-bagi hasil)</span><p className="font-medium">{formatNumber(detailPeriod.total_expenses)}</p></div>
                <div><span className="text-sm text-gray-500">Laba Bersih</span><p className="font-bold text-lg">{formatNumber(detailPeriod.net_profit)}</p></div>
                <div className="bg-green-50 p-3 rounded-lg"><span className="text-sm text-green-600">Bagian Keeper</span><p className="font-bold text-lg text-green-700">{formatNumber(detailPeriod.keeper_amount)}</p></div>
                <div className="bg-blue-50 p-3 rounded-lg"><span className="text-sm text-blue-600">Bagian Owner</span><p className="font-bold text-lg text-blue-700">{formatNumber(detailPeriod.owner_amount)}</p></div>
                <div><span className="text-sm text-gray-500">Jenis Basis</span><p className="font-medium">{detailPeriod.basis_type === 'gross' ? 'Laba Kotor' : 'Laba Bersih'}</p></div>
                <div><span className="text-sm text-gray-500">Owner %</span><p className="font-medium">{detailPeriod.owner_pct}%</p></div>
              </div>

              {/* People List */}
              {detailPeriod.people && detailPeriod.people.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Rincian per Orang</h3>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left py-2">Nama</th><th className="text-left py-2">Role</th><th className="text-right py-2">Share %</th><th className="text-right py-2">Jumlah</th><th className="text-center py-2">Status</th></tr></thead>
                    <tbody>
                      {detailPeriod.people.map((person, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-2 font-medium">{person.name}</td>
                          <td className="py-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${person.role === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                              {person.role === 'owner' ? 'Owner' : 'Barista'}
                            </span>
                          </td>
                          <td className="text-right">{person.share_pct}%</td>
                          <td className="text-right font-medium">{formatNumber(person.amount)}</td>
                          <td className="text-center">
                            {person.is_on_leave && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Cuti</span>
                            )}
                            {person.leave_reduction > 0 && (
                              <span className="text-xs text-red-500 ml-1">-{formatNumber(person.leave_reduction)}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
                <div>
                  <span className="text-sm text-gray-500">Periode</span>
                  <p className="font-medium">
                    {startDate && endDate
                      ? `${formatDateTime(`${startDate}T${startTime}:00+07:00`)} — ${formatDateTime(`${endDate}T${endTime}:00+07:00`)}`
                      : `${formatDateTime(preview.period.period_start)} — ${formatDateTime(preview.period.period_end)}`}
                  </p>
                </div>
                <div><span className="text-sm text-gray-500">Rasio Keeper</span><p className="font-medium">{preview.calculation.ratio}%</p></div>
                <div><span className="text-sm text-gray-500">Pendapatan Kotor</span><p className="font-medium">{formatNumber(preview.calculation.basis_amount)}</p></div>
                <div><span className="text-sm text-gray-500">Pajak (10%)</span><p className="font-medium text-red-600">-{formatNumber(preview.calculation.tax || 0)}</p></div>
                <div><span className="text-sm text-gray-500">Biaya Layanan (5%)</span><p className="font-medium text-red-600">-{formatNumber(preview.calculation.service_fee || 0)}</p></div>
                <div><span className="text-sm text-gray-500">Pendapatan Bersih</span><p className="font-bold">{formatNumber(preview.calculation.net_revenue || preview.calculation.basis_amount)}</p></div>
                <div><span className="text-sm text-gray-500">Total Modal (COGS)</span><p className="font-medium">{formatNumber(preview.calculation.total_cogs)}</p></div>
                <div><span className="text-sm text-gray-500">Laba Kotor</span><p className="font-medium">{formatNumber(preview.calculation.gross_profit)}</p></div>
                <div><span className="text-sm text-gray-500">Total Pengeluaran (non-bagi hasil)</span><p className="font-medium">{formatNumber(preview.calculation.total_expenses)}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><span className="text-sm text-gray-600">Laba Bersih</span><p className="font-bold text-lg">{formatNumber(preview.calculation.net_profit)}</p></div>
                <div></div>
                {preview.calculation.net_profit < 0 && preview.calculation.gross_profit >= 0 && (
                  <div className="col-span-2 bg-yellow-50 border border-yellow-200 p-2 rounded text-xs text-yellow-700">
                    Laba bersih negatif — pembagian dihitung dari Laba Kotor ({formatNumber(preview.calculation.gross_profit)})
                  </div>
                )}
                {preview.calculation.gross_profit < 0 && (
                  <div className="col-span-2 bg-red-50 border border-red-200 p-2 rounded text-xs text-red-700">
                    Laba kotor negatif — tidak ada bagi hasil bulan ini
                  </div>
                )}
                <div className="bg-green-50 p-3 rounded-lg"><span className="text-sm text-green-600">Bagian Keeper ({preview.calculation.ratio}%)</span><p className="font-bold text-xl text-green-700">{formatNumber(preview.calculation.keeper_share)}</p></div>
                <div className="bg-blue-50 p-3 rounded-lg"><span className="text-sm text-blue-600">Bagian Owner ({preview.calculation.owner_pct || 60}%)</span><p className="font-bold text-xl text-blue-700">{formatNumber(preview.calculation.owner_share)}</p></div>
              </div>

              {/* People Breakdown */}
              {preview.calculation.people && preview.calculation.people.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-2">Rincian per Orang</h3>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b"><th className="text-left py-2">Nama</th><th className="text-left py-2">Role</th><th className="text-right py-2">Share %</th><th className="text-right py-2">Jumlah</th><th className="text-center py-2">Status</th></tr></thead>
                    <tbody>
                      {preview.calculation.people.map((person, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-2 font-medium">{person.name}</td>
                          <td className="py-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${person.role === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                              {person.role === 'owner' ? 'Owner' : 'Barista'}
                            </span>
                          </td>
                          <td className="text-right">{person.share_pct}%</td>
                          <td className="text-right font-medium">{formatNumber(person.amount)}</td>
                          <td className="text-center">
                            {person.is_on_leave && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700">Cuti</span>
                            )}
                            {person.leave_reduction > 0 && (
                              <span className="text-xs text-red-500 ml-1">-{formatNumber(person.leave_reduction)}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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
