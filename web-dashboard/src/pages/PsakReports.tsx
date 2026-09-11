import React, { useState, useCallback } from "react"
import {
    Loader2,
    FileSpreadsheet,
    Printer,
    Search,
    Table2,
    BarChart3,
    Wallet,
    BookOpen,
    TrendingUp,
} from "lucide-react"
import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { formatCurrency, formatDateTime } from "../lib/utils"
import { PSAKService } from "../services/psakService"

// ── Types ──────────────────────────────────────────────────────────────────
type TabKey = "neraca-saldo" | "neraca" | "laba-rugi" | "arus-kas" | "buku-besar"

interface TabDef { key: TabKey; label: string; icon: React.FC<any> }

const TABS: TabDef[] = [
    { key: "neraca-saldo",  label: "Neraca Saldo",  icon: Table2 },
    { key: "neraca",        label: "Neraca",        icon: BarChart3 },
    { key: "laba-rugi",    label: "Laba Rugi",     icon: Wallet },
    { key: "arus-kas",     label: "Arus Kas",       icon: TrendingUp },
    { key: "buku-besar",   label: "Buku Besar",    icon: BookOpen },
]

// ── Helpers ────────────────────────────────────────────────────────────────
function today(): string {
    return new Date().toISOString().split("T")[0]
}

function monthStart(): string {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0]
}

function downloadExcel(title: string, tableId: string, filename: string) {
    const table = document.getElementById(tableId)
    if (!table) return
    const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"></head>
<body>
<h2>SINGGAH COFFEE</h2>
<h3>${title}</h3>
${table.outerHTML}
</body></html>`
    const blob = new Blob([html], { type: "application/vnd.ms-excel" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

function printArea(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const printWin = window.open("", "_blank")
    if (!printWin) return
    printWin.document.write(`
<html><head><title>Print</title>
<style>
body{font-family:system-ui,sans-serif;padding:24px;color:#111}
table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{border:1px solid #d1d5db;padding:6px 10px;text-align:left;font-size:12px}
th{background:#f3f4f6;font-weight:700}
.text-right{text-align:right}
.totals td{font-weight:800;border-top:2px solid #111}
h2,h3{text-align:center;margin:0}
h2{font-size:18px;text-transform:uppercase}
h3{font-size:14px;color:#555}
</style></head><body>
${el.innerHTML}
</body></html>`)
    printWin.document.close()
    printWin.print()
}

const EMPTY_TD = (
    <td colSpan={99} className="py-16 text-center text-gray-400 italic">
        Tidak ada data untuk periode ini.
    </td>
)

// ── TabContent ─────────────────────────────────────────────────────────────
// ── Neraca Saldo (Trial Balance) ──────────────────────────────────────────
function TrialBalanceTab() {
    const [start, setStart] = useState(monthStart())
    const [end, setEnd] = useState(today())
    const [rows, setRows] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [fetched, setFetched] = useState(false)

    const fetch = useCallback(async () => {
        setLoading(true)
        try {
            const data = await PSAKService.getTrialBalance(start, end)
            setRows(data)
            setFetched(true)
        } catch { setRows([]); setFetched(true) }
        finally { setLoading(false) }
    }, [start, end])

    const totalDebit = rows.reduce((s, r) => s + (r.debit || 0), 0)
    const totalCredit = rows.reduce((s, r) => s + (r.credit || 0), 0)

    return (
        <>
            <div className="flex flex-wrap gap-3 items-end no-print">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Dari Tanggal</label>
                    <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-40 h-10 bg-white" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Sampai Tanggal</label>
                    <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-40 h-10 bg-white" />
                </div>
                <Button onClick={fetch} className="h-10" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Ambil Data
                </Button>
                <Button variant="outline" onClick={() => printArea("print-trial-balance")} className="h-10"><Printer className="w-4 h-4 mr-2" />Cetak</Button>
                <Button variant="outline" onClick={() => downloadExcel("NERACA SALDO", "tbl-trial-balance", `Neraca_Saldo_${start}.xls`)} className="h-10"><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</Button>
            </div>

            <div id="print-trial-balance">
                <div className="text-center my-4">
                    <h2 className="text-lg font-black uppercase">SINGGAH COFFEE</h2>
                    <p className="text-sm font-bold text-gray-500">Neraca Saldo (Trial Balance)</p>
                    <p className="text-xs text-gray-400">Periode: {start} s/d {end}</p>
                </div>
                {loading ? (
                    <div className="py-20 flex justify-center no-print"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table id="tbl-trial-balance" className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-gray-900">
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Kode</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Nama Akun</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Jenis</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Debit</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Kredit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fetched && rows.length === 0 && <tr>{EMPTY_TD}</tr>}
                                {rows.map((r, i) => (
                                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                                        <td className="px-4 py-2.5 font-mono text-xs font-bold">{r.account_code}</td>
                                        <td className="px-4 py-2.5 font-medium">{r.account_name}</td>
                                        <td className="px-4 py-2.5 text-xs uppercase text-gray-500">{r.account_type}</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{r.debit ? formatCurrency(r.debit) : "-"}</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{r.credit ? formatCurrency(r.credit) : "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                            {rows.length > 0 && (
                                <tfoot>
                                    <tr className="border-t-2 border-gray-900 font-black">
                                        <td colSpan={3} className="px-4 py-3 text-right uppercase text-xs tracking-wider">TOTAL</td>
                                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalDebit)}</td>
                                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(totalCredit)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>
        </>
    )
}

// ── Neraca (Balance Sheet) ────────────────────────────────────────────────
function BalanceSheetTab() {
    const [asOf, setAsOf] = useState(today())
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [fetched, setFetched] = useState(false)

    const fetch = useCallback(async () => {
        setLoading(true)
        try {
            const d = await PSAKService.getBalanceSheet(asOf)
            setData(d)
            setFetched(true)
        } catch { setData(null); setFetched(true) }
        finally { setLoading(false) }
    }, [asOf])

    const renderSection = (title: string, entries: any[], color: string) => (
        <div className="mb-6">
            <h4 className={`text-xs font-black uppercase tracking-widest ${color} mb-2 border-b pb-1`}>{title}</h4>
            {entries.length === 0 ? (
                <p className="text-xs text-gray-400 italic pl-2">Tidak ada data.</p>
            ) : (
                <table className="w-full text-sm">
                    <tbody>
                        {entries.map((e: any, i: number) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                                <td className="px-4 py-2 font-mono text-xs">{e.account_code}</td>
                                <td className="px-4 py-2">{e.account_name}</td>
                                <td className="px-4 py-2 text-right font-mono">{formatCurrency(e.amount)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )

    return (
        <>
            <div className="flex flex-wrap gap-3 items-end no-print">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Tanggal</label>
                    <Input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="w-40 h-10 bg-white" />
                </div>
                <Button onClick={fetch} className="h-10" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Ambil Data
                </Button>
                <Button variant="outline" onClick={() => printArea("print-balance-sheet")} className="h-10"><Printer className="w-4 h-4 mr-2" />Cetak</Button>
                <Button variant="outline" onClick={() => downloadExcel("NERACA", "tbl-balance-sheet", `Neraca_${asOf}.xls`)} className="h-10"><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</Button>
            </div>

            <div id="print-balance-sheet">
                <div className="text-center my-4">
                    <h2 className="text-lg font-black uppercase">SINGGAH COFFEE</h2>
                    <p className="text-sm font-bold text-gray-500">Neraca (Balance Sheet)</p>
                    <p className="text-xs text-gray-400">Per Tanggal: {asOf}</p>
                </div>
                {loading ? (
                    <div className="py-20 flex justify-center no-print"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
                ) : fetched && !data ? (
                    <div className="py-20 text-center text-gray-400">Gagal memuat data neraca.</div>
                ) : data ? (
                    <div id="tbl-balance-sheet">
                        {renderSection("Aset (Assets)", data.assets || [], "text-blue-600")}
                        <div className="flex justify-between font-black text-sm border-t-2 border-blue-600 py-2 mb-6">
                            <span className="text-blue-600">TOTAL ASET</span>
                            <span className="font-mono">{formatCurrency(data.total_assets || 0)}</span>
                        </div>

                        {renderSection("Liabilitas (Liabilities)", data.liabilities || [], "text-red-600")}
                        <div className="flex justify-between font-black text-sm border-t-2 border-red-600 py-2 mb-6">
                            <span className="text-red-600">TOTAL LIABILITAS</span>
                            <span className="font-mono">{formatCurrency(data.total_liabilities || 0)}</span>
                        </div>

                        {renderSection("Ekuitas (Equity)", data.equity || [], "text-green-600")}
                        <div className="flex justify-between font-black text-sm border-t-2 border-green-600 py-2 mb-6">
                            <span className="text-green-600">TOTAL EKUITAS</span>
                            <span className="font-mono">{formatCurrency(data.total_equity || 0)}</span>
                        </div>

                        <div className="border-t-4 border-gray-900 mt-4 pt-3 flex justify-between font-black text-lg">
                            <span>TOTAL LIABILITAS + EKUITAS</span>
                            <span className="font-mono">{formatCurrency((data.total_liabilities || 0) + (data.total_equity || 0))}</span>
                        </div>
                    </div>
                ) : null}
            </div>
        </>
    )
}

// ── Laba Rugi (Income Statement) ──────────────────────────────────────────
function IncomeStatementTab() {
    const [start, setStart] = useState(monthStart())
    const [end, setEnd] = useState(today())
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [fetched, setFetched] = useState(false)

    const fetch = useCallback(async () => {
        setLoading(true)
        try {
            const d = await PSAKService.getIncomeStatement(start, end)
            setData(d)
            setFetched(true)
        } catch { setData(null); setFetched(true) }
        finally { setLoading(false) }
    }, [start, end])

    return (
        <>
            <div className="flex flex-wrap gap-3 items-end no-print">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Dari Tanggal</label>
                    <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-40 h-10 bg-white" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Sampai Tanggal</label>
                    <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-40 h-10 bg-white" />
                </div>
                <Button onClick={fetch} className="h-10" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Ambil Data
                </Button>
                <Button variant="outline" onClick={() => printArea("print-income-statement")} className="h-10"><Printer className="w-4 h-4 mr-2" />Cetak</Button>
                <Button variant="outline" onClick={() => downloadExcel("LABA RUGI", "tbl-income-statement", `Laba_Rugi_${start}.xls`)} className="h-10"><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</Button>
            </div>

            <div id="print-income-statement">
                <div className="text-center my-4">
                    <h2 className="text-lg font-black uppercase">SINGGAH COFFEE</h2>
                    <p className="text-sm font-bold text-gray-500">Laporan Laba Rugi (Income Statement)</p>
                    <p className="text-xs text-gray-400">Periode: {start} s/d {end}</p>
                </div>
                {loading ? (
                    <div className="py-20 flex justify-center no-print"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
                ) : fetched && !data ? (
                    <div className="py-20 text-center text-gray-400">Gagal memuat data laporan laba rugi.</div>
                ) : data ? (
                    <div id="tbl-income-statement" className="space-y-6">
                        {/* Revenue */}
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-green-600 mb-2 border-b pb-1">Pendapatan (Revenue)</h4>
                            <table className="w-full text-sm">
                                <tbody>
                                    {(data.revenue || []).map((e: any, i: number) => (
                                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                                            <td className="px-4 py-2 font-mono text-xs">{e.account_code}</td>
                                            <td className="px-4 py-2">{e.account_name}</td>
                                            <td className="px-4 py-2 text-right font-mono text-green-600">{formatCurrency(e.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="flex justify-between font-black text-sm border-t-2 border-green-600 py-2">
                                <span className="text-green-600">TOTAL PENDAPATAN</span>
                                <span className="font-mono">{formatCurrency(data.total_revenue || 0)}</span>
                            </div>
                        </div>

                        {/* Expenses */}
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-red-600 mb-2 border-b pb-1">Beban (Expenses)</h4>
                            <table className="w-full text-sm">
                                <tbody>
                                    {(data.expenses || []).map((e: any, i: number) => (
                                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                                            <td className="px-4 py-2 font-mono text-xs">{e.account_code}</td>
                                            <td className="px-4 py-2">{e.account_name}</td>
                                            <td className="px-4 py-2 text-right font-mono text-red-500">{formatCurrency(e.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="flex justify-between font-black text-sm border-t-2 border-red-600 py-2">
                                <span className="text-red-600">TOTAL BEBAN</span>
                                <span className="font-mono">{formatCurrency(data.total_expenses || 0)}</span>
                            </div>
                        </div>

                        {/* Net Income */}
                        <div className="border-t-4 border-gray-900 mt-4 pt-3 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <span className="text-xl font-black">{data.net_income >= 0 ? "LABA BERSIH" : "RUGI BERSIH"}</span>
                            <span className={`text-2xl font-black font-mono ${data.net_income >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatCurrency(Math.abs(data.net_income || 0))}
                            </span>
                        </div>
                    </div>
                ) : null}
            </div>
        </>
    )
}

// ── Arus Kas (Cash Flow) ──────────────────────────────────────────────────
function CashFlowTab() {
    const [start, setStart] = useState(monthStart())
    const [end, setEnd] = useState(today())
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [fetched, setFetched] = useState(false)

    const fetch = useCallback(async () => {
        setLoading(true)
        try {
            const d = await PSAKService.getCashFlow(start, end)
            setData(d)
            setFetched(true)
        } catch { setData(null); setFetched(true) }
        finally { setLoading(false) }
    }, [start, end])

    const renderSection = (title: string, entries: any[], net: number, color: string) => (
        <div className="mb-6">
            <h4 className={`text-xs font-black uppercase tracking-widest ${color} mb-2 border-b pb-1`}>{title}</h4>
            {entries.length === 0 ? (
                <p className="text-xs text-gray-400 italic pl-2">Tidak ada data.</p>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Kategori</th>
                            <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Deskripsi</th>
                            <th className="px-4 py-2 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((e: any, i: number) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                                <td className="px-4 py-2 text-xs uppercase font-bold text-gray-500">{e.category}</td>
                                <td className="px-4 py-2">{e.description}</td>
                                <td className={`px-4 py-2 text-right font-mono ${e.amount >= 0 ? "text-green-600" : "text-red-500"}`}>
                                    {formatCurrency(Math.abs(e.amount))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <div className={`flex justify-between font-black text-sm border-t-2 ${color === "text-blue-600" ? "border-blue-600" : color === "text-purple-600" ? "border-purple-600" : "border-orange-600"} py-2`}>
                <span className={color}>TOTAL {title.toUpperCase()}</span>
                <span className={`font-mono ${net >= 0 ? "text-green-600" : "text-red-500"}`}>{formatCurrency(net)}</span>
            </div>
        </div>
    )

    return (
        <>
            <div className="flex flex-wrap gap-3 items-end no-print">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Dari Tanggal</label>
                    <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-40 h-10 bg-white" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Sampai Tanggal</label>
                    <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-40 h-10 bg-white" />
                </div>
                <Button onClick={fetch} className="h-10" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Ambil Data
                </Button>
                <Button variant="outline" onClick={() => printArea("print-cash-flow")} className="h-10"><Printer className="w-4 h-4 mr-2" />Cetak</Button>
                <Button variant="outline" onClick={() => downloadExcel("ARUS KAS", "tbl-cash-flow", `Arus_Kas_${start}.xls`)} className="h-10"><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</Button>
            </div>

            <div id="print-cash-flow">
                <div className="text-center my-4">
                    <h2 className="text-lg font-black uppercase">SINGGAH COFFEE</h2>
                    <p className="text-sm font-bold text-gray-500">Laporan Arus Kas (Cash Flow Statement)</p>
                    <p className="text-xs text-gray-400">Periode: {start} s/d {end}</p>
                </div>
                {loading ? (
                    <div className="py-20 flex justify-center no-print"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
                ) : fetched && !data ? (
                    <div className="py-20 text-center text-gray-400">Gagal memuat data arus kas.</div>
                ) : data ? (
                    <div id="tbl-cash-flow">
                        {renderSection("Kegiatan Operasi", data.operating || [], data.net_operating || 0, "text-blue-600")}
                        {renderSection("Kegiatan Investasi", data.investing || [], data.net_investing || 0, "text-purple-600")}
                        {renderSection("Kegiatan Pendanaan", data.financing || [], data.net_financing || 0, "text-orange-600")}

                        <div className="border-t-4 border-gray-900 mt-4 pt-3 flex justify-between font-black text-lg">
                            <span>PERUBAHAN KAS BERSIH</span>
                            <span className={`font-mono ${(data.net_operating || 0) + (data.net_investing || 0) + (data.net_financing || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                                {formatCurrency((data.net_operating || 0) + (data.net_investing || 0) + (data.net_financing || 0))}
                            </span>
                        </div>
                    </div>
                ) : null}
            </div>
        </>
    )
}

// ── Buku Besar (General Ledger) ───────────────────────────────────────────
function GeneralLedgerTab() {
    const [start, setStart] = useState(monthStart())
    const [end, setEnd] = useState(today())
    const [rows, setRows] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [fetched, setFetched] = useState(false)

    const fetch = useCallback(async () => {
        setLoading(true)
        try {
            const data = await PSAKService.getGeneralLedger(start, end)
            setRows(data)
            setFetched(true)
        } catch { setRows([]); setFetched(true) }
        finally { setLoading(false) }
    }, [start, end])

    return (
        <>
            <div className="flex flex-wrap gap-3 items-end no-print">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Dari Tanggal</label>
                    <Input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-40 h-10 bg-white" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Sampai Tanggal</label>
                    <Input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-40 h-10 bg-white" />
                </div>
                <Button onClick={fetch} className="h-10" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    Ambil Data
                </Button>
                <Button variant="outline" onClick={() => printArea("print-general-ledger")} className="h-10"><Printer className="w-4 h-4 mr-2" />Cetak</Button>
                <Button variant="outline" onClick={() => downloadExcel("BUKU BESAR", "tbl-general-ledger", `Buku_Besar_${start}.xls`)} className="h-10"><FileSpreadsheet className="w-4 h-4 mr-2" />Excel</Button>
            </div>

            <div id="print-general-ledger">
                <div className="text-center my-4">
                    <h2 className="text-lg font-black uppercase">SINGGAH COFFEE</h2>
                    <p className="text-sm font-bold text-gray-500">Buku Besar (General Ledger)</p>
                    <p className="text-xs text-gray-400">Periode: {start} s/d {end}</p>
                </div>
                {loading ? (
                    <div className="py-20 flex justify-center no-print"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table id="tbl-general-ledger" className="w-full text-sm">
                            <thead>
                                <tr className="border-b-2 border-gray-900">
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Tanggal</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">No. Entri</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Keterangan</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Debit</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Kredit</th>
                                    <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Saldo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fetched && rows.length === 0 && <tr>{EMPTY_TD}</tr>}
                                {rows.map((r, i) => (
                                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                                        <td className="px-4 py-2.5 text-xs whitespace-nowrap">{formatDateTime(r.date)}</td>
                                        <td className="px-4 py-2.5 font-mono text-xs font-bold">{r.entry_number}</td>
                                        <td className="px-4 py-2.5">{r.description}</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{r.debit ? formatCurrency(r.debit) : "-"}</td>
                                        <td className="px-4 py-2.5 text-right font-mono">{r.credit ? formatCurrency(r.credit) : "-"}</td>
                                        <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.balance >= 0 ? "text-green-700" : "text-red-600"}`}>
                                            {formatCurrency(Math.abs(r.balance))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    )
}

// ── PsakReports Component ─────────────────────────────────────────────────
const PsakReports: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabKey>("neraca-saldo")

    const renderContent = () => {
        switch (activeTab) {
            case "neraca-saldo":  return <TrialBalanceTab />
            case "neraca":        return <BalanceSheetTab />
            case "laba-rugi":    return <IncomeStatementTab />
            case "arus-kas":     return <CashFlowTab />
            case "buku-besar":   return <GeneralLedgerTab />
            default: return null
        }
    }

    return (
        <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="no-print">
                <h1 className="text-2xl md:text-4xl font-black text-gray-900 tracking-tight">Laporan PSAK</h1>
                <p className="text-gray-500 font-medium">Laporan keuangan sesuai standar PSAK untuk Singgah Coffee.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 no-print">
                {TABS.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.key
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                                isActive
                                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                                    : "bg-white text-gray-400 hover:bg-gray-100 hover:text-gray-600 border border-gray-100"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Tab Content */}
            <Card className="border-none shadow-xl glass-panel overflow-hidden">
                <CardContent className="p-6">
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    )
}

export default PsakReports
