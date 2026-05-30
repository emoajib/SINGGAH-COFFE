import React, { useState, useEffect } from "react"
import { useDashboard } from '../hooks/useDashboard'
import api from '../lib/api'
import {
    DollarSign,
    Package,
    Wallet,
    TrendingUp,
    Loader2,
    BarChart3,
    AlertTriangle,
    Monitor,
    ShoppingBag,
    PieChart as PieChartIcon,
    Download,
    FileSpreadsheet,
    FileText,
    Calendar
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Badge } from "../components/ui/badge"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { formatNumber } from "../lib/utils"
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const COLORS = ['#8b4513', '#d2691e', '#A0522D', '#DEB887', '#F4A460'];

const Reports: React.FC = () => {
    const [trendType, setTrendType] = useState<'hourly' | 'weekly'>('hourly');
    const { data: _summary, isLoading } = useDashboard();
    
    // Financial Report State
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [plData, setPlData] = useState<any>(null);
    const [isPlLoading, setIsPlLoading] = useState(false);

    useEffect(() => {
        fetchProfitLoss();
    }, []);

    const fetchProfitLoss = async () => {
        setIsPlLoading(true);
        try {
            const res = await api.get('/reports/profit-loss', { params: dateRange });
            setPlData(res.data);
        } catch (err) {
            console.error("Failed to fetch P&L data", err);
        } finally {
            setIsPlLoading(false);
        }
    };

    const downloadExcel = () => {
        if (!plData) return;
        
        // Excel-compatible HTML format
        const excelFile = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
                <meta charset="utf-8">
            </head>
            <body>
                <table>
                    <tr><td colspan="2">SINGGAH COFFEE</td></tr>
                    <tr><td colspan="2">LAPORAN LABA RUGI</td></tr>
                    <tr><td colspan="2">Periode: ${plData.start_date} s/d ${plData.end_date}</td></tr>
                    <tr><td colspan="2"></td></tr>
                    <tr><td>KETERANGAN</td><td>JUMLAH (IDR)</td></tr>
                    <tr><td>I. PENDAPATAN</td><td>${formatNumber(plData.revenue)}</td></tr>
                    <tr><td>II. HPP</td><td>(${formatNumber(plData.cogs)})</td></tr>
                    <tr><td>III. BEBAN</td><td>(${formatNumber(plData.total_expenses)})</td></tr>
                    <tr><td>LABA BERSIH</td><td>${formatNumber(plData.net_profit)}</td></tr>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([excelFile], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Laporan_Singgah_${plData.start_date}.xls`;
        link.click();
    };

    const printPdf = () => {
        window.print();
    };

    const summary: any = _summary ?? {
        total_sales: 0,
        total_cogs: 0,
        total_expenses: 0,
        net_profit: 0,
        transactions_today: 0,
        low_stock_count: 0,
        sales_trend: [],
        weekly_trend: [],
        category_breakdown: [],
        top_products: []
    };

    if (isLoading) {
        return (
            <div className="p-6 flex justify-center items-center h-full min-h-[400px]">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    const cards = [
        {
            title: 'Pendapatan Hari Ini',
            value: `Rp ${formatNumber(summary?.total_sales || 0)}`,
            icon: DollarSign,
            color: 'bg-primary',
            gradient: 'gradient-primary',
            desc: `${summary?.transactions_today || 0} Pesanan berhasil`
        },
        {
            title: 'HPP (Modal Bahan)',
            value: `Rp ${formatNumber(summary?.total_cogs || 0)}`,
            icon: Package,
            color: 'bg-orange-600',
            gradient: 'bg-orange-600',
            desc: 'Nilai pemakaian stok'
        },
        {
            title: 'Pengeluaran',
            value: `Rp ${formatNumber(summary?.total_expenses || 0)}`,
            icon: Wallet,
            color: 'bg-red-600',
            gradient: 'bg-red-600',
            desc: 'Biaya operasional'
        },
        {
            title: 'Laba Bersih Harian',
            value: `Rp ${formatNumber(summary?.net_profit || 0)}`,
            icon: TrendingUp,
            color: 'bg-green-600',
            gradient: 'gradient-success',
            desc: 'Keuntungan setelah semua biaya'
        },
    ];

    const currentTrendData = trendType === 'hourly' ? summary?.sales_trend : summary?.weekly_trend;

    return (
        <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
            <div className="flex justify-between items-end no-print">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Pusat Komando Analitik</h1>
                    <p className="text-gray-500 font-medium">Wawasan finansial mendalam dan performa operasional.</p>
                </div>
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2 mb-2 no-print">
                        <Input 
                            type="date" 
                            className="w-40 h-10 bg-white" 
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                        <Input 
                            type="date" 
                            className="w-40 h-10 bg-white" 
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                        <Button onClick={fetchProfitLoss} className="h-10">
                            <Calendar className="w-4 h-4 mr-2" />
                            Filter
                        </Button>
                    </div>
                    <div className="px-4 py-2 bg-white rounded-xl border shadow-sm flex items-center gap-2 self-end no-print">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Data Terhubung</span>
                    </div>
                </div>
            </div>

            {/* Accounting Report Section */}
            <div id="accounting-report" className="grid grid-cols-1 gap-6">
                <Card className="border-none shadow-xl relative overflow-hidden bg-white">
                    <CardHeader className="border-b bg-gray-50/50 flex flex-row items-center justify-between no-print">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                                <FileText className="w-5 h-5" />
                                Laporan Rugi Laba Akuntansi
                            </CardTitle>
                            <CardDescription>Format standar laporan keuangan periode {dateRange.start} - {dateRange.end}</CardDescription>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" size="sm" className="font-bold border-primary text-primary hover:bg-primary/5" onClick={downloadExcel}>
                                <FileSpreadsheet className="w-4 h-4 mr-2" />
                                EXCEL (.XLS)
                            </Button>
                            <Button size="sm" className="font-bold gradient-primary text-white" onClick={printPdf}>
                                <Download className="w-4 h-4 mr-2" />
                                PDF / CETAK
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isPlLoading ? (
                            <div className="py-20 flex justify-center no-print"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
                        ) : plData ? (
                            <div className="max-w-4xl mx-auto p-12 bg-white print:p-0" id="printable-pl">
                                <div className="text-center mb-8 border-b-2 border-primary pb-4">
                                    <h2 className="text-2xl font-black uppercase text-primary">SINGGAH COFFEE</h2>
                                    <p className="text-sm font-bold text-gray-500 tracking-widest uppercase">Laporan Laba Rugi</p>
                                    <p className="text-xs font-medium text-gray-400 mt-1">Periode: {plData.start_date} s/d {plData.end_date}</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between font-black text-lg border-b pb-2">
                                        <span>TOTAL PENDAPATAN</span>
                                        <span className="text-green-600">Rp {formatNumber(plData.revenue)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-gray-600 pl-4 italic">
                                        <span>Beban Pokok Penjualan (HPP)</span>
                                        <span>(Rp {formatNumber(plData.cogs)})</span>
                                    </div>
                                    <div className="flex justify-between font-black text-xl bg-gray-50 p-3 rounded-lg border-y-2 border-gray-200">
                                        <span>LABA KOTOR</span>
                                        <span className="text-blue-700">Rp {formatNumber(plData.revenue - plData.cogs)}</span>
                                    </div>
                                    <div className="pt-4">
                                        <p className="font-black text-sm uppercase text-gray-400">Beban Operasional</p>
                                        {plData.expenses?.map((e: any, i: number) => (
                                            <div key={i} className="flex justify-between text-sm font-bold text-gray-700 pl-4">
                                                <span>{e.category}</span>
                                                <span className="text-red-500">Rp {formatNumber(e.amount)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between font-bold text-gray-900 border-t pt-2 pl-4">
                                            <span>Total Beban</span>
                                            <span className="text-red-600 italic">(Rp {formatNumber(plData.total_expenses)})</span>
                                        </div>
                                    </div>
                                    <div className="pt-8 border-t-4 border-gray-900 flex justify-between items-center">
                                        <span className="text-xl font-black">LABA BERSIH AKHIR</span>
                                        <span className="text-3xl font-black text-primary">Rp {formatNumber(plData.net_profit)}</span>
                                    </div>

                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center text-gray-400 no-print">Gagal memuat data laporan keuangan.</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print">
                {cards.map((card, index) => (
                    <Card key={index} className="border-none shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                        <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 group-hover:scale-125 transition-transform duration-500 ${card.color}`} />
                        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
                            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                {card.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${card.gradient} text-white shadow-lg shadow-primary/20`}>
                                <card.icon className="w-4 h-4" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-2xl font-black text-gray-900 mb-1">{card.value}</div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase italic">{card.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print">
                {/* Sales Trend Chart */}
                <Card className="lg:col-span-2 border-none shadow-xl glass-panel overflow-hidden">
                    <CardHeader className="border-b border-white/20 bg-white/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-primary" />
                                    Tren Performa Pendapatan
                                </CardTitle>
                                <CardDescription>Melacak pertumbuhan dan pola trafik kasir.</CardDescription>
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <Button
                                    size="sm"
                                    variant={trendType === 'hourly' ? 'default' : 'ghost'}
                                    className={`text-[10px] font-bold h-7 ${trendType === 'hourly' ? 'shadow-sm' : ''}`}
                                    onClick={() => setTrendType('hourly')}
                                >
                                    HARI INI
                                </Button>
                                <Button
                                    size="sm"
                                    variant={trendType === 'weekly' ? 'default' : 'ghost'}
                                    className={`text-[10px] font-bold h-7 ${trendType === 'weekly' ? 'shadow-sm' : ''}`}
                                    onClick={() => setTrendType('weekly')}
                                >
                                    MINGGU INI
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={currentTrendData || []} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b4513" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b4513" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }}
                                        tickFormatter={(value) => `Rp ${value / 1000}k`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                                        formatter={(value: number) => [`Rp ${formatNumber(value)}`, 'Pendapatan']}
                                    />
                                    <Area type="monotone" dataKey="total" stroke="#8b4513" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    {/* Category Pie Chart */}
                    <Card className="border-none shadow-xl glass-panel">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-lg font-bold flex items-center gap-2">
                                <PieChartIcon className="w-5 h-5 text-primary" />
                                Pulse Kategori
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={summary?.category_breakdown || []}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="total"
                                            nameKey="category"
                                        >
                                            {(summary?.category_breakdown || []).map((_entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2 mt-4">
                                {summary?.category_breakdown?.map((cat: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-[10px] font-bold">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="uppercase text-gray-500">{cat.category}</span>
                                        </div>
                                        <span className="text-gray-900">Rp {formatNumber(cat.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Stats Card */}
                    <Card className="border-none shadow-xl bg-gray-900 text-white overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">Produk Terlaris</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {summary?.top_products && summary.top_products.length > 0 ? (
                                    summary.top_products.map((prod: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 group hover:bg-white/10 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary text-xs font-black italic">
                                                    #{i + 1}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold truncate w-32">{prod.name}</div>
                                                    <div className="text-[10px] uppercase font-black text-gray-500">{prod.category}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-black text-green-400">{prod.sales}</div>
                                                <div className="text-[8px] uppercase font-bold text-gray-600">terjual</div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-8 text-center text-gray-500 text-sm italic">Belum ada data penjualan hari ini.</div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Operational Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 no-print">
                <Card className="border-none shadow-xl glass-panel">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                        <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase">TRAFIK</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-gray-900">{summary?.transactions_today || 0}</div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Total Transaksi Harian</p>
                    </CardContent>
                </Card>

                <Card className={`border-none shadow-xl glass-panel ${summary?.low_stock_count && summary.low_stock_count > 0 ? 'bg-red-50/50' : ''}`}>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className={`p-2 rounded-xl ${summary?.low_stock_count && summary.low_stock_count > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase">INVENTORI</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-black ${summary?.low_stock_count && summary.low_stock_count > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {summary?.low_stock_count || 0}
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Peringatan Stok Kritis</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl glass-panel">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                            <Monitor className="w-5 h-5" />
                        </div>
                        <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase">PLATFORM</Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-gray-900">Online</div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Status Kesehatan Sistem</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Reports;
