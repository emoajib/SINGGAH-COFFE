// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import {
  Loader2, Calculator, CheckCircle, Trash2, RefreshCw, DollarSign,
  FileText, UserPlus, X, Calendar, CalendarOff, Info, Printer,
  PlusCircle, AlertCircle, ArrowDownCircle,
  Wallet, Check, Save
} from "lucide-react"
import { useProfitSharing } from "../hooks/useProfitSharing"
import { useCashbons, useCreateCashbon, useDeleteCashbon } from "../hooks/useCashbon"
import { ProfitSharingService } from "../services/profitSharingService"
import { useToast } from "../hooks/use-toast"
import { formatNumber, formatDateTime } from "../lib/utils"
import type { ProfitSharingPreview, ProfitSharingPeriod, ProfitSharingPerson, BaristaCashbon } from "../types"

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

  // Cashbon data & mutations
  const { data: cashbons = [], isLoading: loadingCashbons } = useCashbons()
  const createCashbonMutation = useCreateCashbon()
  const deleteCashbonMutation = useDeleteCashbon()

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'profit_sharing' | 'cashbons'>('profit_sharing')

  // Form preview state
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
  const [detailPeople, setDetailPeople] = useState<ProfitSharingPerson[]>([])
  const [loadingDetailPeople, setLoadingDetailPeople] = useState(false)

  // Cashbon Modal state
  const [showCashbonModal, setShowCashbonModal] = useState(false)
  const [cashbonBaristaName, setCashbonBaristaName] = useState("")
  const [cashbonDate, setCashbonDate] = useState(() => new Date().toISOString().split('T')[0])
  const [cashbonAmount, setCashbonAmount] = useState<number>(0)
  const [cashbonReason, setCashbonReason] = useState("")
  const [cashbonMethod, setCashbonMethod] = useState("Cash")
  const [cashbonFilterStatus, setCashbonFilterStatus] = useState<'all' | 'pending' | 'settled'>('all')

  // Keep detailPeople synchronized when detailPeriod changes
  useEffect(() => {
    if (detailPeriod) {
      if (detailPeriod.people && detailPeriod.people.length > 0) {
        setDetailPeople(detailPeriod.people)
      } else {
        setLoadingDetailPeople(true)
        ProfitSharingService.getPeople(detailPeriod.id)
          .then((res) => setDetailPeople(res || []))
          .catch(() => setDetailPeople([]))
          .finally(() => setLoadingDetailPeople(false))
      }
    } else {
      setDetailPeople([])
    }
  }, [detailPeriod])

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

  // Cashbon actions
  const handleCreateCashbon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cashbonBaristaName.trim()) {
      toast({ title: "Error", description: "Pilih atau ketik nama barista", variant: "error" })
      return
    }
    if (cashbonAmount <= 0) {
      toast({ title: "Error", description: "Nominal kasbon harus lebih dari 0", variant: "error" })
      return
    }
    try {
      await createCashbonMutation.mutateAsync({
        barista_name: cashbonBaristaName.trim(),
        cashbon_date: cashbonDate,
        amount: Number(cashbonAmount),
        payment_method: cashbonMethod,
        reason: cashbonReason.trim() || undefined,
      })
      toast({ title: "Berhasil", description: `Kasbon sebesar Rp ${formatNumber(cashbonAmount)} untuk ${cashbonBaristaName} berhasil dicatat`, variant: "success" })
      setShowCashbonModal(false)
      setCashbonBaristaName("")
      setCashbonAmount(0)
      setCashbonReason("")
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.error || "Gagal mencatat kasbon", variant: "error" })
    }
  }

  const handleDeleteCashbon = async (id: number) => {
    if (!confirm("Hapus catatan kasbon ini? Jika uang diambil dari kas laci tunai, mutasi kas keluar juga akan dibatalkan.")) return
    try {
      await deleteCashbonMutation.mutateAsync(id)
      toast({ title: "Berhasil", description: "Catatan kasbon berhasil dihapus", variant: "success" })
    } catch (err: any) {
      toast({ title: "Error", description: err?.response?.data?.error || "Gagal menghapus kasbon", variant: "error" })
    }
  }

  // Print slip with full Cashbon reduction breakdown
  const handlePrintProfitSharingDocument = (
    periodStart: string,
    periodEnd: string,
    _ratioVal: number,
    basisTypeVal: string,
    basisAmount: number,
    _taxVal: number,
    _serviceFeeVal: number,
    _netRev: number,
    cogsVal: number,
    grossProfitVal: number,
    expensesVal: number,
    netProfitVal: number,
    peopleList: ProfitSharingPerson[],
    expensesList: any[],
    docStatus: string = "Finalized",
    periodId?: number
  ) => {
    const isGross = basisTypeVal === 'gross'
    const basisCalcValue = isGross ? grossProfitVal : netProfitVal
    const totalBaristaLeaveReductions = peopleList.reduce(
      (sum, p) => sum + (p.role !== 'owner' ? (p.leave_reduction || 0) : 0), 0
    )
    const totalBaristaCashbonReductions = peopleList.reduce(
      (sum, p) => sum + (p.role !== 'owner' ? (p.cashbon_reduction || 0) : 0), 0
    )

    const docNo = `SC/BGH-${periodId ? String(periodId).padStart(4, '0') : new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
    const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const periodLabel = `${formatDateTime(periodStart)} — ${formatDateTime(periodEnd)}`

    const ownerPerson = peopleList.find(p => p.role === 'owner') || { name: 'Owner', role: 'owner', share_pct: 60, amount: (netProfitVal * 0.6) }
    const baristaList = peopleList.filter(p => p.role !== 'owner')

    // Collect all cashbons from people
    const attachedCashbons: BaristaCashbon[] = []
    peopleList.forEach(p => {
      if (p.cashbons && p.cashbons.length > 0) {
        p.cashbons.forEach(c => attachedCashbons.push(c))
      }
    })

    let peopleRowsHtml = ''
    peopleList.forEach((person, idx) => {
      const isOwner = person.role === 'owner'
      const leaveRed = person.leave_reduction || 0
      const cashbonRed = person.cashbon_reduction || 0
      const normalShare = isOwner
        ? (person.amount - totalBaristaLeaveReductions - totalBaristaCashbonReductions)
        : (person.gross_amount ?? (person.amount + leaveRed + cashbonRed))

      const attendText = isOwner
        ? '-'
        : person.is_on_leave
        ? 'Cuti Penuh'
        : (person.leave_days && person.leave_days > 0)
        ? `Libur ${person.leave_days} hr`
        : 'Hadir Penuh'

      peopleRowsHtml += `
        <tr style="${isOwner ? 'background-color: #f0fdf4; font-weight: bold;' : ''}">
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">
            ${person.name} <span style="font-size: 8pt; color: #475569; text-transform: uppercase;">(${isOwner ? 'Owner' : 'Barista'})</span>
            ${isOwner && totalBaristaLeaveReductions > 0 ? `<div style="font-size: 7.5pt; color: #0284c7;">+Rp ${formatNumber(totalBaristaLeaveReductions)} (libur barista)</div>` : ''}
            ${isOwner && totalBaristaCashbonReductions > 0 ? `<div style="font-size: 7.5pt; color: #16a34a;">+Rp ${formatNumber(totalBaristaCashbonReductions)} (pemulihan kasbon barista)</div>` : ''}
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">${person.share_pct}%</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${attendText}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">${formatNumber(normalShare)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; color: ${leaveRed > 0 ? '#dc2626' : isOwner && totalBaristaLeaveReductions > 0 ? '#0284c7' : '#64748b'};">
            ${leaveRed > 0 ? `-${formatNumber(leaveRed)}` : isOwner && totalBaristaLeaveReductions > 0 ? `+${formatNumber(totalBaristaLeaveReductions)}` : '0'}
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; color: ${cashbonRed > 0 ? '#dc2626' : isOwner && totalBaristaCashbonReductions > 0 ? '#16a34a' : '#64748b'};">
            ${cashbonRed > 0 ? `-${formatNumber(cashbonRed)}` : isOwner && totalBaristaCashbonReductions > 0 ? `+${formatNumber(totalBaristaCashbonReductions)}` : '0'}
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-weight: bold; color: ${isOwner ? '#1e40af' : '#047857'};">
            Rp ${formatNumber(person.amount)}
          </td>
        </tr>
      `
    })

    let cashbonRowsHtml = ''
    if (attachedCashbons.length > 0) {
      attachedCashbons.forEach((c, idx) => {
        cashbonRowsHtml += `
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">${c.cashbon_date || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px; font-weight: bold;">${c.barista_name}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">${c.reason || 'Kasbon Pribadi Barista'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center;">${c.payment_method || 'Cash'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: right; color: #dc2626; font-weight: bold;">Rp ${formatNumber(c.amount)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center; color: #16a34a; font-weight: bold;">Lunas Terpotong</td>
          </tr>
        `
      })
    }

    let expenseRowsHtml = ''
    if (expensesList && expensesList.length > 0) {
      expensesList.forEach((exp, i) => {
        expenseRowsHtml += `
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center;">${i + 1}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">${exp.date || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">${exp.title || exp.category}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">${exp.category || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">${exp.payment_method || 'Cash'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: right;">Rp ${formatNumber(exp.amount || 0)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center; font-size: 8pt;">${isGross ? 'Non-Potong (Ditanggung Owner)' : 'Memotong Laba'}</td>
          </tr>
        `
      })
    }

    let baristaSignaturesHtml = ''
    baristaList.forEach((b) => {
      baristaSignaturesHtml += `
        <div style="flex: 1; min-width: 170px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; background: #fafafa;">
          <div style="font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #334155;">Penerima (Barista)</div>
          <div style="font-size: 8pt; color: #047857; font-weight: bold; margin-top: 2px;">Hak Bersih: Rp ${formatNumber(b.amount)}</div>
          ${b.cashbon_reduction && b.cashbon_reduction > 0 ? `<div style="font-size: 7.5pt; color: #dc2626;">(Kasbon: -Rp ${formatNumber(b.cashbon_reduction)})</div>` : ''}
          <div style="height: 50px;"></div>
          <div style="border-top: 1px solid #0f172a; font-weight: bold; font-size: 9pt; padding-top: 4px;">
            ( ${b.name} )
          </div>
          <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">Tgl: ________________</div>
        </div>
      `
    })

    const printHtml = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8">
        <title>Bukti Bagi Hasil - ${periodLabel}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm 15mm 15mm; }
          body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 9.5pt; color: #0f172a; line-height: 1.35; margin: 0; padding: 0; }
          .header { text-align: center; border-bottom: 2.5px double #1e293b; padding-bottom: 8px; margin-bottom: 12px; }
          .brand { font-size: 16pt; font-weight: 800; letter-spacing: 1.5px; color: #0f172a; margin: 0; }
          .brand-sub { font-size: 8.5pt; color: #475569; margin: 2px 0 0 0; }
          .doc-badge { display: inline-block; font-size: 11pt; font-weight: 800; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px; color: #1e293b; border-bottom: 1.5px solid #1e293b; padding-bottom: 1px; }
          .meta-box { display: flex; justify-content: space-between; font-size: 8.5pt; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; }
          .meta-item { display: flex; margin-bottom: 2px; }
          .meta-lbl { width: 140px; color: #64748b; font-weight: 600; }
          .meta-val { font-weight: 700; color: #0f172a; }
          .sec-header { font-size: 9pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1e293b; margin: 10px 0 4px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 8.5pt; }
          th { background-color: #f1f5f9; color: #334155; font-weight: 700; border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 5px 6px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .sig-container { margin-top: 14px; page-break-inside: avoid; }
          .sig-title { font-size: 9pt; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; color: #1e293b; }
          .sig-flex { display: flex; gap: 12px; justify-content: space-between; }
          .sig-box-owner { width: 220px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; background: #fafafa; }
          .disclaimer { font-size: 7.5pt; color: #64748b; text-align: center; margin-top: 12px; border-top: 1px dashed #cbd5e1; padding-top: 4px; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">SINGGAH COFFEE</div>
          <div class="brand-sub">Sistem Manajemen Operasional & Keuangan Kafe • Singgah Coffee & Eatery</div>
          <div class="doc-badge">BUKTI SERAH TERIMA BAGI HASIL & REKAP KASBON</div>
        </div>

        <div class="meta-box">
          <div style="width: 50%;">
            <div class="meta-item"><span class="meta-lbl">No. Dokumen:</span><span class="meta-val">${docNo}</span></div>
            <div class="meta-item"><span class="meta-lbl">Periode:</span><span class="meta-val">${periodLabel}</span></div>
            <div class="meta-item"><span class="meta-lbl">Status Pembukuan:</span><span class="meta-val" style="color: #0369a1;">${docStatus.toUpperCase()}</span></div>
          </div>
          <div style="width: 50%;">
            <div class="meta-item"><span class="meta-lbl">Tanggal Terbit:</span><span class="meta-val">${printDate}</span></div>
            <div class="meta-item"><span class="meta-lbl">Basis Perhitungan:</span><span class="meta-val">${isGross ? 'Laba Kotor (Gross Margin)' : 'Laba Bersih (Net Profit)'}</span></div>
            <div class="meta-item"><span class="meta-lbl">Kasbon Terpotong:</span><span class="meta-val" style="color: #dc2626;">Rp ${formatNumber(totalBaristaCashbonReductions)}</span></div>
          </div>
        </div>

        <div class="sec-header">1. Ringkasan Finansial Operasional</div>
        <table>
          <thead>
            <tr>
              <th>Uraian Akun Finansial</th>
              <th class="text-right">Nominal (Rp)</th>
              <th>Keterangan / Regulasi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Pendapatan Kotor (Gross Revenue)</td>
              <td class="text-right font-bold">Rp ${formatNumber(basisAmount)}</td>
              <td>Total transaksi pesanan selesai</td>
            </tr>
            <tr>
              <td>Total Modal Bahan Baku (COGS / HPP Resep)</td>
              <td class="text-right font-bold" style="color: #b91c1c;">-Rp ${formatNumber(cogsVal)}</td>
              <td>HPP riil menu terjual</td>
            </tr>
            <tr style="background: #f8fafc; font-weight: bold;">
              <td>Laba Kotor (Gross Margin)</td>
              <td class="text-right" style="color: #047857;">Rp ${formatNumber(grossProfitVal)}</td>
              <td>Margin keuntungan murni produk</td>
            </tr>
            <tr>
              <td>Total Pengeluaran Operasional Toko</td>
              <td class="text-right font-bold" style="color: ${isGross ? '#475569' : '#dc2626'};">
                ${isGross ? '' : '-'}Rp ${formatNumber(expensesVal)}
              </td>
              <td>${isGross ? 'Non-Potong (Ditanggung Owner — tidak mengurangi hak barista)' : 'Memotong laba bersama sebelum dibagi'}</td>
            </tr>
            <tr style="background: #f1f5f9; font-weight: bold;">
              <td>Laba Bersih (Net Profit Toko)</td>
              <td class="text-right">Rp ${formatNumber(netProfitVal)}</td>
              <td>Laba setelah seluruh beban operasional</td>
            </tr>
            <tr style="background: #fef3c7; font-weight: bold; border-top: 2px solid #d97706;">
              <td style="color: #92400e; font-size: 9pt;">DASAR NILAI BAGI HASIL</td>
              <td class="text-right" style="color: #92400e; font-size: 9.5pt;">Rp ${formatNumber(basisCalcValue)}</td>
              <td style="color: #92400e;">Basis perhitungan porsi Owner & Barista</td>
            </tr>
          </tbody>
        </table>

        <div class="sec-header">2. Rincian Hak Penerimaan per Orang & Potongan Kasbon</div>
        <table>
          <thead>
            <tr>
              <th style="width: 25px;" class="text-center">No</th>
              <th>Nama & Jabatan</th>
              <th class="text-right" style="width: 55px;">Porsi %</th>
              <th class="text-center" style="width: 85px;">Kehadiran</th>
              <th class="text-right" style="width: 90px;">Jatah Normal</th>
              <th class="text-right" style="width: 85px;">Potong Libur</th>
              <th class="text-right" style="width: 90px;">Potong Kasbon</th>
              <th class="text-right" style="width: 105px;">Total Diterima</th>
            </tr>
          </thead>
          <tbody>
            ${peopleRowsHtml}
          </tbody>
        </table>

        ${cashbonRowsHtml ? `
          <div class="sec-header">3. Rincian Kasbon Barista (Dipotongkan dari Bagi Hasil & Dipulihkan ke Owner)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 25px;" class="text-center">No</th>
                <th style="width: 80px;">Tanggal</th>
                <th>Nama Barista</th>
                <th>Keterangan / Keperluan</th>
                <th style="width: 75px;" class="text-center">Metode</th>
                <th class="text-right" style="width: 95px;">Nominal (Rp)</th>
                <th class="text-center" style="width: 100px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${cashbonRowsHtml}
              <tr style="background: #f8fafc; font-weight: bold;">
                <td colspan="5" class="text-right">Total Kasbon Terpotong:</td>
                <td class="text-right" style="color: #dc2626;">Rp ${formatNumber(totalBaristaCashbonReductions)}</td>
                <td class="text-center" style="color: #16a34a;">Lunas (Settled)</td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        ${expenseRowsHtml ? `
          <div class="sec-header">4. Rincian Nota Belanja Operasional Toko</div>
          <table>
            <thead>
              <tr>
                <th style="width: 25px;" class="text-center">No</th>
                <th style="width: 75px;">Tanggal</th>
                <th>Nota / Kebutuhan Belanja</th>
                <th style="width: 80px;">Kategori</th>
                <th style="width: 80px;">Metode</th>
                <th class="text-right" style="width: 95px;">Nominal (Rp)</th>
                <th class="text-center" style="width: 130px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${expenseRowsHtml}
              <tr style="background: #f8fafc; font-weight: bold;">
                <td colspan="5" class="text-right">Total Beban Operasional:</td>
                <td class="text-right">Rp ${formatNumber(expensesVal)}</td>
                <td class="text-center">${isGross ? 'Ditanggung Owner' : 'Dipotongkan'}</td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        <div class="sig-container">
          <div class="sig-title">Lembar Pengesahan Serah Terima Dana Bagi Hasil</div>
          <div class="sig-flex">
            <!-- TTD OWNER -->
            <div class="sig-box-owner">
              <div style="font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #1e3a8a;">Pihak Menyerahkan (Owner)</div>
              <div style="font-size: 8pt; color: #1e40af; font-weight: bold; margin-top: 2px;">Hak Owner: Rp ${formatNumber(ownerPerson.amount)}</div>
              <div style="height: 50px;"></div>
              <div style="border-top: 1px solid #0f172a; font-weight: bold; font-size: 9pt; padding-top: 4px;">
                ( ${ownerPerson.name || 'Owner / Pengelola'} )
              </div>
              <div style="font-size: 8pt; color: #64748b; margin-top: 2px;">Tgl: ________________</div>
            </div>

            <!-- TTD BARISTAS -->
            <div style="flex: 1; display: flex; gap: 10px; flex-wrap: wrap;">
              ${baristaSignaturesHtml}
            </div>
          </div>
        </div>

        <div class="disclaimer">
          Dokumen bukti serah terima ini dibuat secara sah dan transparan melalui Sistem POS Singgah Coffee sebagai bukti pertanggungjawaban kas dan kesepakatan pembagian hasil usaha yang mengikat seluruh pihak.
        </div>
      </body>
      </html>
    `

    const printWin = window.open('', '_blank', 'width=900,height=800')
    if (printWin) {
      printWin.document.open()
      printWin.document.write(printHtml)
      printWin.document.close()
      printWin.focus()
      setTimeout(() => {
        printWin.print()
      }, 500)
    }
  }

  const handleSaveDraft = () => {
    setShowPreview(false)
    toast({
      title: "Draft Tersimpan",
      description: "Data draft bagi hasil tersimpan di Daftar Periode. Anda dapat memperbarui data atau memprosesnya kapan saja.",
      variant: "success",
    })
  }

  const handleFinalize = async (id: number) => {
    const isConfirmed = window.confirm(
      "Proses Bagi Hasil Periode Ini?\n\n" +
      "1. Kasbon barista yang dipotongkan akan otomatis ditandai LUNAS (Settled).\n" +
      "2. Pembagian bagi hasil barista otomatis dicatatkan ke Data Pengeluaran (Kategori: Gaji & Upah).\n" +
      "3. Serah terima kas akan dicatat ke Buku Kas Toko.\n\n" +
      "Lanjutkan pemrosesan bagi hasil?"
    )
    if (!isConfirmed) return

    try {
      await finalizeMutation.mutateAsync({ id, ratio })
      toast({
        title: "Bagi Hasil Berhasil Diproses",
        description: "Periode telah diproses, kasbon barista dilunaskan, dan pembayaran tercatat di Pengeluaran (Gaji & Upah).",
        variant: "success",
      })
      setShowPreview(false)
      if (detailPeriod && detailPeriod.id === id) {
        setDetailPeriod(null)
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.error || "Gagal memproses bagi hasil", variant: "error" })
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

  const handleRecalculate = async (id: number, customRatio?: number) => {
    try {
      const r = customRatio ?? (detailPeriod?.id === id ? detailPeriod.ratio : ratio)
      await recalculateMutation.mutateAsync({ id, ratio: r })
      toast({ title: "Berhasil", description: "Data draft berhasil disinkronkan & dihitung ulang dengan kasbon terbaru", variant: "success" })
      if (detailPeriod && detailPeriod.id === id) {
        const refreshedList = await ProfitSharingService.getAll()
        const found = refreshedList.find(p => p.id === id)
        if (found) {
          setDetailPeriod(found)
          const pList = await ProfitSharingService.getPeople(id)
          setDetailPeople(pList || [])
        }
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.error || "Gagal hitung ulang", variant: "error" })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus periode ini?")) return
    try {
      await deleteMutation.mutateAsync(id)
      toast({ title: "Berhasil", description: "Periode berhasil dihapus", variant: "success" })
      if (detailPeriod && detailPeriod.id === id) {
        setDetailPeriod(null)
      }
    } catch (e: any) {
      toast({ title: "Error", description: e?.response?.data?.error || "Gagal hapus", variant: "error" })
    }
  }

  // Summary Metrics for Cashbon
  const pendingCashbons = useMemo(() => cashbons.filter(c => c.status === 'pending'), [cashbons])
  const totalPendingCashbon = useMemo(() => pendingCashbons.reduce((s, c) => s + c.amount, 0), [pendingCashbons])
  const settledCashbons = useMemo(() => cashbons.filter(c => c.status === 'settled'), [cashbons])
  const totalSettledCashbon = useMemo(() => settledCashbons.reduce((s, c) => s + c.amount, 0), [settledCashbons])

  const filteredCashbons = useMemo(() => {
    if (cashbonFilterStatus === 'all') return cashbons
    return cashbons.filter(c => c.status === cashbonFilterStatus)
  }, [cashbons, cashbonFilterStatus])

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bagi Hasil & Kasbon Barista</h1>
          <p className="text-sm text-gray-500">Hitung keuntungan owner, potongan kasbon barista, dan serah terima kas</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
          <Button
            variant={activeTab === 'profit_sharing' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('profit_sharing')}
            className={`gap-1.5 rounded-lg text-xs font-semibold ${activeTab === 'profit_sharing' ? 'shadow' : 'text-slate-600'}`}
          >
            <Calculator className="w-4 h-4" />
            Bagi Hasil
          </Button>
          <Button
            variant={activeTab === 'cashbons' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('cashbons')}
            className={`gap-1.5 rounded-lg text-xs font-semibold relative ${activeTab === 'cashbons' ? 'shadow' : 'text-slate-600'}`}
          >
            <Wallet className="w-4 h-4" />
            Kasbon Barista
            {pendingCashbons.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold animate-pulse">
                {pendingCashbons.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* ================= TAB 1: BAGI HASIL ================= */}
      {activeTab === 'profit_sharing' && (
        <div className="space-y-6">
          {/* Quick Notice if there are pending cashbons */}
          {pendingCashbons.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-amber-950">
                    Terdapat {pendingCashbons.length} Kasbon Barista Aktif (Total Rp {formatNumber(totalPendingCashbon)})
                  </h4>
                  <p className="text-xs text-amber-800/90 mt-0.5">
                    Kasbon ini otomatis memotong jatah bagi hasil barista saat Anda menghitung preview atau menyinkronkan draft bagi hasil.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab('cashbons')}
                  className="bg-white text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                >
                  Kelola Kasbon
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowCashbonModal(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> + Kasbon
                </Button>
              </div>
            </div>
          )}

          {/* Preview Form */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  Hitung Preview Bagi Hasil
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCashbonModal(true)}
                  className="text-xs gap-1 border-slate-300"
                >
                  <Wallet className="w-3.5 h-3.5 text-amber-600" />
                  + Catat Kasbon Barista
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Mulai</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jam Mulai</label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Akhir</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jam Akhir</label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Rasio Keeper (%)</label>
                  <Input type="number" min={0} max={100} value={ratio} onChange={(e) => setRatio(Number(e.target.value))} />
                </div>
              </div>

              {/* Multi-Person Settings */}
              <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">Pengaturan Porsi & Kehadiran Barista</h3>
                    <p className="text-xs text-gray-500">Tentukan persentase owner vs barista serta tanggal libur</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowAddPerson(true)}>
                    <UserPlus className="w-4 h-4 mr-1 text-primary" /> Tambah Orang
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Basis Bagi Hasil</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-xs font-bold text-slate-800 bg-white"
                      value={basisType}
                      onChange={(e) => setBasisType(e.target.value)}
                    >
                      <option value="net">Laba Bersih (Net Profit — Dikurangi Pengeluaran Operasional)</option>
                      <option value="gross">Laba Kotor (Gross Profit — Murni Margin Penjualan Menu)</option>
                    </select>
                    <div className="mt-1.5 p-2 rounded-lg text-xs font-medium border bg-white">
                      {basisType === 'gross' ? (
                        <div className="flex items-start gap-1.5 text-blue-800">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600" />
                          <span>
                            <strong>Laba Kotor (Gross Margin):</strong> Bagi hasil murni dari margin penjualan (Omzet - HPP). Beban operasional toko <u>tidak memotong</u> jatah barista.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1.5 text-amber-900">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                          <span>
                            <strong>Laba Bersih (Net Profit):</strong> Beban operasional toko <u>dipotong terlebih dahulu</u> dari laba kotor sebelum dibagi ke Owner & Barista.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Owner %</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={ownerPct}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(100, Number(e.target.value) || 0))
                        setOwnerPct(val)
                      }}
                      className="font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Total Barista %</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={100 - ownerPct}
                      onChange={(e) => {
                        const baristaVal = Math.max(0, Math.min(100, Number(e.target.value) || 0))
                        setOwnerPct(100 - baristaVal)
                      }}
                      className="font-bold text-sm bg-indigo-50/50 border-indigo-200 text-indigo-900 focus:border-indigo-400"
                      title="Ketik di sini untuk langsung mengubah total jatah barista (Owner % otomatis menyesuaikan)"
                    />
                  </div>
                </div>

                {/* People List */}
                <div className="space-y-2.5">
                  {people.map((person, index) => {
                    const isOwner = person.role === 'owner'
                    const leaveDays = person.leave_days || 0
                    const isFullLeave = person.is_on_leave

                    // Check if this barista has active pending cashbon
                    const baristaPendingCashbon = !isOwner
                      ? pendingCashbons.filter(c => c.barista_name.toLowerCase().trim() === person.name.toLowerCase().trim())
                      : []
                    const baristaPendingTotal = baristaPendingCashbon.reduce((s, c) => s + c.amount, 0)

                    return (
                      <div key={index} className="flex flex-wrap items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-colors">
                        <span className={`text-xs px-2.5 py-1 rounded-md font-bold uppercase tracking-wider ${isOwner ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                          {isOwner ? 'Owner' : 'Barista'}
                        </span>
                        <div className="flex-1 min-w-[140px]">
                          <span className="text-sm font-semibold text-slate-900 block">{person.name}</span>
                          {!isOwner && baristaPendingTotal > 0 && (
                            <span className="inline-flex items-center text-[11px] text-rose-600 font-semibold gap-1">
                              <Wallet className="w-3 h-3 text-rose-500" />
                              Kasbon aktif: Rp {formatNumber(baristaPendingTotal)}
                            </span>
                          )}
                        </div>
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
                  <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
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
                        className="w-20 font-bold"
                      />
                      <span className="text-sm text-gray-500">%</span>
                      <Button size="sm" onClick={addPerson}>Tambah</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddPerson(false)}>Batal</Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={handlePreview} disabled={previewMutation.isPending} className="w-full md:w-auto font-bold">
                  {previewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                  Hitung Preview Bagi Hasil
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Periods Table */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Daftar Periode Bagi Hasil
                </div>
                <span className="text-xs text-slate-500 font-normal">
                  Draft dapat disinkronkan & dihitung ulang sewaktu-waktu sebelum di-finalize
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : periods.length === 0 ? (
                <p className="text-center text-gray-500 py-8 text-sm">Belum ada periode bagi hasil</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-slate-600">
                        <th className="text-left py-3 px-3">Periode</th>
                        <th className="text-right py-3 px-3">Omzet Basis</th>
                        <th className="text-right py-3 px-3">Laba Bersih</th>
                        <th className="text-right py-3 px-3">Jatah Barista</th>
                        <th className="text-right py-3 px-3">Jatah Owner</th>
                        <th className="text-center py-3 px-3">Status</th>
                        <th className="text-center py-3 px-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map((p) => (
                        <tr key={p.id} className="border-b hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{formatDateTime(p.period_start)} — {formatDateTime(p.period_end)}</div>
                            <span className="text-[10px] text-slate-500">Basis: {p.basis_type === 'gross' ? 'Laba Kotor' : 'Laba Bersih'} (Rasio {p.ratio}%)</span>
                          </td>
                          <td className="py-3 px-3 text-right font-medium">{formatNumber(p.basis_amount)}</td>
                          <td className="py-3 px-3 text-right font-medium">{formatNumber(p.net_profit)}</td>
                          <td className="py-3 px-3 text-right text-emerald-600 font-bold">{formatNumber(p.keeper_amount)}</td>
                          <td className="py-3 px-3 text-right text-blue-600 font-bold">{formatNumber(p.owner_amount)}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[p.status] || "bg-gray-100"}`}>
                              {STATUS_LABELS[p.status] || p.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDetailPeriod(p)}
                                title="Lihat Detail & Cetak Bukti"
                              >
                                <FileText className="w-4 h-4 text-slate-600" />
                              </Button>

                              {p.status === "draft" && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRecalculate(p.id, p.ratio)}
                                    disabled={recalculateMutation.isPending}
                                    className="h-7 px-2 text-[11px] font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1"
                                    title="Sinkronkan & Hitung Ulang Draft dengan data kasbon & transaksi terbaru"
                                  >
                                    {recalculateMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                    Update Data
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleFinalize(p.id)}
                                    disabled={finalizeMutation.isPending}
                                    className="h-7 px-2 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-xs"
                                    title="Proses Bagi Hasil, lunasi kasbon, dan catat ke Pengeluaran (Gaji & Upah)"
                                  >
                                    {finalizeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                    Proses Bagi Hasil
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(p.id)}
                                    disabled={deleteMutation.isPending}
                                    className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                                    title="Hapus Draft"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}

                              {p.status === "finalized" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMarkPaid(p.id)}
                                    disabled={markPaidMutation.isPending}
                                    title="Tandai Sudah Dibayar"
                                  >
                                    <DollarSign className="w-4 h-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(p.id)}
                                    disabled={deleteMutation.isPending}
                                    title="Hapus Periode"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </>
                              )}

                              {p.status === "paid" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRecalculate(p.id, p.ratio)}
                                    disabled={recalculateMutation.isPending}
                                    title="Hitung Ulang & Buka Kembali"
                                  >
                                    <RefreshCw className="w-4 h-4 text-orange-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(p.id)}
                                    disabled={deleteMutation.isPending}
                                    title="Hapus Periode"
                                  >
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
        </div>
      )}

      {/* ================= TAB 2: KASBON BARISTA ================= */}
      {activeTab === 'cashbons' && (
        <div className="space-y-6">
          {/* Executive KPI Cards for Cashbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kasbon Aktif (Pending)</span>
                <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <ArrowDownCircle className="w-5 h-5" />
                </span>
              </div>
              <p className="text-2xl font-extrabold text-amber-600 mt-2">Rp {formatNumber(totalPendingCashbon)}</p>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                <span className="font-bold text-slate-700">{pendingCashbons.length} catatan</span>
                <span>• Akan memotong bagi hasil draft</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kasbon Terpotong (Lunas)</span>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                </span>
              </div>
              <p className="text-2xl font-extrabold text-emerald-600 mt-2">Rp {formatNumber(totalSettledCashbon)}</p>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                <span className="font-bold text-slate-700">{settledCashbons.length} catatan</span>
                <span>• Sudah dipotongkan ke owner</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-5 rounded-2xl shadow-sm text-white flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Aksi Owner</span>
                <p className="text-sm text-slate-200 mt-1">Catat kasbon baru dengan metode Kas Laci (Tunai) atau Transfer</p>
              </div>
              <div className="mt-4">
                <Button
                  onClick={() => setShowCashbonModal(true)}
                  className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold gap-2 text-xs"
                >
                  <PlusCircle className="w-4 h-4" /> + Catat Kasbon Barista
                </Button>
              </div>
            </div>
          </div>

          {/* Cashbon Management Table */}
          <Card>
            <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                Daftar Catatan Kasbon Barista
              </CardTitle>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setCashbonFilterStatus('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${cashbonFilterStatus === 'all' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Semua ({cashbons.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCashbonFilterStatus('pending')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${cashbonFilterStatus === 'pending' ? 'bg-white shadow text-amber-700' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Pending ({pendingCashbons.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCashbonFilterStatus('settled')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${cashbonFilterStatus === 'settled' ? 'bg-white shadow text-emerald-700' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Settled ({settledCashbons.length})
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingCashbons ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : filteredCashbons.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium">Tidak ada data kasbon barista untuk filter ini.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50 text-slate-600">
                        <th className="text-left py-3 px-3">Tanggal</th>
                        <th className="text-left py-3 px-3">Nama Barista</th>
                        <th className="text-left py-3 px-3">Keperluan / Alasan</th>
                        <th className="text-center py-3 px-3">Metode Bayar</th>
                        <th className="text-right py-3 px-3">Nominal (Rp)</th>
                        <th className="text-center py-3 px-3">Status</th>
                        <th className="text-center py-3 px-3">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCashbons.map((cb) => {
                        const isPending = cb.status === 'pending'
                        return (
                          <tr key={cb.id} className="border-b hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">{cb.cashbon_date}</td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-900">{cb.barista_name}</span>
                            </td>
                            <td className="py-3 px-3 text-slate-600">
                              {cb.reason || <span className="text-slate-400 italic">Kasbon Barista</span>}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${cb.payment_method === 'Cash' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                {cb.payment_method || 'Cash'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-extrabold text-rose-600 whitespace-nowrap">
                              Rp {formatNumber(cb.amount)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {isPending ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                  Pending (Belum Dipotong)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Lunas (Periode #{cb.period_id})
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {isPending ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteCashbon(cb.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1"
                                  title="Hapus kasbon (batalkan)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              ) : (
                                <span className="text-slate-400 text-xs italic">-</span>
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
        </div>
      )}

      {/* ================= MODAL: DETAIL PERIODE ================= */}
      {detailPeriod && (() => {
        const effectivePeople = (detailPeriod.people && detailPeriod.people.length > 0) ? detailPeriod.people : detailPeople
        const isGross = detailPeriod.basis_type === 'gross'
        const grossMarginVal = detailPeriod.basis_amount - detailPeriod.total_cogs
        const basisCalcVal = isGross ? grossMarginVal : detailPeriod.net_profit
        const isDraft = detailPeriod.status === 'draft'

        const expensesList: any[] = (() => {
          if (!detailPeriod.expenses_breakdown) return []
          try {
            return JSON.parse(detailPeriod.expenses_breakdown)
          } catch {
            return []
          }
        })()

        const totalBaristaLeaveReductions = effectivePeople.reduce(
          (sum, p) => sum + (p.role !== 'owner' ? (p.leave_reduction || 0) : 0), 0
        )
        const totalBaristaCashbonReductions = effectivePeople.reduce(
          (sum, p) => sum + (p.role !== 'owner' ? (p.cashbon_reduction || 0) : 0), 0
        )

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailPeriod(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      Detail Periode: {formatDateTime(detailPeriod.period_start)} — {formatDateTime(detailPeriod.period_end)}
                    </h2>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[detailPeriod.status]}`}>
                      {STATUS_LABELS[detailPeriod.status] || detailPeriod.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Sistem Bagi Hasil Transparan Singgah Coffee & Rekap Kasbon Barista</p>
                </div>
                <div className="flex items-center gap-2">
                  {isDraft && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRecalculate(detailPeriod.id, detailPeriod.ratio)}
                      disabled={recalculateMutation.isPending}
                      className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 gap-1.5 text-xs font-semibold"
                      title="Sinkronkan transaksi penjualan & kasbon terbaru ke draft ini"
                    >
                      {recalculateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Sinkronkan Data
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handlePrintProfitSharingDocument(
                      detailPeriod.period_start,
                      detailPeriod.period_end,
                      detailPeriod.ratio,
                      detailPeriod.basis_type || 'net',
                      detailPeriod.basis_amount,
                      0,
                      0,
                      detailPeriod.basis_amount,
                      detailPeriod.total_cogs,
                      grossMarginVal,
                      detailPeriod.total_expenses,
                      detailPeriod.net_profit,
                      effectivePeople,
                      expensesList,
                      detailPeriod.status,
                      detailPeriod.id
                    )}
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-sm text-xs font-semibold"
                  >
                    <Printer className="w-3.5 h-3.5" /> Cetak Bukti (TTD)
                  </Button>
                  <button onClick={() => setDetailPeriod(null)} className="text-gray-400 hover:text-gray-600 p-1 text-xl">&times;</button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Financial Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Pendapatan Kotor</span>
                    <p className="font-bold text-slate-900 text-base mt-0.5">Rp {formatNumber(detailPeriod.basis_amount)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Total HPP (Modal Menu)</span>
                    <p className="font-bold text-rose-600 text-base mt-0.5">-Rp {formatNumber(detailPeriod.total_cogs)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Laba Kotor (Gross)</span>
                    <p className="font-bold text-emerald-600 text-base mt-0.5">Rp {formatNumber(grossMarginVal)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Pengeluaran Operasional</span>
                    <p className="font-bold text-slate-900 text-base mt-0.5">Rp {formatNumber(detailPeriod.total_expenses)}</p>
                    <span className="text-[10px] text-slate-400 block">{isGross ? 'Non-potong' : 'Memotong'}</span>
                  </div>
                </div>

                {/* Highlight Basis & Allocation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-200">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Dasar Nilai Bagi Hasil</span>
                    <p className="text-lg font-extrabold text-amber-950 mt-0.5">Rp {formatNumber(basisCalcVal)}</p>
                    <span className="text-[11px] text-amber-800">
                      Basis: {isGross ? 'Laba Kotor' : 'Laba Bersih'} (Rasio Keeper {detailPeriod.ratio}%)
                    </span>
                  </div>

                  <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Total Bagian Barista</span>
                    <p className="text-lg font-extrabold text-emerald-900 mt-0.5">Rp {formatNumber(detailPeriod.keeper_amount)}</p>
                    <span className="text-[11px] text-emerald-700">
                      {totalBaristaCashbonReductions > 0 ? `Sudah dipotong kasbon Rp ${formatNumber(totalBaristaCashbonReductions)}` : 'Tanpa potongan kasbon'}
                    </span>
                  </div>

                  <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200">
                    <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">Total Bagian Owner</span>
                    <p className="text-lg font-extrabold text-blue-900 mt-0.5">Rp {formatNumber(detailPeriod.owner_amount)}</p>
                    <span className="text-[11px] text-blue-700">
                      {totalBaristaCashbonReductions > 0 ? `Termasuk pemulihan kasbon Rp ${formatNumber(totalBaristaCashbonReductions)}` : 'Porsi murni'}
                    </span>
                  </div>
                </div>

                {/* People List in Detail Modal */}
                {loadingDetailPeople && effectivePeople.length === 0 ? (
                  <div className="flex items-center justify-center p-6 text-xs text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuat rincian pembagian per orang...
                  </div>
                ) : effectivePeople.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm text-slate-900">Rincian Hak Pembagian per Orang</h3>
                      <span className="text-xs text-slate-500 font-medium">Konservasi Kas: Total Barista + Owner = Basis Bagi Hasil</span>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                      <table className="w-full text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50 text-slate-600">
                            <th className="text-left py-2.5 px-3">Nama & Jabatan</th>
                            <th className="text-right py-2.5 px-3">Porsi %</th>
                            <th className="text-center py-2.5 px-3">Kehadiran</th>
                            <th className="text-right py-2.5 px-3">Jatah Normal</th>
                            <th className="text-right py-2.5 px-3">Potong Libur</th>
                            <th className="text-right py-2.5 px-3">Potong Kasbon</th>
                            <th className="text-right py-2.5 px-3">Total Bersih Diterima</th>
                          </tr>
                        </thead>
                        <tbody>
                          {effectivePeople.map((person, i) => {
                            const isOwner = person.role === 'owner'
                            const leaveRed = person.leave_reduction || 0
                            const cashbonRed = person.cashbon_reduction || 0
                            const normalShare = isOwner
                              ? (person.amount - totalBaristaLeaveReductions - totalBaristaCashbonReductions)
                              : (person.gross_amount ?? (person.amount + leaveRed + cashbonRed))

                            return (
                              <tr key={i} className={`border-b ${isOwner ? 'bg-blue-50/40 font-semibold' : ''}`}>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900">{person.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isOwner ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                      {isOwner ? 'Owner' : 'Barista'}
                                    </span>
                                  </div>
                                  {isOwner && totalBaristaCashbonReductions > 0 && (
                                    <span className="text-[10px] text-emerald-600 block mt-0.5">
                                      Termasuk +Rp {formatNumber(totalBaristaCashbonReductions)} dari kasbon barista yang dipulihkan
                                    </span>
                                  )}
                                  {isOwner && totalBaristaLeaveReductions > 0 && (
                                    <span className="text-[10px] text-blue-600 block mt-0.5">
                                      Termasuk +Rp {formatNumber(totalBaristaLeaveReductions)} dari potongan libur barista
                                    </span>
                                  )}
                                </td>
                                <td className="text-right py-2.5 px-3">{person.share_pct}%</td>
                                <td className="text-center py-2.5 px-3">
                                  {isOwner ? (
                                    <span className="text-slate-400">-</span>
                                  ) : person.is_on_leave ? (
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold">Cuti Penuh</span>
                                  ) : person.leave_days && person.leave_days > 0 ? (
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                                      Libur {person.leave_days} hr
                                    </span>
                                  ) : (
                                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                                      Hadir Penuh
                                    </span>
                                  )}
                                </td>
                                <td className="text-right py-2.5 px-3 text-slate-600">{formatNumber(normalShare)}</td>
                                <td className="text-right py-2.5 px-3">
                                  {leaveRed > 0 ? (
                                    <span className="text-rose-600 font-semibold">-{formatNumber(leaveRed)}</span>
                                  ) : isOwner && totalBaristaLeaveReductions > 0 ? (
                                    <span className="text-blue-600 font-semibold">+{formatNumber(totalBaristaLeaveReductions)}</span>
                                  ) : (
                                    <span className="text-slate-400">0</span>
                                  )}
                                </td>
                                <td className="text-right py-2.5 px-3">
                                  {cashbonRed > 0 ? (
                                    <span className="text-rose-600 font-bold">-{formatNumber(cashbonRed)}</span>
                                  ) : isOwner && totalBaristaCashbonReductions > 0 ? (
                                    <span className="text-emerald-600 font-bold">+{formatNumber(totalBaristaCashbonReductions)}</span>
                                  ) : (
                                    <span className="text-slate-400">0</span>
                                  )}
                                </td>
                                <td className={`text-right py-2.5 px-3 font-extrabold ${isOwner ? 'text-blue-700' : 'text-emerald-700'}`}>
                                  Rp {formatNumber(person.amount)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub-table for deducted cashbons */}
                {totalBaristaCashbonReductions > 0 && (
                  <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-amber-700" />
                      Rincian Kasbon Barista yang Terpotong pada Periode Ini:
                    </h4>
                    <p className="text-xs text-amber-800">
                      Total kasbon sebesar <strong>Rp {formatNumber(totalBaristaCashbonReductions)}</strong> telah memotong hak barista dan masuk ke penerimaan Owner untuk menggantikan uang toko yang sebelumnya diambil.
                    </p>
                  </div>
                )}

                {/* Expenses Breakdown */}
                {expensesList.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-sm text-slate-900">Rincian Pengeluaran Operasional Toko</h3>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${isGross ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                        {isGross ? 'Ditanggung Owner' : 'Memotong Bagi Hasil'}
                      </span>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm max-h-56 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-slate-50 text-slate-600">
                            <th className="text-left py-2 px-2.5">No</th>
                            <th className="text-left py-2 px-2.5">Tanggal</th>
                            <th className="text-left py-2 px-2.5">Nota / Belanja</th>
                            <th className="text-left py-2 px-2.5">Kategori</th>
                            <th className="text-left py-2 px-2.5">Metode</th>
                            <th className="text-right py-2 px-2.5">Nominal (Rp)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expensesList.map((exp: any, i: number) => (
                            <tr key={i} className="border-b hover:bg-slate-50/50">
                              <td className="py-2 px-2.5 text-slate-400">{i + 1}</td>
                              <td className="py-2 px-2.5 text-slate-600 whitespace-nowrap">{exp.date || '-'}</td>
                              <td className="py-2 px-2.5 font-medium text-slate-900">{exp.title || exp.category}</td>
                              <td className="py-2 px-2.5 text-slate-500">{exp.category}</td>
                              <td className="py-2 px-2.5 text-slate-500">{exp.payment_method || 'Cash'}</td>
                              <td className="py-2 px-2.5 text-right font-medium text-slate-800">{formatNumber(exp.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Modal Footer with Actions */}
                <div className="pt-4 border-t flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => handlePrintProfitSharingDocument(
                      detailPeriod.period_start,
                      detailPeriod.period_end,
                      detailPeriod.ratio,
                      detailPeriod.basis_type || 'net',
                      detailPeriod.basis_amount,
                      0,
                      0,
                      detailPeriod.basis_amount,
                      detailPeriod.total_cogs,
                      grossMarginVal,
                      detailPeriod.total_expenses,
                      detailPeriod.net_profit,
                      effectivePeople,
                      expensesList,
                      detailPeriod.status,
                      detailPeriod.id
                    )}
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-semibold text-xs"
                  >
                    <Printer className="w-4 h-4" /> Cetak Bukti Bagi Hasil & Kasbon (TTD)
                  </Button>
                  <div className="flex gap-2">
                    {isDraft && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRecalculate(detailPeriod.id, detailPeriod.ratio)}
                          disabled={recalculateMutation.isPending}
                          className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold gap-1.5"
                          title="Sinkronkan dengan kasbon & transaksi terbaru"
                        >
                          {recalculateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Update Data
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleFinalize(detailPeriod.id)}
                          disabled={finalizeMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                          title="Proses Bagi Hasil, lunasi kasbon, dan catat ke Pengeluaran (Gaji & Upah)"
                        >
                          <CheckCircle className="w-4 h-4" /> Proses Bagi Hasil
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setDetailPeriod(null)} className="text-xs">
                      Tutup
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ================= MODAL: PREVIEW BAGI HASIL ================= */}
      {showPreview && preview && (() => {
        const totalBaristaLeaveReductions = (preview.calculation.people || []).reduce(
          (sum, p) => sum + (p.role !== 'owner' ? (p.leave_reduction || 0) : 0), 0
        )
        const totalBaristaCashbonReductions = (preview.calculation.people || []).reduce(
          (sum, p) => sum + (p.role !== 'owner' ? (p.cashbon_reduction || 0) : 0), 0
        )

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b flex items-center justify-between bg-slate-50/50 rounded-t-2xl">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Preview Perhitungan Bagi Hasil</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {startDate && endDate
                      ? `${formatDateTime(`${startDate}T${startTime}:00+07:00`)} — ${formatDateTime(`${endDate}T${endTime}:00+07:00`)}`
                      : `${formatDateTime(preview.period.period_start)} — ${formatDateTime(preview.period.period_end)}`}
                  </p>
                </div>
                <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Pendapatan Kotor</span>
                    <p className="font-bold text-slate-900 mt-0.5">Rp {formatNumber(preview.calculation.basis_amount)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Total COGS (HPP)</span>
                    <p className="font-bold text-rose-600 mt-0.5">-Rp {formatNumber(preview.calculation.total_cogs)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Laba Kotor</span>
                    <p className="font-bold text-emerald-600 mt-0.5">Rp {formatNumber(preview.calculation.gross_profit)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Laba Bersih</span>
                    <p className="font-bold text-slate-900 mt-0.5">Rp {formatNumber(preview.calculation.net_profit)}</p>
                  </div>
                </div>

                {/* Highlight Basis Card */}
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Dasar Nilai Bagi Hasil:</span>
                    <p className="text-sm text-indigo-700">
                      Basis: {preview.calculation.basis_type === 'gross' ? 'Laba Kotor' : 'Laba Bersih'} (Rasio {preview.calculation.ratio}%)
                    </p>
                  </div>
                  <p className="text-xl font-extrabold text-indigo-950">
                    Rp {formatNumber(preview.calculation.basis_type === 'gross' ? preview.calculation.gross_profit : preview.calculation.net_profit)}
                  </p>
                </div>

                {/* Alert regarding barista cashbon deduction */}
                {totalBaristaCashbonReductions > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5">
                    <Wallet className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900">
                      <p className="font-bold">Kasbon Barista Terdeteksi: Rp {formatNumber(totalBaristaCashbonReductions)}</p>
                      <p className="mt-0.5">
                        Kasbon barista otomatis dipotongkan dari jatah barista terkait dan dikembalikan ke bagian Owner untuk memulihkan kas toko.
                      </p>
                    </div>
                  </div>
                )}

                {/* People Table in Preview */}
                {preview.calculation.people && preview.calculation.people.length > 0 && (
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 mb-2">Rincian Pembagian per Orang</h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                      <table className="w-full text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50 text-slate-600">
                            <th className="text-left py-2 px-3">Nama & Role</th>
                            <th className="text-right py-2 px-3">Share %</th>
                            <th className="text-center py-2 px-3">Kehadiran</th>
                            <th className="text-right py-2 px-3">Jatah Normal</th>
                            <th className="text-right py-2 px-3">Potong Libur</th>
                            <th className="text-right py-2 px-3">Potong Kasbon</th>
                            <th className="text-right py-2 px-3">Total Bersih</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.calculation.people.map((person, i) => {
                            const isOwner = person.role === 'owner'
                            const leaveRed = person.leave_reduction || 0
                            const cashbonRed = person.cashbon_reduction || 0
                            const normalShare = isOwner
                              ? (person.amount - totalBaristaLeaveReductions - totalBaristaCashbonReductions)
                              : (person.gross_amount ?? (person.amount + leaveRed + cashbonRed))

                            return (
                              <tr key={i} className={`border-b ${isOwner ? 'bg-blue-50/40 font-semibold' : ''}`}>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900">{person.name}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isOwner ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                      {isOwner ? 'Owner' : 'Barista'}
                                    </span>
                                  </div>
                                </td>
                                <td className="text-right py-2.5 px-3">{person.share_pct}%</td>
                                <td className="text-center py-2.5 px-3">
                                  {isOwner ? (
                                    <span className="text-slate-400">-</span>
                                  ) : person.is_on_leave ? (
                                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold">Cuti Penuh</span>
                                  ) : person.leave_days && person.leave_days > 0 ? (
                                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                                      Libur {person.leave_days} hr
                                    </span>
                                  ) : (
                                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                                      Hadir Penuh
                                    </span>
                                  )}
                                </td>
                                <td className="text-right py-2.5 px-3 text-slate-600">{formatNumber(normalShare)}</td>
                                <td className="text-right py-2.5 px-3">
                                  {leaveRed > 0 ? (
                                    <span className="text-rose-600 font-semibold">-{formatNumber(leaveRed)}</span>
                                  ) : isOwner && totalBaristaLeaveReductions > 0 ? (
                                    <span className="text-blue-600 font-semibold">+{formatNumber(totalBaristaLeaveReductions)}</span>
                                  ) : (
                                    <span className="text-slate-400">0</span>
                                  )}
                                </td>
                                <td className="text-right py-2.5 px-3">
                                  {cashbonRed > 0 ? (
                                    <span className="text-rose-600 font-bold">-{formatNumber(cashbonRed)}</span>
                                  ) : isOwner && totalBaristaCashbonReductions > 0 ? (
                                    <span className="text-emerald-600 font-bold">+{formatNumber(totalBaristaCashbonReductions)}</span>
                                  ) : (
                                    <span className="text-slate-400">0</span>
                                  )}
                                </td>
                                <td className={`text-right py-2.5 px-3 font-extrabold ${isOwner ? 'text-blue-700' : 'text-emerald-700'}`}>
                                  Rp {formatNumber(person.amount)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      const expensesList = preview.calculation.breakdown || []
                      handlePrintProfitSharingDocument(
                        preview.period.period_start,
                        preview.period.period_end,
                        preview.calculation.ratio,
                        preview.calculation.basis_type || 'net',
                        preview.calculation.basis_amount,
                        preview.calculation.tax || 0,
                        preview.calculation.service_fee || 0,
                        preview.calculation.net_revenue || preview.calculation.basis_amount,
                        preview.calculation.total_cogs,
                        preview.calculation.gross_profit,
                        preview.calculation.total_expenses,
                        preview.calculation.net_profit,
                        preview.calculation.people || people,
                        expensesList,
                        "Draft (Preview)",
                        preview.period.id
                      )
                    }}
                    className="gap-1.5 border-amber-300 text-amber-900 hover:bg-amber-50 text-xs font-semibold w-full sm:w-auto"
                  >
                    <Printer className="w-4 h-4 text-amber-700" />
                    Cetak Bukti Preview (TTD)
                  </Button>

                  <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreview}
                      disabled={previewMutation.isPending}
                      className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold gap-1.5"
                      title="Sinkronkan kembali dengan transaksi & kasbon barista paling mutakhir"
                    >
                      {previewMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      Update Data
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveDraft}
                      className="border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold gap-1.5"
                      title="Simpan sebagai draft di Daftar Periode"
                    >
                      <Save className="w-3.5 h-3.5 text-slate-600" />
                      Simpan Draft
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleFinalize(preview.period.id)}
                      disabled={finalizeMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
                      title="Proses Bagi Hasil, lunasi kasbon, dan catat ke Pengeluaran (Gaji & Upah)"
                    >
                      {finalizeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                      Proses Bagi Hasil
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ================= MODAL: CATAT KASBON BARISTA ================= */}
      {showCashbonModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCashbonModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <Wallet className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Catat Kasbon Barista</h3>
                  <p className="text-xs text-slate-500">Mengurangi bagi hasil barista pada periode terkait</p>
                </div>
              </div>
              <button onClick={() => setShowCashbonModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCashbon} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Barista <span className="text-rose-500">*</span>
                </label>
                <input
                  list="barista-names-list"
                  type="text"
                  placeholder="Ketik atau pilih nama barista..."
                  value={cashbonBaristaName}
                  onChange={(e) => setCashbonBaristaName(e.target.value)}
                  className="w-full border rounded-xl px-3 py-2 text-sm font-semibold text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
                <datalist id="barista-names-list">
                  {people.filter(p => p.role !== 'owner').map((p, idx) => (
                    <option key={idx} value={p.name} />
                  ))}
                  <option value="Barista 1" />
                  <option value="Barista 2" />
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tanggal Kasbon <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={cashbonDate}
                    onChange={(e) => setCashbonDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Metode Kas Keluar <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={cashbonMethod}
                    onChange={(e) => setCashbonMethod(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 text-sm font-semibold text-slate-800 border-slate-300 bg-white"
                  >
                    <option value="Cash">Cash (Kas Laci Toko)</option>
                    <option value="Transfer">Transfer Bank / QRIS</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nominal Kasbon (Rp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-400">Rp</span>
                  <Input
                    type="number"
                    min={1000}
                    step={1000}
                    placeholder="0"
                    value={cashbonAmount || ''}
                    onChange={(e) => setCashbonAmount(Number(e.target.value))}
                    className="pl-10 font-bold text-base text-slate-900"
                    required
                  />
                </div>
                {cashbonAmount > 0 && (
                  <p className="text-[11px] text-slate-500 mt-1 font-medium">
                    Terbilang: Rp {formatNumber(cashbonAmount)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Keperluan / Alasan (Opsional)
                </label>
                <Input
                  type="text"
                  placeholder="Misal: Kasbon darurat bensin, pinjaman pribadi, dll"
                  value={cashbonReason}
                  onChange={(e) => setCashbonReason(e.target.value)}
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  Jika metode <strong>Cash</strong> dipilih, sistem secara otomatis mencatat pengeluaran di Buku Kas harian dengan referensi kasbon.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t">
                <Button type="button" variant="outline" onClick={() => setShowCashbonModal(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={createCashbonMutation.isPending} className="font-bold">
                  {createCashbonMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                  Simpan Catatan Kasbon
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ATUR LIBUR BARISTA ================= */}
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
