// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Loader2, Calculator, CheckCircle, Trash2, RefreshCw, DollarSign, FileText, UserPlus, X, Calendar, CalendarOff, Info } from "lucide-react"
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

const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return ""
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
  } catch {
    return dateStr
  }
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
    { id: 0, period_id: 0, name: "Owner", role: "owner", share_pct: 60, amount: 0, is_on_leave: false, leave_reduction: 0, leave_days: 0, leave_dates: "" },
  ])
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [newPersonName, setNewPersonName] = useState("")
  const [newPersonPct, setNewPersonPct] = useState(10)
  const [leaveModalIndex, setLeaveModalIndex] = useState<number | null>(null)
  const [preview, setPreview] = useState<ProfitSharingPreview | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [detailPeriod, setDetailPeriod] = useState<ProfitSharingPeriod | null>(null)

  // Hitung daftar tanggal dalam rentang periode yang dipilih
  const periodDates = useMemo(() => {
    if (!startDate || !endDate) return []
    const dates: string[] = []
    const curr = new Date(startDate)
    const last = new Date(endDate)
    while (curr <= last) {
      dates.push(curr.toISOString().split('T')[0])
      curr.setDate(curr.getDate() + 1)
    }
    return dates
  }, [startDate, endDate])

  const totalPeriodDays = Math.max(1, periodDates.length)

  const toggleDateLeave = (personIndex: number, dateStr: string) => {
    const updated = [...people]
    const p = updated[personIndex]
    const currentDates = p.leave_dates ? p.leave_dates.split(',').filter(Boolean) : []
    let newDates: string[]
    if (currentDates.includes(dateStr)) {
      newDates = currentDates.filter(d => d !== dateStr)
    } else {
      newDates = [...currentDates, dateStr]
    }
    p.leave_dates = newDates.join(',')
    p.leave_days = newDates.length
    p.is_on_leave = false
    setPeople(updated)
  }

  const setManualLeaveDays = (personIndex: number, days: number) => {
    const updated = [...people]
    const p = updated[personIndex]
    p.leave_days = Math.min(totalPeriodDays, Math.max(0, days))
    p.is_on_leave = false
    setPeople(updated)
  }

  const setFullLeave = (personIndex: number, isFull: boolean) => {
    const updated = [...people]
    const p = updated[personIndex]
    p.is_on_leave = isFull
    if (isFull) {
      p.leave_days = totalPeriodDays
      p.leave_dates = ""
    } else {
      p.leave_days = 0
      p.leave_dates = ""
    }
    setPeople(updated)
  }

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
      leave_days: 0,
      leave_dates: "",
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
            <div className="space-y-2.5">
              {people.map((person, index) => {
                const isOwner = person.role === 'owner'
                const leaveDays = person.leave_days || 0
                const isFullLeave = person.is_on_leave
                return (
                  <div key={index} className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${isOwner ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                      {isOwner ? 'Owner' : 'Barista'}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-slate-900 min-w-[120px]">{person.name}</span>
                    <div className="flex items-center gap-1.5">
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
                        className="w-20 text-right font-bold text-sm"
                        disabled={isOwner}
                      />
                      <span className="text-sm font-medium text-slate-500">%</span>
                    </div>

                    {!isOwner && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!startDate || !endDate) {
                              toast({ title: "Perhatian", description: "Tentukan Tanggal Mulai dan Akhir periode terlebih dahulu", variant: "error" })
                              return
                            }
                            setLeaveModalIndex(index)
                          }}
                          className={`text-xs px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                            isFullLeave
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              : leaveDays > 0
                              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          }`}
                          title="Klik untuk memilih tanggal libur barista"
                        >
                          {isFullLeave ? (
                            <>
                              <CalendarOff className="w-3.5 h-3.5 text-rose-500" />
                              <span>Cuti Penuh</span>
                            </>
                          ) : leaveDays > 0 ? (
                            <>
                              <Calendar className="w-3.5 h-3.5 text-amber-600" />
                              <span>Libur {leaveDays} Hari ({totalPeriodDays - leaveDays}/{totalPeriodDays} hr)</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Hadir Penuh ({totalPeriodDays}/{totalPeriodDays} hr)</span>
                            </>
                          )}
                        </button>
                        <Button variant="ghost" size="sm" onClick={() => removePerson(index)} className="text-slate-400 hover:text-rose-600">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}
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

              {/* People List in Detail Modal */}
              {detailPeriod.people && detailPeriod.people.length > 0 && (() => {
                const totalBaristaReductions = detailPeriod.people.reduce(
                  (sum, p) => sum + (p.role !== 'owner' ? (p.leave_reduction || 0) : 0), 0
                )
                return (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Rincian Pembagian per Orang</h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50 text-slate-600">
                            <th className="text-left py-2 px-2.5">Nama & Role</th>
                            <th className="text-right py-2 px-2.5">Share %</th>
                            <th className="text-center py-2 px-2.5">Kehadiran</th>
                            <th className="text-right py-2 px-2.5">Jatah Normal</th>
                            <th className="text-right py-2 px-2.5">Potongan Libur</th>
                            <th className="text-right py-2 px-2.5">Total Diterima</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detailPeriod.people.map((person, i) => {
                            const isOwner = person.role === 'owner'
                            const reduction = person.leave_reduction || 0
                            const normalShare = isOwner ? (person.amount - totalBaristaReductions) : (person.amount + reduction)
                            return (
                              <tr key={i} className={`border-b ${isOwner ? 'bg-blue-50/40 font-semibold' : ''}`}>
                                <td className="py-2.5 px-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-slate-900">{person.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isOwner ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                      {isOwner ? 'Owner' : 'Barista'}
                                    </span>
                                  </div>
                                  {isOwner && totalBaristaReductions > 0 && (
                                    <span className="text-[10px] text-blue-600 block mt-0.5">Termasuk +Rp {formatNumber(totalBaristaReductions)} dari libur barista</span>
                                  )}
                                </td>
                                <td className="text-right py-2.5 px-2.5">{person.share_pct}%</td>
                                <td className="text-center py-2.5 px-2.5">
                                  {isOwner ? (
                                    <span className="text-slate-400">-</span>
                                  ) : person.is_on_leave ? (
                                    <span className="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-medium">Cuti Penuh</span>
                                  ) : person.leave_days && person.leave_days > 0 ? (
                                    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                                      Libur {person.leave_days} hr
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                                      Hadir Penuh
                                    </span>
                                  )}
                                </td>
                                <td className="text-right py-2.5 px-2.5 text-slate-600">{formatNumber(normalShare)}</td>
                                <td className="text-right py-2.5 px-2.5">
                                  {reduction > 0 ? (
                                    <span className="text-rose-600 font-medium">-{formatNumber(reduction)}</span>
                                  ) : isOwner ? (
                                    <span className="text-blue-600 font-medium">+{formatNumber(totalBaristaReductions)}</span>
                                  ) : (
                                    <span className="text-slate-400">0</span>
                                  )}
                                </td>
                                <td className={`text-right py-2.5 px-2.5 font-bold ${isOwner ? 'text-blue-700' : 'text-emerald-700'}`}>
                                  {formatNumber(person.amount)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
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
                {/* Vetted by AI - Manual Review Required by Senior Engineer/Manager */}
                <div>
                  <span className="text-sm text-gray-500">
                    Pajak{preview.calculation.basis_amount > 0 && preview.calculation.tax ? ` (${Math.round((preview.calculation.tax / preview.calculation.basis_amount) * 100)}%)` : ""}
                  </span>
                  <p className="font-medium text-red-600">-{formatNumber(preview.calculation.tax || 0)}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">
                    Biaya Layanan{preview.calculation.basis_amount > 0 && preview.calculation.service_fee ? ` (${Math.round((preview.calculation.service_fee / preview.calculation.basis_amount) * 100)}%)` : ""}
                  </span>
                  <p className="font-medium text-red-600">-{formatNumber(preview.calculation.service_fee || 0)}</p>
                </div>
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
                {/* Highlight Basis Yang Digunakan */}
                <div className="col-span-2 p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs text-indigo-700 font-semibold uppercase tracking-wider">Jenis Basis Bagi Hasil:</span>
                    <p className="text-sm font-bold text-indigo-950">
                      {preview.calculation.basis_type === 'gross' ? 'Laba Kotor (Gross Profit / Margin Penjualan)' : 'Laba Bersih (Net Profit)'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-indigo-700 font-semibold uppercase tracking-wider">Dasar Nilai Bagi Hasil:</span>
                    <p className="text-base font-bold text-indigo-900">
                      Rp {formatNumber(preview.calculation.basis_type === 'gross' ? preview.calculation.gross_profit : preview.calculation.net_profit)}
                    </p>
                  </div>
                </div>

                <div className="bg-green-50 p-3 rounded-lg"><span className="text-sm text-green-600">Bagian Keeper ({preview.calculation.ratio}%)</span><p className="font-bold text-xl text-green-700">{formatNumber(preview.calculation.keeper_share)}</p></div>
                <div className="bg-blue-50 p-3 rounded-lg"><span className="text-sm text-blue-600">Bagian Owner ({preview.calculation.owner_pct || 60}%)</span><p className="font-bold text-xl text-blue-700">{formatNumber(preview.calculation.owner_share)}</p></div>
              </div>

              {/* People Breakdown in Preview */}
              {preview.calculation.people && preview.calculation.people.length > 0 && (() => {
                const totalBaristaReductions = preview.calculation.people.reduce(
                  (sum, p) => sum + (p.role !== 'owner' ? (p.leave_reduction || 0) : 0), 0
                )
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">Rincian Pembagian per Orang</h3>
                      <span className="text-xs text-slate-500 font-medium">
                        Basis: {preview.calculation.basis_type === 'gross' ? 'Laba Kotor' : 'Laba Bersih'} (Rp {formatNumber(preview.calculation.basis_type === 'gross' ? preview.calculation.gross_profit : preview.calculation.net_profit)})
                      </span>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50 text-slate-600">
                            <th className="text-left py-2 px-2.5">Nama & Role</th>
                            <th className="text-right py-2 px-2.5">Share %</th>
                            <th className="text-center py-2 px-2.5">Kehadiran</th>
                            <th className="text-right py-2 px-2.5">Jatah Normal</th>
                            <th className="text-right py-2 px-2.5">Potongan Libur</th>
                            <th className="text-right py-2 px-2.5">Total Diterima</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.calculation.people.map((person, i) => {
                            const isOwner = person.role === 'owner'
                            const reduction = person.leave_reduction || 0
                            const normalShare = isOwner ? (person.amount - totalBaristaReductions) : (person.amount + reduction)
                            return (
                              <tr key={i} className={`border-b ${isOwner ? 'bg-blue-50/40 font-semibold' : ''}`}>
                                <td className="py-2.5 px-2.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-slate-900">{person.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isOwner ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                      {isOwner ? 'Owner' : 'Barista'}
                                    </span>
                                  </div>
                                  {isOwner && totalBaristaReductions > 0 && (
                                    <span className="text-[10px] text-blue-600 block mt-0.5">Termasuk +Rp {formatNumber(totalBaristaReductions)} dari libur barista</span>
                                  )}
                                </td>
                                <td className="text-right py-2.5 px-2.5">{person.share_pct}%</td>
                                <td className="text-center py-2.5 px-2.5">
                                  {isOwner ? (
                                    <span className="text-slate-400">-</span>
                                  ) : person.is_on_leave ? (
                                    <span className="text-xs px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-medium">Cuti Penuh</span>
                                  ) : person.leave_days && person.leave_days > 0 ? (
                                    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                                      Libur {person.leave_days} hr ({totalPeriodDays - person.leave_days}/{totalPeriodDays} hr)
                                    </span>
                                  ) : (
                                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                                      Hadir Penuh ({totalPeriodDays}/{totalPeriodDays} hr)
                                    </span>
                                  )}
                                </td>
                                <td className="text-right py-2.5 px-2.5 text-slate-600">{formatNumber(normalShare)}</td>
                                <td className="text-right py-2.5 px-2.5">
                                  {reduction > 0 ? (
                                    <span className="text-rose-600 font-medium">-{formatNumber(reduction)}</span>
                                  ) : isOwner ? (
                                    <span className="text-blue-600 font-medium">+{formatNumber(totalBaristaReductions)}</span>
                                  ) : (
                                    <span className="text-slate-400">0</span>
                                  )}
                                </td>
                                <td className={`text-right py-2.5 px-2.5 font-bold ${isOwner ? 'text-blue-700' : 'text-emerald-700'}`}>
                                  {formatNumber(person.amount)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
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

      {/* Modal Atur Libur Barista */}
      {leaveModalIndex !== null && people[leaveModalIndex] && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setLeaveModalIndex(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Atur Kehadiran: {people[leaveModalIndex].name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Periode {formatDateShort(startDate)} — {formatDateShort(endDate)} ({totalPeriodDays} hari)
                </p>
              </div>
              <button onClick={() => setLeaveModalIndex(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Ringkasan Kehadiran */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Hari</span>
                  <p className="text-base font-bold text-slate-800">{totalPeriodDays} hr</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Hari Libur</span>
                  <p className="text-base font-bold text-amber-600">{people[leaveModalIndex].leave_days || 0} hr</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Hari Masuk</span>
                  <p className="text-base font-bold text-emerald-600">{totalPeriodDays - (people[leaveModalIndex].leave_days || 0)} hr</p>
                </div>
              </div>

              {/* Status & Info Potongan */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">
                    {people[leaveModalIndex].is_on_leave
                      ? "Cuti Penuh (100% jatah dipotong)"
                      : (people[leaveModalIndex].leave_days || 0) > 0
                      ? `Kehadiran ${Math.round(((totalPeriodDays - (people[leaveModalIndex].leave_days || 0)) / totalPeriodDays) * 100)}% (${totalPeriodDays - (people[leaveModalIndex].leave_days || 0)} dari ${totalPeriodDays} hari)`
                      : "Hadir Penuh (100% jatah diterima tanpa potongan)"}
                  </p>
                  <p className="text-[11px] text-amber-800/80 mt-0.5">
                    {(people[leaveModalIndex].leave_days || 0) > 0
                      ? `Potongan libur sebesar ${Math.round(((people[leaveModalIndex].leave_days || 0) / totalPeriodDays) * 100)}% akan otomatis dialihkan menambah bagian Owner.`
                      : "Jatah bagi hasil dihitung utuh sesuai persentase."}
                  </p>
                </div>
              </div>

              {/* Pemilihan Tanggal Libur Spesifik */}
              {periodDates.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Pilih Tanggal Barista Libur / Tidak Masuk:
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 max-h-44 overflow-y-auto p-1 bg-slate-50/50 rounded-xl border border-slate-200">
                    {periodDates.map((dStr) => {
                      const currentDates = people[leaveModalIndex].leave_dates ? people[leaveModalIndex].leave_dates!.split(',').filter(Boolean) : []
                      const isOff = currentDates.includes(dStr)
                      return (
                        <button
                          key={dStr}
                          type="button"
                          onClick={() => toggleDateLeave(leaveModalIndex, dStr)}
                          className={`p-1.5 rounded-lg border text-center transition-all ${
                            isOff
                              ? 'bg-amber-500 text-white border-amber-600 font-bold shadow-sm'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 font-medium'
                          }`}
                        >
                          <div className="text-[11px] leading-tight">{formatDateShort(dStr)}</div>
                          <div className={`text-[9px] mt-0.5 ${isOff ? 'text-amber-100' : 'text-slate-400'}`}>
                            {isOff ? 'Libur' : 'Masuk'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Input Manual Jumlah Hari */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-medium text-slate-600">Atau input manual jumlah hari libur:</span>
                <div className="flex items-center gap-1.5 w-28">
                  <Input
                    type="number"
                    min={0}
                    max={totalPeriodDays}
                    value={people[leaveModalIndex].leave_days || 0}
                    onChange={(e) => setManualLeaveDays(leaveModalIndex, Number(e.target.value))}
                    className="text-right text-xs font-bold h-8"
                  />
                  <span className="text-xs text-slate-500">hari</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFullLeave(leaveModalIndex, false)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Set Hadir Penuh (0 Hari)
                </button>
                <button
                  type="button"
                  onClick={() => setFullLeave(leaveModalIndex, true)}
                  className="flex-1 py-2 rounded-lg border border-rose-200 bg-rose-50/50 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Set Cuti Penuh (100%)
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button size="sm" onClick={() => setLeaveModalIndex(null)} className="font-semibold">
                Simpan & Selesai
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
