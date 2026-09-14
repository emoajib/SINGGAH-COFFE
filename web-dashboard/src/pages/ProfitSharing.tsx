// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Loader2, Calculator, CheckCircle, Trash2, RefreshCw, DollarSign, FileText, UserPlus, X, Calendar, CalendarOff, Info, Printer } from "lucide-react"
import { useProfitSharing } from "../hooks/useProfitSharing"
import { ProfitSharingService } from "../services/profitSharingService"
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
  const [detailPeople, setDetailPeople] = useState<ProfitSharingPerson[]>([])
  const [loadingDetailPeople, setLoadingDetailPeople] = useState(false)

  // Vetted by AI - Manual Review Required by Senior Engineer/Manager
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

  // Vetted by AI - Manual Review Required by Senior Engineer/Manager
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
    const totalBaristaReductions = peopleList.reduce(
      (sum, p) => sum + (p.role !== 'owner' ? (p.leave_reduction || 0) : 0), 0
    )
    const docNo = `SC/BGH-${periodId ? String(periodId).padStart(4, '0') : new Date().toISOString().slice(0, 10).replace(/-/g, '')}`
    const printDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const periodLabel = `${formatDateTime(periodStart)} — ${formatDateTime(periodEnd)}`

    const ownerPerson = peopleList.find(p => p.role === 'owner') || { name: 'Owner', role: 'owner', share_pct: 60, amount: (netProfitVal * 0.6) }
    const baristaList = peopleList.filter(p => p.role !== 'owner')

    let peopleRowsHtml = ''
    peopleList.forEach((person, idx) => {
      const isOwner = person.role === 'owner'
      const reduction = person.leave_reduction || 0
      const normalShare = isOwner ? (person.amount - totalBaristaReductions) : (person.amount + reduction)
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
            ${isOwner && totalBaristaReductions > 0 ? `<div style="font-size: 8pt; color: #0284c7;">+Rp ${formatNumber(totalBaristaReductions)} dari libur barista</div>` : ''}
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">${person.share_pct}%</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${attendText}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">${formatNumber(normalShare)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; color: ${reduction > 0 ? '#dc2626' : isOwner && totalBaristaReductions > 0 ? '#0284c7' : '#64748b'};">
            ${reduction > 0 ? `-${formatNumber(reduction)}` : isOwner && totalBaristaReductions > 0 ? `+${formatNumber(totalBaristaReductions)}` : '0'}
          </td>
          <td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-weight: bold; color: ${isOwner ? '#1e40af' : '#047857'};">
            Rp ${formatNumber(person.amount)}
          </td>
        </tr>
      `
    })

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
          <div style="font-size: 8pt; color: #047857; font-weight: bold; margin-top: 2px;">Jatah: Rp ${formatNumber(b.amount)}</div>
          <div style="height: 55px;"></div>
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
          body { font-family: 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 10pt; color: #0f172a; line-height: 1.35; margin: 0; padding: 0; }
          .header { text-align: center; border-bottom: 2.5px double #1e293b; padding-bottom: 8px; margin-bottom: 12px; }
          .brand { font-size: 17pt; font-weight: 800; letter-spacing: 1.5px; color: #0f172a; margin: 0; }
          .brand-sub { font-size: 8.5pt; color: #475569; margin: 2px 0 0 0; }
          .doc-badge { display: inline-block; font-size: 11pt; font-weight: 800; text-transform: uppercase; margin-top: 6px; letter-spacing: 0.5px; color: #1e293b; border-bottom: 1.5px solid #1e293b; padding-bottom: 1px; }
          .meta-box { display: flex; justify-content: space-between; font-size: 9pt; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; }
          .meta-item { display: flex; margin-bottom: 2px; }
          .meta-lbl { width: 140px; color: #64748b; font-weight: 600; }
          .meta-val { font-weight: 700; color: #0f172a; }
          .sec-header { font-size: 9.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1e293b; margin: 10px 0 4px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 8.5pt; }
          th { background-color: #f1f5f9; color: #334155; font-weight: 700; border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 5px 6px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .sig-container { margin-top: 16px; page-break-inside: avoid; }
          .sig-title { font-size: 9pt; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; color: #1e293b; }
          .sig-flex { display: flex; gap: 12px; justify-content: space-between; }
          .sig-box-owner { width: 220px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; background: #fafafa; }
          .disclaimer { font-size: 7.5pt; color: #64748b; text-align: center; margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 4px; font-style: italic; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">SINGGAH COFFEE</div>
          <div class="brand-sub">Sistem Manajemen Operasional & Keuangan Kafe • Singgah Coffee & Eatery</div>
          <div class="doc-badge">BUKTI SERAH TERIMA BAGI HASIL OPERASIONAL</div>
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
            <div class="meta-item"><span class="meta-lbl">Perlakuan Beban:</span><span class="meta-val" style="color: ${isGross ? '#0284c7' : '#d97706'};">${isGross ? 'Ditanggung Owner (Non-Potong)' : 'Memotong Laba Bersih'}</span></div>
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
              <td class="text-right" style="color: #92400e; font-size: 10pt;">Rp ${formatNumber(basisCalcValue)}</td>
              <td style="color: #92400e;">Basis perhitungan porsi Owner & Barista</td>
            </tr>
          </tbody>
        </table>

        <div class="sec-header">2. Rincian Hak Penerimaan per Orang</div>
        <table>
          <thead>
            <tr>
              <th style="width: 25px;" class="text-center">No</th>
              <th>Nama & Jabatan</th>
              <th class="text-right" style="width: 60px;">Porsi %</th>
              <th class="text-center" style="width: 100px;">Kehadiran</th>
              <th class="text-right" style="width: 95px;">Jatah Normal</th>
              <th class="text-right" style="width: 95px;">Potongan Libur</th>
              <th class="text-right" style="width: 110px;">Total Diterima</th>
            </tr>
          </thead>
          <tbody>
            ${peopleRowsHtml}
          </tbody>
        </table>

        ${expenseRowsHtml ? `
          <div class="sec-header">3. Rincian Nota Belanja Operasional Toko (Transparansi Beban)</div>
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

        <!-- LEMBAR TANDA TANGAN SERAH TERIMA (TTD OWNER & TTD SELURUH BARISTA) -->
        <div class="sig-container">
          <div class="sig-title">Lembar Pengesahan Serah Terima Dana Bagi Hasil</div>
          <div class="sig-flex">
            <!-- TTD OWNER -->
            <div class="sig-box-owner">
              <div style="font-size: 8.5pt; font-weight: bold; text-transform: uppercase; color: #1e3a8a;">Pihak Menyerahkan (Owner)</div>
              <div style="font-size: 8pt; color: #1e40af; font-weight: bold; margin-top: 2px;">Hak Owner: Rp ${formatNumber(ownerPerson.amount)}</div>
              <div style="height: 55px;"></div>
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
                  className="w-full border rounded-md px-3 py-2 text-sm font-semibold text-slate-800"
                  value={basisType}
                  onChange={(e) => setBasisType(e.target.value)}
                >
                  <option value="net">Laba Bersih (Net Profit — Dikurangi Pengeluaran)</option>
                  <option value="gross">Laba Kotor (Gross Profit — Murni Margin Penjualan)</option>
                </select>
                <div className="mt-1.5 p-2 rounded-lg text-xs font-medium border bg-slate-50">
                  {basisType === 'gross' ? (
                    <div className="flex items-start gap-1.5 text-blue-800">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-600" />
                      <span>
                        <strong>Laba Kotor (Gross Margin):</strong> Bagi hasil dihitung murni dari margin penjualan produk (Omzet dikurangi HPP). Beban operasional toko (seperti Cup, Susu, dan utilitas) <u>TIDAK memotong</u> hak barista (beban ditanggung Owner).
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5 text-amber-900">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                      <span>
                        <strong>Laba Bersih (Net Profit):</strong> Beban operasional toko (seperti Cup, Susu, dan operasional lainnya) akan <u>dipotong terlebih dahulu</u> dari laba kotor sebelum dibagi ke Owner & Barista.
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner %</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={ownerPct}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(100, Number(e.target.value) || 0))
                    setOwnerPct(val)
                  }}
                  className="font-bold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Barista %</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={100 - ownerPct}
                  onChange={(e) => {
                    const baristaVal = Math.max(0, Math.min(100, Number(e.target.value) || 0))
                    setOwnerPct(100 - baristaVal)
                  }}
                  className="font-bold bg-indigo-50/50 border-indigo-200 text-indigo-900 focus:border-indigo-400"
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
      {detailPeriod && (() => {
        const effectivePeople = (detailPeriod.people && detailPeriod.people.length > 0) ? detailPeriod.people : detailPeople
        const isGross = detailPeriod.basis_type === 'gross'
        const grossMarginVal = detailPeriod.basis_amount - detailPeriod.total_cogs
        const basisCalcVal = isGross ? grossMarginVal : detailPeriod.net_profit
        const expensesList: any[] = (() => {
          if (!detailPeriod.expenses_breakdown) return []
          try {
            return JSON.parse(detailPeriod.expenses_breakdown)
          } catch {
            return []
          }
        })()

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailPeriod(null)}>
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Detail Periode: {formatDateTime(detailPeriod.period_start)} — {formatDateTime(detailPeriod.period_end)}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Sistem Bagi Hasil Transparan Singgah Coffee</p>
                </div>
                <div className="flex items-center gap-2">
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
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-sm"
                  >
                    <Printer className="w-4 h-4" /> Cetak Bukti Bagi Hasil
                  </Button>
                  <button onClick={() => setDetailPeriod(null)} className="text-gray-400 hover:text-gray-600 p-1 text-xl">&times;</button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Status Periode</span>
                    <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ml-2 ${STATUS_COLORS[detailPeriod.status]}`}>
                      {STATUS_LABELS[detailPeriod.status] || detailPeriod.status}
                    </p>
                  </div>
                  <div><span className="text-sm text-gray-500">Rasio Keeper</span><p className="font-medium">{detailPeriod.ratio}%</p></div>
                  <div><span className="text-sm text-gray-500">Pendapatan Kotor</span><p className="font-medium">{formatNumber(detailPeriod.basis_amount)}</p></div>
                  <div><span className="text-sm text-gray-500">Total Modal (COGS)</span><p className="font-medium">{formatNumber(detailPeriod.total_cogs)}</p></div>
                  <div><span className="text-sm text-gray-500">Laba Kotor (Gross Margin)</span><p className="font-bold text-slate-900">{formatNumber(grossMarginVal)}</p></div>

                  {/* Total Pengeluaran Operasional with interactive treatment badge */}
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 font-semibold">Total Pengeluaran Operasional</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isGross ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                        {isGross ? 'Non-Potong (Info Saja)' : 'Memotong Bagi Hasil'}
                      </span>
                    </div>
                    <p className="font-bold text-lg text-slate-900 mt-1">Rp {formatNumber(detailPeriod.total_expenses)}</p>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {isGross
                        ? 'Ditanggung Owner — tidak mengurangi jatah barista'
                        : 'Beban toko memotong laba sebelum dibagikan'}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-sm text-gray-600">Laba Bersih</span>
                    <p className="font-bold text-lg">{formatNumber(detailPeriod.net_profit)}</p>
                  </div>

                  {/* Jenis Basis & Dasar Nilai Bagi Hasil */}
                  <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200/60">
                    <span className="text-xs font-semibold text-amber-800 block">Jenis Basis Bagi Hasil:</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">
                      {isGross ? 'Laba Kotor (Gross Profit / Margin Penjualan)' : 'Laba Bersih (Net Profit)'}
                    </p>
                    <span className="text-xs font-semibold text-amber-800 block mt-2">Dasar Nilai Bagi Hasil:</span>
                    <p className="font-extrabold text-base text-amber-900 mt-0.5">
                      Rp {formatNumber(basisCalcVal)}
                    </p>
                  </div>

                  <div className="bg-green-50 p-3 rounded-lg"><span className="text-sm text-green-600">Bagian Keeper ({detailPeriod.ratio}%)</span><p className="font-bold text-lg text-green-700">{formatNumber(detailPeriod.keeper_amount)}</p></div>
                  <div className="bg-blue-50 p-3 rounded-lg"><span className="text-sm text-blue-600">Bagian Owner ({detailPeriod.owner_pct || 60}%)</span><p className="font-bold text-lg text-blue-700">{formatNumber(detailPeriod.owner_amount)}</p></div>
                </div>

                {/* People List in Detail Modal */}
                {loadingDetailPeople && effectivePeople.length === 0 ? (
                  <div className="flex items-center justify-center p-4 text-xs text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Memuat rincian pembagian per orang...
                  </div>
                ) : effectivePeople.length > 0 && (() => {
                  const totalBaristaReductions = effectivePeople.reduce(
                    (sum, p) => sum + (p.role !== 'owner' ? (p.leave_reduction || 0) : 0), 0
                  )
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm">Rincian Pembagian per Orang</h3>
                        <span className="text-xs text-slate-500">Basis: {isGross ? 'Laba Kotor' : 'Laba Bersih'} (Rp {formatNumber(basisCalcVal)})</span>
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
                            {effectivePeople.map((person, i) => {
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
                                    Rp {formatNumber(person.amount)}
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

                {/* Expenses Breakdown */}
                {expensesList.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">Rincian Pengeluaran Operasional Toko</h3>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${isGross ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                        {isGross ? 'Tidak Memotong Bagi Hasil (Ditanggung Owner)' : 'Memotong Bagi Hasil'}
                      </span>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50 text-slate-600">
                            <th className="text-left py-2 px-2.5">No</th>
                            <th className="text-left py-2 px-2.5">Tanggal</th>
                            <th className="text-left py-2 px-2.5">Nota / Kebutuhan Belanja</th>
                            <th className="text-left py-2 px-2.5">Kategori</th>
                            <th className="text-left py-2 px-2.5">Metode Bayar</th>
                            <th className="text-right py-2 px-2.5">Nominal (Rp)</th>
                            <th className="text-center py-2 px-2.5">Perlakuan</th>
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
                              <td className="py-2 px-2.5 text-center">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isGross ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>
                                  {isGross ? 'Non-Potong' : 'Potong Jatah'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 font-bold bg-slate-50 text-slate-900">
                            <td colSpan={5} className="py-2.5 px-2.5">Total Pengeluaran Operasional</td>
                            <td className="text-right py-2.5 px-2.5 text-rose-700">Rp {formatNumber(expensesList.reduce((s: number, e: any) => s + (e.amount || 0), 0))}</td>
                            <td className="text-center py-2.5 px-2.5">
                              <span className="text-[10px] text-slate-500">
                                {isGross ? 'Informasi' : 'Dipotongkan'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Per Product Breakdown */}
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

                {/* Modal Footer with Print and Close Button */}
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
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-medium"
                  >
                    <Printer className="w-4 h-4" /> Cetak Bukti Bagi Hasil (TTD)
                  </Button>
                  <Button variant="ghost" onClick={() => setDetailPeriod(null)}>
                    Tutup
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

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
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 font-semibold">Total Pengeluaran Operasional</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${preview.calculation.basis_type === 'gross' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                      {preview.calculation.basis_type === 'gross' ? 'Non-Potong (Info Saja)' : 'Memotong Bagi Hasil'}
                    </span>
                  </div>
                  <p className="font-bold text-lg text-slate-900 mt-1">Rp {formatNumber(preview.calculation.total_expenses)}</p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {preview.calculation.basis_type === 'gross'
                      ? 'Ditanggung Owner — tidak mengurangi jatah barista'
                      : 'Beban toko memotong laba sebelum dibagikan'}
                  </span>
                </div>
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
              {preview.calculation.breakdown && preview.calculation.breakdown.length > 0 && (() => {
                const isGross = preview.calculation.basis_type === 'gross'
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">Rincian Pengeluaran Operasional Toko</h3>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${isGross ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                        {isGross ? 'Tidak Memotong Bagi Hasil (Ditanggung Owner)' : 'Memotong Bagi Hasil'}
                      </span>
                    </div>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50 text-slate-600">
                            <th className="text-left py-2 px-2.5">No</th>
                            <th className="text-left py-2 px-2.5">Tanggal</th>
                            <th className="text-left py-2 px-2.5">Nota / Kebutuhan Belanja</th>
                            <th className="text-left py-2 px-2.5">Kategori</th>
                            <th className="text-left py-2 px-2.5">Metode Bayar</th>
                            <th className="text-right py-2 px-2.5">Nominal (Rp)</th>
                            <th className="text-center py-2 px-2.5">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.calculation.breakdown.map((b, i) => (
                            <tr key={i} className="border-b hover:bg-slate-50/50">
                              <td className="py-2 px-2.5 text-slate-400">{i + 1}</td>
                              <td className="py-2 px-2.5 text-slate-600 whitespace-nowrap">{b.date || '-'}</td>
                              <td className="py-2 px-2.5 font-medium text-slate-900">{b.title || b.category}</td>
                              <td className="py-2 px-2.5 text-slate-500">{b.category}</td>
                              <td className="py-2 px-2.5 text-slate-500">{b.payment_method || 'Cash'}</td>
                              <td className="py-2 px-2.5 text-right font-medium text-slate-800">{formatNumber(b.amount)}</td>
                              <td className="py-2 px-2.5 text-center">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isGross ? 'bg-slate-100 text-slate-600' : 'bg-amber-100 text-amber-800'}`}>
                                  {isGross ? 'Non-Potong' : 'Potong Jatah'}
                                </span>
                              </td>
                            </tr>
                          ))}
                          <tr className="border-t-2 font-bold bg-slate-50 text-slate-900">
                            <td colSpan={5} className="py-2.5 px-2.5">Total Pengeluaran Operasional</td>
                            <td className="text-right py-2.5 px-2.5 text-rose-700">Rp {formatNumber(preview.calculation.breakdown.reduce((s, e) => s + (e.amount || 0), 0))}</td>
                            <td className="text-center py-2.5 px-2.5">
                              <span className="text-[10px] text-slate-500">
                                {isGross ? 'Informasi' : 'Dipotongkan'}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}
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
              <div className="flex justify-between items-center pt-4 border-t">
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
                  className="gap-1.5 border-amber-300 text-amber-900 hover:bg-amber-50"
                >
                  <Printer className="w-4 h-4 text-amber-700" />
                  Cetak Bukti Preview (TTD)
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowPreview(false)}>Batal</Button>
                  <Button onClick={() => handleFinalize(preview.period.id)} disabled={finalizeMutation.isPending}>
                    {finalizeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Finalize Periode Ini
                  </Button>
                </div>
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
