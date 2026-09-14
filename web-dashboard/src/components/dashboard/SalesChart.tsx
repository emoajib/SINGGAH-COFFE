import { useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { formatNumber } from "../../lib/utils"

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

                {/* Period Selector Tabs */}
                <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto" role="tablist" aria-label="Pilih Periode Grafik">
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
