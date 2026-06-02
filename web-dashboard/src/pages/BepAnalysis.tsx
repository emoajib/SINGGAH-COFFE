// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
import React, { useState } from 'react'
import { useBEPReport } from '../hooks/useBep'
import {
  TrendingUp,
  Target,
  AlertTriangle,
  BarChart3,
  DollarSign,
  Package,
  Shield,
  Loader2,
  Activity,
  Zap,
  ChevronDown,
  ChevronUp,
  Info,
  PieChart as PieChartIcon
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { formatNumber } from '../lib/utils'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts'
const STATUS_COLORS: Record<string, string> = {
  AMAN: 'bg-green-500',
  WASPADA: 'bg-yellow-500',
  KRITIS: 'bg-red-500'
}
const STATUS_TEXT: Record<string, string> = {
  AMAN: '🟢 Aman',
  WASPADA: '🟡 Waspada',
  KRITIS: '🔴 Kritis'
}

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
const BepAnalysis: React.FC = () => {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [showDetails, setShowDetails] = useState(false)

  const { data: bep, isLoading, error, refetch } = useBEPReport(month, year)

  const report = bep?.report
  const forecast = bep?.forecast
  const sensitivity = bep?.sensitivity
  const monteCarlo = bep?.monte_carlo
  const earlyWarning = bep?.early_warning

  const summaryCards = [
    {
      title: 'BEP (Unit)',
      value: report ? `${formatNumber(report.bep_units)} unit` : '-',
      subtitle: report ? `${formatNumber(report.bep_daily_units)} unit/hari` : '',
      icon: Target,
      color: 'bg-blue-600',
      gradient: 'bg-blue-600',
    },
    {
      title: 'BEP (Rp)',
      value: report ? `Rp ${formatNumber(report.bep_revenue)}` : '-',
      subtitle: report ? `${formatNumber(report.daily_target)}/hari` : '',
      icon: DollarSign,
      color: 'bg-primary',
      gradient: 'gradient-primary',
    },
    {
      title: 'Margin Kontribusi',
      value: report ? `${formatNumber(report.cm_ratio * 100)}%` : '-',
      subtitle: report ? `Rp ${formatNumber(report.contribution_margin)}` : '',
      icon: Activity,
      color: 'bg-purple-600',
      gradient: 'bg-purple-600',
    },
    {
      title: 'Margin of Safety',
      value: report ? `${formatNumber(report.margin_of_safety)}%` : '-',
      subtitle: report ? `Status: ${STATUS_TEXT[report.status] || '-'}` : '',
      icon: Shield,
      color: report?.status === 'AMAN' ? 'bg-green-600' : report?.status === 'WASPADA' ? 'bg-yellow-600' : 'bg-red-600',
      gradient: report?.status === 'AMAN' ? 'bg-green-600' : report?.status === 'WASPADA' ? 'bg-yellow-600' : 'bg-red-600',
    },
    {
      title: 'Payback Period',
      value: report?.initial_capital ? report.payback_label : '-',
      subtitle: report?.initial_capital ? `ROI Tahunan: ${formatNumber(report.roi_annual)}%` : 'Modal belum diset',
      icon: Zap,
      color: 'bg-orange-600',
      gradient: 'bg-orange-600',
    },
  ]

  // ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager
  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-full min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
        <Card className="border-none shadow-xl">
          <CardContent className="py-20 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Gagal Memuat Data BEP</h2>
            <p className="text-gray-500 mb-4">Terjadi kesalahan saat mengambil data. Coba lagi.</p>
            <Button onClick={() => refetch()}>Muat Ulang</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const chartData = []
  if (report) {
    chartData.push({
      name: 'Pendapatan',
      value: report.total_revenue,
      fill: '#22c55e'
    })
    chartData.push({
      name: 'BEP Revenue',
      value: report.bep_revenue,
      fill: '#8b4513'
    })
    chartData.push({
      name: 'Total Biaya Tetap',
      value: report.total_fixed_cost,
      fill: '#ef4444'
    })
    chartData.push({
      name: 'Total Biaya Variabel',
      value: report.total_variable_cost,
      fill: '#f59e0b'
    })
  }

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Analisis Break-Even Point</h1>
          <p className="text-gray-500 font-medium">Titik impas, prediksi, dan rekomendasi strategis khusus Owner.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            type="month"
            className="w-48 h-10 bg-white"
            value={`${year}-${String(month).padStart(2, '0')}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split('-')
              setYear(parseInt(y))
              setMonth(parseInt(m))
            }}
          />
          <Badge className={`text-[10px] font-black uppercase tracking-wider ${earlyWarning ? STATUS_COLORS[earlyWarning.status] || 'bg-gray-500' : 'bg-gray-500'} text-white px-3 py-1`}>
            {earlyWarning ? STATUS_TEXT[earlyWarning.status] || '-' : '-'}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => (
          <Card key={index} className="border-none shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 group-hover:scale-125 transition-transform duration-500 ${card.color}`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.gradient} text-white shadow-lg`}>
                <card.icon className="w-4 h-4" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-black text-gray-900 mb-1">{card.value}</div>
              <p className="text-[10px] text-gray-400 font-bold uppercase italic">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comparison Bar Chart */}
      <Card className="border-none shadow-xl glass-panel overflow-hidden">
        <CardHeader className="border-b bg-white/30">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Perbandingan Keuangan
          </CardTitle>
          <CardDescription>Pendapatan vs BEP vs Biaya periode ini</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }} tickFormatter={(v) => `Rp ${v / 1000}k`} />
                <Tooltip formatter={(value: number) => [`Rp ${formatNumber(value)}`, '']} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={80}>
                  {chartData.map((_entry, index) => (
                    <Cell key={index} fill={_entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Capital & Profitability Analysis */}
      {report?.initial_capital ? (
        <Card className="border-none shadow-xl glass-panel overflow-hidden">
          <CardHeader className="border-b bg-white/30">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Analisis Modal & Profitabilitas
            </CardTitle>
            <CardDescription>Target pengembalian investasi (ROI)</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-white rounded-2xl border shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Modal Awal Investasi</p>
                <p className="text-2xl font-black text-gray-900">Rp {formatNumber(report.initial_capital)}</p>
                <p className="text-[10px] text-gray-400 mt-1 italic">Amortisasi: {report.amortization_months} bulan</p>
              </div>
              <div className="p-4 bg-white rounded-2xl border shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Target Revenue BEP + Modal</p>
                <p className="text-2xl font-black text-primary">Rp {formatNumber(report.bep_with_capital_revenue)}</p>
                <p className="text-[10px] text-gray-400 mt-1 italic">Minimal omset agar modal kembali sesuai target</p>
              </div>
              <div className="p-4 bg-white rounded-2xl border shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Margin Kontribusi Saat Ini</p>
                <p className={`text-2xl font-black ${report.cm_ratio > 0.6 ? 'text-green-600' : 'text-orange-600'}`}>
                  {formatNumber(report.cm_ratio * 100)}%
                </p>
                <p className="text-[10px] text-gray-400 mt-1 italic">Target margin ideal: 60-70%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Forecast + Monte Carlo Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forecast Card */}
        <Card className="border-none shadow-xl glass-panel">
          <CardHeader className="border-b bg-white/30">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Prediksi Bulan Depan
            </CardTitle>
            <CardDescription>
              Berdasarkan WMA + pola musiman 90 hari terakhir
              {forecast?.mape ? ` (MAPE: ${formatNumber(forecast.mape)}%)` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {forecast ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 border">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Prediksi Revenue</p>
                    <p className="text-2xl font-black text-gray-900">Rp {formatNumber(forecast.predicted_revenue)}</p>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>Optimis: Rp {formatNumber(forecast.confidence_upper)}</span>
                      <span>Pessimis: Rp {formatNumber(forecast.confidence_lower)}</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{'Probabilitas > BEP'}</p>
                    <p className="text-2xl font-black text-gray-900">{formatNumber(forecast.probability_above_bep * 100)}%</p>
                    <p className="text-[10px] text-gray-400 mt-1">Tren: {forecast.trend}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-gray-400">Data historis belum mencukupi (min 14 hari)</div>
            )}
          </CardContent>
        </Card>

        {/* Monte Carlo Card */}
        <Card className="border-none shadow-xl glass-panel">
          <CardHeader className="border-b bg-white/30">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-primary" />
              Simulasi Probabilitas Monte Carlo
            </CardTitle>
            <CardDescription>10.000 iterasi simulasi BEP probabilistik</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {monteCarlo ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 border">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">BEP Mean (Unit)</p>
                    <p className="text-2xl font-black text-gray-900">{formatNumber(monteCarlo.mean_bep_units)}</p>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>P10: {formatNumber(monteCarlo.p10_bep_units)}</span>
                      <span>P90: {formatNumber(monteCarlo.p90_bep_units)}</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Probabilitas Profit</p>
                    <p className={`text-2xl font-black ${monteCarlo.probability_profit > 0.5 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatNumber(monteCarlo.probability_profit * 100)}%
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">Rugi: {formatNumber(monteCarlo.probability_loss * 100)}%</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border">
                  <div className="flex justify-between text-xs font-bold">
                    <span>Mean BEP Revenue</span>
                    <span className="text-primary">Rp {formatNumber(monteCarlo.mean_bep_revenue)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold mt-1">
                    <span>Estimasi Profit Rata-rata</span>
                    <span className={monteCarlo.mean_profit > 0 ? 'text-green-600' : 'text-red-600'}>
                      Rp {formatNumber(monteCarlo.mean_profit)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-gray-400">Data belum mencukupi untuk simulasi Monte Carlo</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sensitivity Analysis */}
      {sensitivity && (
        <Card className="border-none shadow-xl glass-panel overflow-hidden">
          <CardHeader className="border-b bg-white/30">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Analisis Sensitivitas — What-If
            </CardTitle>
            <CardDescription>
              Parameter paling sensitif: <strong>{sensitivity.most_sensitive_to}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="text-left py-3 px-2">Skenario</th>
                    <th className="text-right py-3 px-2">BEP (Unit)</th>
                    <th className="text-right py-3 px-2">BEP (Rp)</th>
                    <th className="text-right py-3 px-2">Perubahan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b bg-primary/5 font-bold">
                    <td className="py-3 px-2 text-gray-900">Saat Ini</td>
                    <td className="py-3 px-2 text-right">{formatNumber(sensitivity.current_bep_units)}</td>
                    <td className="py-3 px-2 text-right">Rp {formatNumber(sensitivity.current_bep_revenue)}</td>
                    <td className="py-3 px-2 text-right">—</td>
                  </tr>
                  {sensitivity.scenarios.slice(0, 6).map((s, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-700">{s.label}</td>
                      <td className="py-2 px-2 text-right">{formatNumber(s.new_bep_units)}</td>
                      <td className="py-2 px-2 text-right">Rp {formatNumber(s.new_bep_revenue)}</td>
                      <td className={`py-2 px-2 text-right font-bold ${s.delta_percent < 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {s.delta_percent > 0 ? '+' : ''}{formatNumber(s.delta_percent)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between mt-4 text-xs font-bold text-gray-500">
              <span>Best Case: {sensitivity.best_case.scenario} ({formatNumber(sensitivity.best_case.bep_units)} unit)</span>
              <span>Worst Case: {sensitivity.worst_case.scenario} ({formatNumber(sensitivity.worst_case.bep_units)} unit)</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Margin Ranking */}
      {report?.per_product && report.per_product.length > 0 && (
        <Card className="border-none shadow-xl glass-panel overflow-hidden">
          <CardHeader className="border-b bg-white/30">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Peringkat Margin Produk
            </CardTitle>
            <CardDescription>Urutan berdasarkan unit terjual. Margin sehat coffee shop: 60-70%</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-[10px] font-black uppercase tracking-wider text-gray-400">
                    <th className="text-left py-3 px-2">#</th>
                    <th className="text-left py-3 px-2">Produk</th>
                    <th className="text-left py-3 px-2">Kategori</th>
                    <th className="text-right py-3 px-2">Harga</th>
                    <th className="text-right py-3 px-2">HPP</th>
                    <th className="text-right py-3 px-2">Margin</th>
                    <th className="text-right py-3 px-2">Terjual</th>
                    <th className="text-right py-3 px-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report.per_product.map((p, i) => (
                    <tr key={i} className={`border-b hover:bg-gray-50 ${p.margin_ratio < 20 ? 'bg-red-50/50' : ''}`}>
                      <td className="py-2 px-2 font-black text-gray-400">#{p.rank}</td>
                      <td className="py-2 px-2 font-medium text-gray-900">{p.product_name}</td>
                      <td className="py-2 px-2 text-gray-500">{p.category}</td>
                      <td className="py-2 px-2 text-right">Rp {formatNumber(p.selling_price)}</td>
                      <td className="py-2 px-2 text-right">Rp {formatNumber(p.variable_cost)}</td>
                      <td className="py-2 px-2 text-right">
                        <Badge variant={p.margin_ratio < 20 ? 'destructive' : p.margin_ratio < 40 ? 'secondary' : 'default'} className="text-[10px]">
                          {formatNumber(p.margin_ratio)}%
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right">{formatNumber(p.units_sold)}</td>
                      <td className="py-2 px-2 text-right font-medium">Rp {formatNumber(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fixed Cost Breakdown */}
      {report?.fixed_cost_breakdown && report.fixed_cost_breakdown.length > 0 && (
        <Card className="border-none shadow-xl glass-panel overflow-hidden">
          <CardHeader className="border-b bg-white/30 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Rincian Biaya Tetap
              </CardTitle>
              <CardDescription>Total: Rp {formatNumber(report.total_fixed_cost)}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)} className="text-[10px] font-bold">
              {showDetails ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {showDetails ? 'Sembunyikan' : 'Detail'}
            </Button>
          </CardHeader>
          {showDetails && (
            <CardContent className="p-6">
              <div className="space-y-2">
                {report.fixed_cost_breakdown.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-white rounded-lg border hover:bg-gray-50">
                    <span className="font-medium text-gray-700">{item.name}</span>
                    <span className="font-bold text-gray-900">Rp {formatNumber(item.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Early Warning & Recommendations */}
      {earlyWarning && earlyWarning.recommendations.length > 0 && (
        <Card className="border-none shadow-xl glass-panel overflow-hidden">
          <CardHeader className="border-b bg-white/30">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${earlyWarning.status === 'AMAN' ? 'text-green-500' : earlyWarning.status === 'WASPADA' ? 'text-yellow-500' : 'text-red-500'}`} />
              Rekomendasi & Early Warning
            </CardTitle>
            <CardDescription>
              Status: {STATUS_TEXT[earlyWarning.status] || '-'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {earlyWarning.recommendations.map((rec, i) => (
              <div key={i} className={`p-4 rounded-xl border ${
                rec.severity === 'critical' ? 'bg-red-50 border-red-200' :
                rec.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`p-1 rounded-full ${
                    rec.severity === 'critical' ? 'bg-red-100 text-red-600' :
                    rec.severity === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    <Info className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-sm text-gray-900">
                        {rec.severity === 'critical' ? '🔴 ' : rec.severity === 'warning' ? '🟡 ' : '🟢 '}
                        {rec.condition}
                      </p>
                      <Badge variant="outline" className="text-[9px] font-black uppercase ml-2">{rec.metric}</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{rec.action}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !error && report && report.total_revenue === 0 && (
        <Card className="border-none shadow-xl">
          <CardContent className="py-20 text-center">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-600 mb-2">Belum Ada Data Penjualan</h2>
            <p className="text-gray-400">Data untuk periode ini belum tersedia. Pilih periode lain atau catat transaksi terlebih dahulu.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default BepAnalysis
