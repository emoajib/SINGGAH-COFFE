import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { SalesChart } from "../components/dashboard/SalesChart"
import { TopSellingItems } from "../components/dashboard/TopSellingItems"
import { useEffect, useState } from "react"
import { InventoryService } from "../services/inventoryService"
import { AlertTriangle, Loader2, ShoppingCart, Download, FileText, FileSpreadsheet, Calendar } from "lucide-react"
import { getImageUrl, formatCurrency } from "../lib/utils"
import { useDashboard } from "../hooks/useDashboard"
import { useSettings } from "../hooks/useSettings"
import { Button } from "../components/ui/button"
import { Dialog } from "../components/ui/dialog"
import { useSelector } from "react-redux"
import { RootState } from "../store"
import type { Ingredient, ProductSalesVolume } from "../types"

// Vetted by AI - Manual Review Required by Senior Engineer/Manager

interface DashboardHomeProps {
    setActiveTab: (tab: string) => void
}

export default function DashboardHome({ setActiveTab }: DashboardHomeProps) {
    const { user } = useSelector((state: RootState) => state.auth)
    const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([])
    const [showLowStockDetails, setShowLowStockDetails] = useState(false)

    const { data: settings } = useSettings()
    const logoUrl = settings?.outlet_logo_url || ""
    const outletName = settings?.outlet_name || "Singgah Coffee"

    const [dateFilterStart, setDateFilterStart] = useState("")
    const [dateFilterEnd, setDateFilterEnd] = useState("")
    const [productFilter, setProductFilter] = useState("")

    // Ekspor Data State & Handlers
    const [showExportModal, setShowExportModal] = useState(false)
    const [exportStart, setExportStart] = useState(() => {
        const d = new Date()
        return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
    })
    const [exportEnd, setExportEnd] = useState(() => new Date().toISOString().split('T')[0])
    const [isExporting, setIsExporting] = useState(false)

    // Vetted by AI - Manual Review Required by Senior Engineer/Manager
    const escapeXml = (unsafe: any): string => {
        if (unsafe === null || unsafe === undefined) return ''
        return String(unsafe)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;')
    }

    interface ExcelColumnDef {
        header: string
        type?: 'String' | 'Number' | 'Currency' | 'Percent'
        width?: number
    }

    interface ExcelSheetDef {
        name: string
        title?: string
        subtitle?: string
        columns: ExcelColumnDef[]
        rows: any[][]
        totalRow?: any[]
    }

    const buildExcelWorkbookXml = (sheets: ExcelSheetDef[]): string => {
        const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Singgah Coffee POS</Author>
  <Company>Singgah Coffee</Company>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Calibri" ss:Size="13" ss:Bold="1" ss:Color="#0F172A"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SubtitleStyle">
   <Font ss:FontName="Calibri" ss:Size="9" ss:Italic="1" ss:Color="#64748B"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#64748B"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#64748B"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#64748B"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#64748B"/>
   </Borders>
  </Style>
  <Style ss:ID="StringCell">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
   </Borders>
  </Style>
  <Style ss:ID="NumberCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
   </Borders>
  </Style>
  <Style ss:ID="CurrencyCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="&quot;Rp &quot;#,##0"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
   </Borders>
  </Style>
  <Style ss:ID="PercentCell">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="0.0%"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F1F5F9"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalStringCell">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#334155"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#334155"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalNumberCell">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="#,##0"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#334155"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#334155"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalCurrencyCell">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="&quot;Rp &quot;#,##0"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#334155"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#334155"/>
   </Borders>
  </Style>
  <Style ss:ID="TotalPercentCell">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#0F172A"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <NumberFormat ss:Format="0.0%"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#334155"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#334155"/>
   </Borders>
  </Style>
 </Styles>`

        let worksheets = ''
        for (const sheet of sheets) {
            worksheets += `\n <Worksheet ss:Name="${escapeXml(sheet.name)}">\n  <Table>\n`
            for (const col of sheet.columns) {
                worksheets += `   <Column ss:AutoFitWidth="1" ss:Width="${col.width || 100}"/>\n`
            }

            if (sheet.title) {
                worksheets += `   <Row ss:Height="22">\n    <Cell ss:StyleID="TitleStyle"><Data ss:Type="String">${escapeXml(sheet.title)}</Data></Cell>\n   </Row>\n`
            }
            if (sheet.subtitle) {
                worksheets += `   <Row ss:Height="16">\n    <Cell ss:StyleID="SubtitleStyle"><Data ss:Type="String">${escapeXml(sheet.subtitle)}</Data></Cell>\n   </Row>\n`
            }
            if (sheet.title || sheet.subtitle) {
                worksheets += `   <Row ss:Height="8"/>\n`
            }

            worksheets += `   <Row ss:Height="24">\n`
            for (const col of sheet.columns) {
                worksheets += `    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">${escapeXml(col.header)}</Data></Cell>\n`
            }
            worksheets += `   </Row>\n`

            for (const row of sheet.rows) {
                worksheets += `   <Row ss:Height="19">\n`
                for (let cIdx = 0; cIdx < sheet.columns.length; cIdx++) {
                    const col = sheet.columns[cIdx]
                    const val = row[cIdx]
                    const colType = col.type || 'String'

                    if (val === undefined || val === null || val === '') {
                        worksheets += `    <Cell ss:StyleID="StringCell"><Data ss:Type="String"></Data></Cell>\n`
                    } else if (colType === 'Number') {
                        const num = Number(val) || 0
                        worksheets += `    <Cell ss:StyleID="NumberCell"><Data ss:Type="Number">${num}</Data></Cell>\n`
                    } else if (colType === 'Currency') {
                        const num = Number(val) || 0
                        worksheets += `    <Cell ss:StyleID="CurrencyCell"><Data ss:Type="Number">${num}</Data></Cell>\n`
                    } else if (colType === 'Percent') {
                        const num = typeof val === 'number' ? val : (parseFloat(String(val).replace('%', '')) / 100) || 0
                        worksheets += `    <Cell ss:StyleID="PercentCell"><Data ss:Type="Number">${num.toFixed(4)}</Data></Cell>\n`
                    } else {
                        worksheets += `    <Cell ss:StyleID="StringCell"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>\n`
                    }
                }
                worksheets += `   </Row>\n`
            }

            if (sheet.totalRow && sheet.totalRow.length > 0) {
                worksheets += `   <Row ss:Height="22">\n`
                for (let cIdx = 0; cIdx < sheet.columns.length; cIdx++) {
                    const col = sheet.columns[cIdx]
                    const val = sheet.totalRow[cIdx]
                    const colType = col.type || 'String'

                    if (val === undefined || val === null || val === '') {
                        worksheets += `    <Cell ss:StyleID="TotalStringCell"><Data ss:Type="String"></Data></Cell>\n`
                    } else if (colType === 'Currency') {
                        const num = Number(val) || 0
                        worksheets += `    <Cell ss:StyleID="TotalCurrencyCell"><Data ss:Type="Number">${num}</Data></Cell>\n`
                    } else if (colType === 'Number') {
                        const num = Number(val) || 0
                        worksheets += `    <Cell ss:StyleID="TotalNumberCell"><Data ss:Type="Number">${num}</Data></Cell>\n`
                    } else if (colType === 'Percent') {
                        const num = typeof val === 'number' ? val : (parseFloat(String(val).replace('%', '')) / 100) || 0
                        worksheets += `    <Cell ss:StyleID="TotalPercentCell"><Data ss:Type="Number">${num.toFixed(4)}</Data></Cell>\n`
                    } else {
                        worksheets += `    <Cell ss:StyleID="TotalStringCell"><Data ss:Type="String">${escapeXml(val)}</Data></Cell>\n`
                    }
                }
                worksheets += `   </Row>\n`
            }

            worksheets += `  </Table>\n </Worksheet>`
        }

        return `${xmlHeader}${worksheets}\n</Workbook>`
    }

    const handleExportPdf = async () => {
        try {
            setIsExporting(true)
            const token = localStorage.getItem('token')
            const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
            const params = new URLSearchParams({ start: exportStart, end: exportEnd })
            const res = await fetch(`${baseURL}/reports/profit-loss/export/pdf?${params}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
            if (!res.ok) throw new Error("Gagal mengunduh berkas PDF")
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Laporan_Laba_Rugi_${exportStart}_sd_${exportEnd}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (e: any) {
            alert("Gagal mengunduh PDF: " + (e?.message || e))
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportExcelFinancials = async () => {
        try {
            setIsExporting(true)
            const token = localStorage.getItem('token')
            const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
            const params = new URLSearchParams({ start: exportStart, end: exportEnd })
            const res = await fetch(`${baseURL}/reports/profit-loss?${params}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
            if (!res.ok) throw new Error("Gagal mengambil data laporan keuangan")
            const data = await res.json()

            const rev = data.revenue || 0
            const cogs = data.cogs || 0
            const grossProfit = data.gross_profit || (rev - cogs)
            const totalExpenses = data.total_expenses || 0
            const netProfit = data.net_profit || (grossProfit - totalExpenses)

            const sheet1Rows: any[][] = [
                ["1", "4101", "Pendapatan Usaha", "Total Pendapatan Penjualan Kasir", rev, 1.0],
                ["", "-", "  Rincian Bayar", `  • Penjualan Tunai (Cash)`, data.payment_breakdown?.find((p: any) => p.payment_method === 'Cash')?.total || 0, rev > 0 ? (data.payment_breakdown?.find((p: any) => p.payment_method === 'Cash')?.total || 0) / rev : 0],
                ["", "-", "  Rincian Bayar", `  • Penjualan Non-Tunai (QRIS / Bank)`, data.payment_breakdown?.find((p: any) => p.payment_method === 'QRIS')?.total || 0, rev > 0 ? (data.payment_breakdown?.find((p: any) => p.payment_method === 'QRIS')?.total || 0) / rev : 0],
                ["2", "5101", "Beban Pokok", "Beban Pokok Penjualan (HPP Modal)", cogs, rev > 0 ? (cogs / rev) : 0],
                ["-", "-", "Laba Kotor", "Margin Penjualan Bersih (Gross Profit)", grossProfit, rev > 0 ? (grossProfit / rev) : 0],
                ["3", "5201", "Beban Operasional", "Total Akumulasi Beban Operasional", totalExpenses, rev > 0 ? (totalExpenses / rev) : 0],
                ["-", "3102", "Laba Bersih", "LABA BERSIH PERIODE BERJALAN", netProfit, rev > 0 ? (netProfit / rev) : 0]
            ]

            const expenses = data.expenses || []
            const sheet2Rows = expenses.map((exp: any, idx: number) => [
                idx + 1,
                exp.category,
                exp.amount,
                totalExpenses > 0 ? (exp.amount / totalExpenses) : 0
            ])

            const payments = data.payment_breakdown || []
            const sheet3Rows = payments.map((p: any, idx: number) => [
                idx + 1,
                p.payment_method,
                p.count,
                p.total,
                rev > 0 ? (p.total / rev) : 0
            ])

            const xml = buildExcelWorkbookXml([
                {
                    name: "Laba_Rugi_Ringkasan",
                    title: "SINGGAH COFFEE - LAPORAN LABA RUGI & KEUANGAN RESMI",
                    subtitle: `Periode Pembukuan: ${exportStart} s/d ${exportEnd} • Standar SAK EMKM / PSAK`,
                    columns: [
                        { header: "No", type: "String", width: 40 },
                        { header: "Kode Akun", type: "String", width: 80 },
                        { header: "Kategori Akun", type: "String", width: 140 },
                        { header: "Uraian / Deskripsi Akun", type: "String", width: 240 },
                        { header: "Jumlah (IDR)", type: "Currency", width: 130 },
                        { header: "Rasio Omzet %", type: "Percent", width: 90 }
                    ],
                    rows: sheet1Rows
                },
                {
                    name: "Rincian_Beban_Operasional",
                    title: "RINCIAN BEBAN OPERASIONAL TOKO",
                    subtitle: `Periode: ${exportStart} s/d ${exportEnd}`,
                    columns: [
                        { header: "No", type: "Number", width: 40 },
                        { header: "Kategori Beban", type: "String", width: 180 },
                        { header: "Jumlah (IDR)", type: "Currency", width: 130 },
                        { header: "% terhadap Total Beban", type: "Percent", width: 130 }
                    ],
                    rows: sheet2Rows,
                    totalRow: ["TOTAL", "TOTAL BEBAN OPERASIONAL", totalExpenses, 1.0]
                },
                {
                    name: "Metode_Pembayaran",
                    title: "REKAPITULASI METODE PEMBAYARAN KASIR",
                    subtitle: `Periode: ${exportStart} s/d ${exportEnd}`,
                    columns: [
                        { header: "No", type: "Number", width: 40 },
                        { header: "Metode Pembayaran", type: "String", width: 140 },
                        { header: "Jumlah Transaksi", type: "Number", width: 110 },
                        { header: "Total Nilai (IDR)", type: "Currency", width: 130 },
                        { header: "Pangsa Pasar %", type: "Percent", width: 100 }
                    ],
                    rows: sheet3Rows,
                    totalRow: ["TOTAL", "TOTAL TRANSAKSI", payments.reduce((s: number, p: any) => s + (p.count || 0), 0), rev, 1.0]
                }
            ])

            const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Laporan_Keuangan_${exportStart}_sd_${exportEnd}.xls`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (e: any) {
            alert("Gagal mengunduh Excel Keuangan: " + (e?.message || e))
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportCsv = async () => {
        try {
            setIsExporting(true)
            const token = localStorage.getItem('token')
            const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
            const params = new URLSearchParams({ start: exportStart, end: exportEnd })
            const res = await fetch(`${baseURL}/reports/profit-loss/export/csv?${params}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
            if (!res.ok) throw new Error("Gagal mengunduh berkas CSV")
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Laporan_Keuangan_${exportStart}_sd_${exportEnd}.csv`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (e: any) {
            alert("Gagal mengunduh CSV: " + (e?.message || e))
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportProductSalesExcel = async () => {
        try {
            setIsExporting(true)
            const token = localStorage.getItem('token')
            const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
            const params = new URLSearchParams({ start: exportStart, end: exportEnd })
            const res = await fetch(`${baseURL}/reports/product-performance?${params}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
            let items: ProductSalesVolume[] = []
            if (res.ok) {
                const data = await res.json()
                items = data.products || []
            } else {
                items = summary.product_sales || []
            }

            if (items.length === 0) {
                alert("Belum ada data transaksi menu pada periode ini untuk diekspor.")
                return
            }

            const totalRevenue = items.reduce((s, p) => s + (p.revenue || 0), 0)
            const totalCogs = items.reduce((s, p) => s + (p.total_cogs || 0), 0)
            const totalQty = items.reduce((s, p) => s + (p.quantity || 0), 0)
            const totalGrossProfit = totalRevenue - totalCogs

            // Sheet 1: Detail Penjualan Menu (12 Kolom Terpisah Sempurna)
            const sheet1Rows = items.map((p, idx) => {
                const grossProfit = (p.revenue || 0) - (p.total_cogs || 0)
                const marginPct = (p.revenue || 0) > 0 ? (grossProfit / p.revenue) : 0
                const omzetShare = totalRevenue > 0 ? (p.revenue / totalRevenue) : 0
                return [
                    idx + 1,
                    p.product_id || (idx + 1),
                    p.name || '-',
                    p.category || 'Lainnya',
                    p.quantity || 0,
                    Math.round(p.avg_price || 0),
                    Math.round(p.avg_cost || 0),
                    Math.round(p.revenue || 0),
                    Math.round(p.total_cogs || 0),
                    Math.round(grossProfit),
                    marginPct,
                    omzetShare
                ]
            })

            // Sheet 2: Rekap per Kategori
            const categoryMap = new Map<string, { qty: number, revenue: number, cogs: number }>()
            items.forEach(p => {
                const cat = p.category || 'Lainnya'
                const existing = categoryMap.get(cat) || { qty: 0, revenue: 0, cogs: 0 }
                categoryMap.set(cat, {
                    qty: existing.qty + (p.quantity || 0),
                    revenue: existing.revenue + (p.revenue || 0),
                    cogs: existing.cogs + (p.total_cogs || 0)
                })
            })

            const sheet2Rows: any[][] = []
            let catIdx = 1
            categoryMap.forEach((val, cat) => {
                const gp = val.revenue - val.cogs
                const margin = val.revenue > 0 ? (gp / val.revenue) : 0
                sheet2Rows.push([
                    catIdx++,
                    cat,
                    val.qty,
                    Math.round(val.revenue),
                    Math.round(val.cogs),
                    Math.round(gp),
                    margin
                ])
            })

            // Sheet 3: Top 10 Menu Terlaris
            const sorted = [...items].sort((a, b) => (b.quantity || 0) - (a.quantity || 0)).slice(0, 10)
            const sheet3Rows = sorted.map((p, idx) => [
                idx + 1,
                p.name,
                p.category,
                p.quantity,
                Math.round(p.revenue || 0)
            ])

            const xml = buildExcelWorkbookXml([
                {
                    name: "Detail_Penjualan_Menu",
                    title: "SINGGAH COFFEE - DETAIL PENJUALAN MENU & PROFITABILITAS",
                    subtitle: `Periode: ${exportStart} s/d ${exportEnd} • Diunduh pada: ${new Date().toLocaleString('id-ID')}`,
                    columns: [
                        { header: "No", type: "Number", width: 40 },
                        { header: "ID Menu", type: "Number", width: 60 },
                        { header: "Nama Menu / Varian", type: "String", width: 190 },
                        { header: "Kategori", type: "String", width: 100 },
                        { header: "Cup Terjual", type: "Number", width: 85 },
                        { header: "Harga Satuan", type: "Currency", width: 100 },
                        { header: "HPP Satuan", type: "Currency", width: 100 },
                        { header: "Total Omzet", type: "Currency", width: 125 },
                        { header: "Total Modal HPP", type: "Currency", width: 125 },
                        { header: "Laba Kotor (Margin)", type: "Currency", width: 125 },
                        { header: "Margin Laba %", type: "Percent", width: 85 },
                        { header: "Kontribusi Omzet %", type: "Percent", width: 110 }
                    ],
                    rows: sheet1Rows,
                    totalRow: [
                        "TOTAL",
                        "",
                        "TOTAL KESELURUHAN",
                        "",
                        totalQty,
                        "",
                        "",
                        totalRevenue,
                        totalCogs,
                        totalGrossProfit,
                        totalRevenue > 0 ? (totalGrossProfit / totalRevenue) : 0,
                        1.0
                    ]
                },
                {
                    name: "Rekap_Kategori",
                    title: "RINGKASAN PERFORMA PER KATEGORI PRODUK",
                    subtitle: `Periode: ${exportStart} s/d ${exportEnd}`,
                    columns: [
                        { header: "No", type: "Number", width: 40 },
                        { header: "Kategori Produk", type: "String", width: 150 },
                        { header: "Total Cup", type: "Number", width: 80 },
                        { header: "Total Omzet", type: "Currency", width: 125 },
                        { header: "Total HPP", type: "Currency", width: 125 },
                        { header: "Laba Kotor", type: "Currency", width: 125 },
                        { header: "Rata-rata Margin", type: "Percent", width: 105 }
                    ],
                    rows: sheet2Rows
                },
                {
                    name: "Top_10_Terlaris",
                    title: "10 MENU TERLARIS (TOP SALES VOLUME)",
                    subtitle: `Periode: ${exportStart} s/d ${exportEnd}`,
                    columns: [
                        { header: "Peringkat", type: "Number", width: 65 },
                        { header: "Nama Produk", type: "String", width: 190 },
                        { header: "Kategori", type: "String", width: 100 },
                        { header: "Cup Terjual", type: "Number", width: 90 },
                        { header: "Total Omzet", type: "Currency", width: 125 }
                    ],
                    rows: sheet3Rows
                }
            ])

            const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Detail_Penjualan_Menu_${exportStart}_sd_${exportEnd}.xls`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (e: any) {
            alert("Gagal mengekspor Excel data menu: " + (e?.message || e))
        } finally {
            setIsExporting(false)
        }
    }

    const handleExportProductSalesCsv = async () => {
        try {
            setIsExporting(true)
            const token = localStorage.getItem('token')
            const baseURL = import.meta.env.VITE_API_BASE_URL || '/api'
            const params = new URLSearchParams({ start: exportStart, end: exportEnd })
            const res = await fetch(`${baseURL}/reports/product-performance?${params}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
            let items: ProductSalesVolume[] = []
            if (res.ok) {
                const data = await res.json()
                items = data.products || []
            } else {
                items = summary.product_sales || []
            }

            if (items.length === 0) {
                alert("Belum ada data transaksi menu pada periode ini untuk diekspor.")
                return
            }
            const rows: string[] = [
                ["No", "ID Menu", "Nama Menu", "Kategori", "Jumlah Terjual (Cup)", "Harga Satuan (Rp)", "HPP Modal (Rp)", "Total Pendapatan (Rp)", "Total Modal (Rp)", "Laba Kotor (Rp)"].join(",")
            ]

            items.forEach((p: ProductSalesVolume, idx: number) => {
                const grossProfit = (p.revenue || 0) - (p.total_cogs || 0)
                const cleanName = `"${(p.name || '').replace(/"/g, '""')}"`
                const cleanCat = `"${(p.category || '').replace(/"/g, '""')}"`
                rows.push([
                    idx + 1,
                    p.product_id || (idx + 1),
                    cleanName,
                    cleanCat,
                    p.quantity || 0,
                    Math.round(p.avg_price || 0),
                    Math.round(p.avg_cost || 0),
                    Math.round(p.revenue || 0),
                    Math.round(p.total_cogs || 0),
                    Math.round(grossProfit)
                ].join(","))
            })

            const csvContent = "\uFEFF" + rows.join("\n")
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `Detail_Penjualan_Menu_${exportStart}_sd_${exportEnd}.csv`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        } catch (e: any) {
            alert("Gagal mengekspor CSV data menu: " + (e?.message || e))
        } finally {
            setIsExporting(false)
        }
    }

    const { data: _summary, isLoading: statsLoading, refetch } = useDashboard(dateFilterStart || undefined, dateFilterEnd || undefined)
    const summary: any = _summary ?? {
        total_sales: 0,
        active_orders: 0,
        low_stock_count: 0,
        transactions_today: 0,
        sales_trend: [] as { name: string; total: number }[],
        weekly_trend: [] as { name: string; total: number }[],
        monthly_trend: [] as { name: string; total: number }[],
        yearly_trend: [] as { name: string; total: number }[],
        category_breakdown: [] as { category: string; total: number }[],
        top_products: [] as { name: string; category: string; sales: number }[],
        product_sales: [] as ProductSalesVolume[],
        total_cups: 0
    }

    const filteredProducts = (summary.product_sales || []).filter((p: ProductSalesVolume) => {
        const matchProduct = !productFilter || p.name.toLowerCase().includes(productFilter.toLowerCase())
        return matchProduct
    })
    const filteredTotalCups = filteredProducts.reduce((sum: number, p: ProductSalesVolume) => sum + p.quantity, 0)

    useEffect(() => {
        const canViewStock = user?.role === 'owner' || user?.role === 'manager'
        if (canViewStock && summary.low_stock_count > 0) {
            InventoryService.getLowStockAlerts().then(res => {
                setLowStockItems(res.alerts || [])
            }).catch(() => {})
        }
    }, [summary.low_stock_count, user?.role])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {logoUrl && (
                        <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-white shadow-sm shrink-0">
                            <img
                                src={getImageUrl(logoUrl)}
                                alt="Logo"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold text-gray-900">Ringkasan {outletName}</h1>
                        <p className="text-gray-500">Selamat datang kembali di panel administrasi Anda.</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {user?.role === 'owner' && (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 hover:bg-slate-50"
                                onClick={() => setShowExportModal(true)}
                            >
                                <Download className="w-4 h-4" />
                                Ekspor Data
                            </Button>
                            <Button size="sm" onClick={() => setActiveTab('pos')}>Pesanan Baru</Button>
                        </>
                    )}
                </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Penjualan Hari Ini</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : formatCurrency(summary.total_sales)}
                        </div>
                        <p className="text-xs text-green-600 mt-1">Pendapatan Kotor</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Pesanan Aktif</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : summary.active_orders}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Pembayaran tertunda</p>
                    </CardContent>
                </Card>
                <Card
                    className={summary.low_stock_count > 0 ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
                    onClick={() => lowStockItems.length > 0 && setShowLowStockDetails(!showLowStockDetails)}
                >
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Stok Menipis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : summary.low_stock_count}
                        </div>
                        <p className={`text-xs mt-1 ${summary.low_stock_count > 0 ? "text-destructive font-bold" : "text-gray-500"}`}>
                            {summary.low_stock_count > 0 ? "Perlu perhatian — klik untuk detail" : "Semua stok aman"}
                        </p>
                        {showLowStockDetails && lowStockItems.length > 0 && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                                {lowStockItems.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 text-sm">
                                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                                        <span className="font-medium flex-1 truncate">{item.name}</span>
                                        <span className="text-muted-foreground">
                                            {item.current_stock} / {item.min_stock} {item.unit}
                                        </span>
                                    </div>
                                ))}
                                <Button
                                    variant="link"
                                    size="sm"
                                    className="w-full text-xs"
                                    onClick={(e) => { e.stopPropagation(); setActiveTab('products') }}
                                >
                                    Kelola Stok →
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Transaksi</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : summary.transactions_today}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Pesanan berhasil hari ini</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            {/* Vetted by AI - Manual Review Required by Senior Engineer/Manager */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <SalesChart
                    data={summary.sales_trend || []}
                    weeklyData={summary.weekly_trend || []}
                    monthlyData={summary.monthly_trend || []}
                    yearlyData={summary.yearly_trend || []}
                />
                <TopSellingItems items={summary.top_products || []} />
            </div>

            {/* Product Sales Breakdown */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            Detail Penjualan per Menu
                            <span className="text-sm font-normal text-gray-500 ml-2">
                                Total: {summary.total_cups ?? filteredTotalCups} cup
                            </span>
                        </CardTitle>
                        <div className="flex gap-2 items-center">
                            <input
                                type="date"
                                value={dateFilterStart}
                                onChange={e => setDateFilterStart(e.target.value)}
                                className="text-xs border rounded px-2 py-1"
                                title="Tanggal mulai"
                            />
                            <span className="text-xs text-gray-400">s/d</span>
                            <input
                                type="date"
                                value={dateFilterEnd}
                                onChange={e => setDateFilterEnd(e.target.value)}
                                className="text-xs border rounded px-2 py-1"
                                title="Tanggal selesai"
                            />
                            <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs">
                                ↻ Refresh
                            </Button>
                            <input
                                type="text"
                                placeholder="Cari menu..."
                                value={productFilter}
                                onChange={e => setProductFilter(e.target.value)}
                                className="text-xs border rounded px-2 py-1 w-40"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredProducts.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">Tidak ada data penjualan</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2 px-3 font-medium">No</th>
                                        <th className="text-left py-2 px-3 font-medium">Menu</th>
                                        <th className="text-left py-2 px-3 font-medium">Kategori</th>
                                        <th className="text-right py-2 px-3 font-medium">Cup</th>
                                        <th className="text-right py-2 px-3 font-medium">Harga</th>
                                        <th className="text-right py-2 px-3 font-medium">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredProducts.map((p: ProductSalesVolume, i: number) => (
                                        <tr key={p.product_id} className="border-b hover:bg-gray-50">
                                            <td className="py-2 px-3 text-gray-500">{i + 1}</td>
                                            <td className="py-2 px-3 font-medium">{p.name}</td>
                                            <td className="py-2 px-3 text-gray-500">{p.category}</td>
                                            <td className="py-2 px-3 text-right font-bold">{p.quantity}</td>
                                            <td className="py-2 px-3 text-right">{formatCurrency(p.avg_price)}</td>
                                            <td className="py-2 px-3 text-right">{formatCurrency(p.revenue)}</td>
                                        </tr>
                                    ))}
                                    <tr className="border-t-2 font-bold bg-gray-100">
                                        <td colSpan={3} className="py-3 px-3">Total</td>
                                        <td className="py-3 px-3 text-right">{filteredTotalCups}</td>
                                        <td className="py-3 px-3"></td>
                                        <td className="py-3 px-3 text-right">
                                            {formatCurrency(filteredProducts.reduce((s: number, p: ProductSalesVolume) => s + p.revenue, 0))}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Export Data Modal */}
            <Dialog
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                title="Ekspor Data Penjualan & Keuangan"
                description="Pilih rentang tanggal dan format dokumen yang ingin Anda unduh."
            >
                <div className="space-y-4 pt-2">
                    {/* Date Range Picker */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            Periode Laporan
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <span className="text-[10px] text-slate-400 font-medium">Dari Tanggal</span>
                                <input
                                    type="date"
                                    value={exportStart}
                                    onChange={(e) => setExportStart(e.target.value)}
                                    className="w-full text-xs font-semibold p-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <span className="text-[10px] text-slate-400 font-medium">Sampai Tanggal</span>
                                <input
                                    type="date"
                                    value={exportEnd}
                                    onChange={(e) => setExportEnd(e.target.value)}
                                    className="w-full text-xs font-semibold p-2 bg-white rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Export Action Cards */}
                    {/* Export Action Cards */}
                    <div className="space-y-3">
                        {/* 1. Laporan Laba Rugi (PDF Resmi) */}
                        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-rose-950">Laporan Laba Rugi (PDF)</p>
                                        <p className="text-[11px] text-rose-700/80">Dokumen PDF resmi berformat surat lengkap dengan kop surat, nomor surat, dan tanda tangan</p>
                                    </div>
                                </div>
                                <Button
                                    size="sm"
                                    disabled={isExporting}
                                    onClick={handleExportPdf}
                                    className="bg-rose-600 hover:bg-rose-700 text-white gap-1.5 text-xs font-semibold shrink-0"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Unduh PDF
                                </Button>
                            </div>
                        </div>

                        {/* 2. Laporan Keuangan (Excel Multi-Sheet & CSV) */}
                        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                        <FileSpreadsheet className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-emerald-950">Laporan Keuangan (Excel / CSV)</p>
                                        <p className="text-[11px] text-emerald-700/80">3 Sheet spreadsheet rapi: Ringkasan Laba Rugi, Rincian Beban, dan Metode Bayar</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-1">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isExporting}
                                    onClick={handleExportCsv}
                                    className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-100/50"
                                    title="Unduh format teks CSV standar"
                                >
                                    Format CSV (.csv)
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={isExporting}
                                    onClick={handleExportExcelFinancials}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold"
                                    title="Unduh format Microsoft Excel Multi-Sheet rapi terpisah kolom"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Unduh Excel (.xls Multi-Sheet)
                                </Button>
                            </div>
                        </div>

                        {/* 3. Detail Penjualan Menu (Excel Multi-Sheet & CSV) */}
                        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                        <ShoppingCart className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-amber-950">Detail Penjualan Menu (Excel / CSV)</p>
                                        <p className="text-[11px] text-amber-800/80">12 Kolom Terpisah: Cup terjual, Harga, HPP, Omzet, Margin laba, % Kontribusi + Rekap Kategori</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-1">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isExporting}
                                    onClick={handleExportProductSalesCsv}
                                    className="text-xs border-amber-300 text-amber-800 hover:bg-amber-100/50"
                                    title="Unduh format teks CSV"
                                >
                                    Format CSV (.csv)
                                </Button>
                                <Button
                                    size="sm"
                                    disabled={isExporting}
                                    onClick={handleExportProductSalesExcel}
                                    className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5 text-xs font-semibold"
                                    title="Unduh format Microsoft Excel Multi-Sheet 12 kolom terpisah"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Unduh Excel (.xls Multi-Sheet)
                                </Button>
                            </div>
                        </div>
                    </div>

                    {isExporting && (
                        <div className="flex items-center justify-center gap-2 p-2 text-xs font-semibold text-primary">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Sedang mengunduh berkas laporan...</span>
                        </div>
                    )}
                </div>
            </Dialog>
        </div>
    )
}
