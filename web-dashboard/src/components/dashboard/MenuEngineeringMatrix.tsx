import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card'
import { Star, HelpCircle, AlertCircle, FileSpreadsheet, Sparkles, TrendingUp } from 'lucide-react'
import { formatCurrency } from '../../lib/utils'
import type { ProductSalesVolume } from '../../types'

interface MenuEngineeringProps {
    products: ProductSalesVolume[]
}

type QuadrantType = 'all' | 'star' | 'plowhorse' | 'puzzle' | 'dog'

interface ClassifiedProduct extends ProductSalesVolume {
    unitMargin: number
    marginPct: number
    quadrant: 'star' | 'plowhorse' | 'puzzle' | 'dog'
    recommendation: string
}

export function MenuEngineeringMatrix({ products = [] }: MenuEngineeringProps) {
    const [selectedQuadrant, setSelectedQuadrant] = useState<QuadrantType>('all')

    // Hitung rata-rata volume dan rata-rata margin untuk penentuan garis kuadran
    const { classifiedProducts, avgVolume, avgMargin, stats } = useMemo(() => {
        const validProducts = products.filter(p => p.quantity > 0 || p.revenue > 0)
        if (validProducts.length === 0) {
            return {
                classifiedProducts: [],
                avgVolume: 0,
                avgMargin: 0,
                stats: { star: 0, plowhorse: 0, puzzle: 0, dog: 0 }
            }
        }

        const totalQty = validProducts.reduce((sum, p) => sum + (p.quantity || 0), 0)
        const totalGrossProfit = validProducts.reduce((sum, p) => sum + ((p.revenue || 0) - (p.total_cogs || 0)), 0)
        
        const meanVol = totalQty / validProducts.length
        const meanMargin = totalQty > 0 ? (totalGrossProfit / totalQty) : 0

        let starsCount = 0
        let plowhorsesCount = 0
        let puzzlesCount = 0
        let dogsCount = 0

        const classified: ClassifiedProduct[] = validProducts.map(p => {
            const qty = p.quantity || 0
            const rev = p.revenue || 0
            const cogs = p.total_cogs || 0
            const grossProfit = rev - cogs
            const unitMargin = qty > 0 ? (grossProfit / qty) : 0
            const marginPct = rev > 0 ? (grossProfit / rev) * 100 : 0

            const isHighVolume = qty >= meanVol
            const isHighMargin = unitMargin >= meanMargin

            let quadrant: 'star' | 'plowhorse' | 'puzzle' | 'dog'
            let recommendation = ""

            if (isHighVolume && isHighMargin) {
                quadrant = 'star'
                recommendation = "Bintang penjualan! Pertahankan cita rasa, prioritas stok bahan baku, dan jangan ubah resep."
                starsCount++
            } else if (isHighVolume && !isHighMargin) {
                quadrant = 'plowhorse'
                recommendation = "Sangat laris namun margin tipis. Rekomendasi: Naikkan harga Rp 1.000 - Rp 2.000 atau renegosiasi bahan baku."
                plowhorsesCount++
            } else if (!isHighVolume && isHighMargin) {
                quadrant = 'puzzle'
                recommendation = "Laba per cup sangat tinggi namun kurang laku. Rekomendasi: Wajibkan kasir jadikan promo upselling."
                puzzlesCount++
            } else {
                quadrant = 'dog'
                recommendation = "Kurang laku dan margin rendah. Rekomendasi: Evaluasi eliminasi dari menu atau ganti varian rasa baru."
                dogsCount++
            }

            return {
                ...p,
                unitMargin,
                marginPct,
                quadrant,
                recommendation
            }
        })

        return {
            classifiedProducts: classified,
            avgVolume: meanVol,
            avgMargin: meanMargin,
            stats: {
                star: starsCount,
                plowhorse: plowhorsesCount,
                puzzle: puzzlesCount,
                dog: dogsCount
            }
        }
    }, [products])

    const filteredItems = useMemo(() => {
        if (selectedQuadrant === 'all') return classifiedProducts
        return classifiedProducts.filter(p => p.quadrant === selectedQuadrant)
    }, [classifiedProducts, selectedQuadrant])

    // Ekspor Dataset Menu Engineering ke CSV untuk Data Science & Machine Learning
    const exportMenuEngineeringCSV = () => {
        if (classifiedProducts.length === 0) return

        const headers = [
            "product_id",
            "product_name",
            "category",
            "quantity_sold",
            "avg_selling_price",
            "avg_cogs_cost",
            "unit_gross_margin",
            "margin_percentage",
            "total_revenue",
            "total_gross_profit",
            "quadrant_classification",
            "strategic_recommendation"
        ]

        const rows = classifiedProducts.map(p => [
            p.product_id || 0,
            `"${(p.name || '').replace(/"/g, '""')}"`,
            `"${(p.category || 'Lainnya').replace(/"/g, '""')}"`,
            p.quantity || 0,
            Math.round(p.avg_price || 0),
            Math.round(p.avg_cost || 0),
            Math.round(p.unitMargin || 0),
            p.marginPct.toFixed(2),
            Math.round(p.revenue || 0),
            Math.round((p.revenue || 0) - (p.total_cogs || 0)),
            `"${p.quadrant.toUpperCase()}"`,
            `"${p.recommendation.replace(/"/g, '""')}"`
        ])

        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        const dateStr = new Date().toISOString().slice(0, 10)
        link.setAttribute("href", url)
        link.setAttribute("download", `singgah_pos_menu_engineering_bcg_dataset_${dateStr}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    if (products.length === 0) {
        return null
    }

    return (
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="border-b bg-slate-50/70 pb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold mb-1">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            Kasavana-Smith & BCG Menu Engineering Matrix
                        </div>
                        <CardTitle className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                            Analisis Portofolio Menu & Profitabilitas Produk
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-500 mt-0.5">
                            Klasifikasi 4 kuadran otomatis berdasarkan popularitas volume vs margin laba per cup (Threshold: Rata-rata Vol: {Math.round(avgVolume)} cup, Rata-rata Margin: {formatCurrency(Math.round(avgMargin))})
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={exportMenuEngineeringCSV}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-all"
                            title="Unduh dataset lengkap 4 kuadran untuk pemodelan data science"
                        >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            Ekspor Dataset BCG (.CSV)
                        </button>
                    </div>
                </div>

                {/* 4 Quadrants Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    {/* STARS */}
                    <div 
                        onClick={() => setSelectedQuadrant(selectedQuadrant === 'star' ? 'all' : 'star')}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                            selectedQuadrant === 'star'
                                ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400/30 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-amber-200'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                Stars (Bintang)
                            </span>
                            <span className="text-xs font-black bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full">
                                {stats.star}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Laba Tinggi & Sangat Laris</p>
                    </div>

                    {/* PLOWHORSES */}
                    <div 
                        onClick={() => setSelectedQuadrant(selectedQuadrant === 'plowhorse' ? 'all' : 'plowhorse')}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                            selectedQuadrant === 'plowhorse'
                                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400/30 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-blue-200'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                                <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                                Plowhorses
                            </span>
                            <span className="text-xs font-black bg-blue-200/80 text-blue-950 px-2 py-0.5 rounded-full">
                                {stats.plowhorse}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Sangat Laris, Margin Tipis</p>
                    </div>

                    {/* PUZZLES */}
                    <div 
                        onClick={() => setSelectedQuadrant(selectedQuadrant === 'puzzle' ? 'all' : 'puzzle')}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                            selectedQuadrant === 'puzzle'
                                ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400/30 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-purple-200'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-purple-900 flex items-center gap-1">
                                <HelpCircle className="w-3.5 h-3.5 text-purple-500" />
                                Puzzles
                            </span>
                            <span className="text-xs font-black bg-purple-200/80 text-purple-950 px-2 py-0.5 rounded-full">
                                {stats.puzzle}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Laba Tinggi, Kurang Laku</p>
                    </div>

                    {/* DOGS */}
                    <div 
                        onClick={() => setSelectedQuadrant(selectedQuadrant === 'dog' ? 'all' : 'dog')}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                            selectedQuadrant === 'dog'
                                ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/30 shadow-xs'
                                : 'bg-white border-slate-200 hover:border-rose-200'
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-rose-900 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                Dogs
                            </span>
                            <span className="text-xs font-black bg-rose-200/80 text-rose-950 px-2 py-0.5 rounded-full">
                                {stats.dog}
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Laba Rendah, Kurang Laku</p>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700">
                        Menampilkan {filteredItems.length} menu {selectedQuadrant !== 'all' ? `pada kuadran ${selectedQuadrant.toUpperCase()}` : 'keseluruhan'}
                    </span>
                    {selectedQuadrant !== 'all' && (
                        <button
                            type="button"
                            onClick={() => setSelectedQuadrant('all')}
                            className="text-xs text-primary hover:underline font-semibold"
                        >
                            Tampilkan Semua Kuadran
                        </button>
                    )}
                </div>

                <div className="overflow-x-auto border rounded-2xl border-slate-200">
                    <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                            <tr>
                                <th className="px-3 py-2.5">Menu Produk</th>
                                <th className="px-3 py-2.5">Kategori</th>
                                <th className="px-3 py-2.5 text-right">Terjual (Vol)</th>
                                <th className="px-3 py-2.5 text-right">Harga Jual</th>
                                <th className="px-3 py-2.5 text-right">HPP (Modal)</th>
                                <th className="px-3 py-2.5 text-right">Margin / Cup</th>
                                <th className="px-3 py-2.5 text-center">Kuadran</th>
                                <th className="px-3 py-2.5">Rekomendasi Strategi Bisnis</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.map((p, idx) => (
                                <tr key={p.product_id || idx} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-3 py-2 font-bold text-slate-900">{p.name}</td>
                                    <td className="px-3 py-2 text-slate-500">{p.category || 'Lainnya'}</td>
                                    <td className="px-3 py-2 text-right font-black text-slate-800">{p.quantity} cup</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{formatCurrency(p.avg_price || 0)}</td>
                                    <td className="px-3 py-2 text-right text-slate-500">{formatCurrency(p.avg_cost || 0)}</td>
                                    <td className="px-3 py-2 text-right font-bold text-emerald-700">
                                        {formatCurrency(p.unitMargin || 0)}
                                        <span className="block text-[10px] text-slate-400 font-normal">({p.marginPct.toFixed(0)}%)</span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {p.quadrant === 'star' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300">
                                                ★ STAR
                                            </span>
                                        )}
                                        {p.quadrant === 'plowhorse' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-950 border border-blue-300">
                                                PLOWHORSE
                                            </span>
                                        )}
                                        {p.quadrant === 'puzzle' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-950 border border-purple-300">
                                                PUZZLE
                                            </span>
                                        )}
                                        {p.quadrant === 'dog' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-950 border border-rose-300">
                                                DOG
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-slate-600 text-[11px] leading-relaxed max-w-xs">
                                        {p.recommendation}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    )
}
