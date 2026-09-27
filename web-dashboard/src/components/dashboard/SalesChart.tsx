import { useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { formatNumber } from "../../lib/utils"
import { Download, FileSpreadsheet, FileCode, Database } from 'lucide-react'

// Vetted by AI - Manual Review Required by Senior Engineer/Manager

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface SalesChartProps {
    data?: { name: string; total: number }[]
    weeklyData?: { name: string; total: number }[]
    monthlyData?: { name: string; total: number }[]
    yearlyData?: { name: string; total: number }[]
}

const PERIOD_CONFIG: Record<Period, { title: string; desc: string }> = {
    daily: {
        title: "Tren Penjualan Hari Ini (Per Jam)",
        desc: "Grafik performa penjualan real-time per jam hari ini"
    },
    weekly: {
        title: "Tren Penjualan Mingguan (7 Hari)",
        desc: "Grafik akumulasi penjualan harian dalam 7 hari terakhir"
    },
    monthly: {
        title: "Tren Penjualan Bulanan (30 Hari)",
        desc: "Grafik akumulasi penjualan harian dalam 30 hari terakhir"
    },
    yearly: {
        title: "Tren Penjualan Tahunan (12 Bulan)",
        desc: "Grafik akumulasi penjualan bulanan dalam 1 tahun terakhir"
    }
}

export function SalesChart({ data = [], weeklyData = [], monthlyData = [], yearlyData = [] }: SalesChartProps) {
    const [period, setPeriod] = useState<Period>('daily')
    const [showExportMenu, setShowExportMenu] = useState(false)

    const getActiveData = () => {
        switch (period) {
            case 'daily':
                return data
            case 'weekly':
                return weeklyData
            case 'monthly':
                return monthlyData
            case 'yearly':
                return yearlyData
            default:
                return data
        }
    }

    const activeData = getActiveData()
    const currentTotal = activeData.reduce((sum, item) => sum + (item.total || 0), 0)

    // Helper untuk membuat dataset time series siap data sains (Pandas / Scikit-Learn)
    const generateTimeSeriesDataset = () => {
        let runningTotal = 0
        return activeData.map((item, idx) => {
            const rev = item.total || 0
            runningTotal += rev
            
            // Hitung growth rate vs periode sebelumnya
            const prevRev = idx > 0 ? (activeData[idx - 1].total || 0) : 0
            const growthRate = prevRev > 0 ? Number(((rev - prevRev) / prevRev * 100).toFixed(2)) : 0

            // Hitung Moving Average 3 periode (SMA-3)
            let maSum = rev
            let maCount = 1
            if (idx >= 1) { maSum += (activeData[idx - 1].total || 0); maCount++ }
            if (idx >= 2) { maSum += (activeData[idx - 2].total || 0); maCount++ }
            const ma3 = Number((maSum / maCount).toFixed(2))

            return {
                period_index: idx,
                period_type: period,
                period_label: item.name,
                revenue: rev,
                cumulative_revenue: runningTotal,
                growth_rate_pct: growthRate,
                moving_average_3p: ma3
            }
        })
    }

    // Ekspor ke CSV murni tanpa format simbol (Data Science UTF-8 RFC 4180)
    const exportDatasetCSV = () => {
        const dataset = generateTimeSeriesDataset()
        if (dataset.length === 0) return

        const headers = ["period_index", "period_type", "period_label", "revenue", "cumulative_revenue", "growth_rate_pct", "moving_average_3p"]
        const rows = dataset.map(row => [
            row.period_index,
            `"${row.period_type}"`,
            `"${row.period_label.replace(/"/g, '""')}"`,
            row.revenue,
            row.cumulative_revenue,
            row.growth_rate_pct,
            row.moving_average_3p
        ])

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        const dateStr = new Date().toISOString().slice(0, 10)
        link.setAttribute("href", url)
        link.setAttribute("download", `singgah_pos_${period}_sales_dataset_${dateStr}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setShowExportMenu(false)
    }

    // Ekspor ke JSON murni untuk Python pandas.read_json atau machine learning pipeline
    const exportDatasetJSON = () => {
        const dataset = generateTimeSeriesDataset()
        if (dataset.length === 0) return

        const jsonContent = JSON.stringify(dataset, null, 2)
        const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        const dateStr = new Date().toISOString().slice(0, 10)
        link.setAttribute("href", url)
        link.setAttribute("download", `singgah_pos_${period}_sales_dataset_${dateStr}.json`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        setShowExportMenu(false)
    }

    const formatYAxis = (val: number) => {
        if (val >= 1_000_000) {
            return `Rp${(val / 1_000_000).toFixed(1)}M`
        }
        if (val >= 1_000) {
            return `Rp${Math.round(val / 1_000)}k`
        }
        return `Rp${val}`
    }

    return (
        <Card className="col-span-1 md:col-span-3">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
                <div>
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-base sm:text-lg">{PERIOD_CONFIG[period].title}</CardTitle>
                        {currentTotal > 0 && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                                Total: Rp {formatNumber(currentTotal)}
                            </span>
                        )}
                    </div>
                    <CardDescription className="text-xs sm:text-sm mt-0.5">
                        {PERIOD_CONFIG[period].desc}
                    </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {/* Period Selector Tabs */}
                    <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0" role="tablist" aria-label="Pilih Periode Grafik">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={period === 'daily'}
                            onClick={() => setPeriod('daily')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                period === 'daily'
                                    ? 'bg-white text-primary shadow-sm border border-slate-200/60'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Harian
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={period === 'weekly'}
                            onClick={() => setPeriod('weekly')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                period === 'weekly'
                                    ? 'bg-white text-primary shadow-sm border border-slate-200/60'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Mingguan
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={period === 'monthly'}
                            onClick={() => setPeriod('monthly')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                period === 'monthly'
                                    ? 'bg-white text-primary shadow-sm border border-slate-200/60'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Bulanan
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={period === 'yearly'}
                            onClick={() => setPeriod('yearly')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                period === 'yearly'
                                    ? 'bg-white text-primary shadow-sm border border-slate-200/60'
                                    : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                            Tahunan
                        </button>
                    </div>

                    {/* Data Science Export Button */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-all border border-slate-700"
                            title="Unduh dataset terstruktur untuk pemodelan data science (Python / Google Colab)"
                        >
                            <Database className="w-3.5 h-3.5 text-amber-400" />
                            Ekspor Dataset
                            <Download className="w-3 h-3 text-slate-300 ml-0.5" />
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-1.5 animate-in fade-in slide-in-from-top-1">
                                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                                    Dataset {period.toUpperCase()} (Siap Data Sains)
                                </div>
                                <button
                                    type="button"
                                    onClick={exportDatasetCSV}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg text-left transition-colors"
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                    <div>
                                        <div>Format CSV (*.csv)</div>
                                        <div className="text-[10px] text-slate-400 font-normal">Untuk Pandas, Excel & R</div>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={exportDatasetJSON}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-lg text-left transition-colors mt-0.5"
                                >
                                    <FileCode className="w-4 h-4 text-blue-600" />
                                    <div>
                                        <div>Format JSON (*.json)</div>
                                        <div className="text-[10px] text-slate-400 font-normal">Untuk Python dict & API pipeline</div>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pl-2 pt-2">
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={activeData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4B3621" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#4B3621" stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={formatYAxis}
                            />
                            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-200" />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [`Rp ${formatNumber(value)}`, 'Total Penjualan']}
                            />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#4B3621"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#colorTotal)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
