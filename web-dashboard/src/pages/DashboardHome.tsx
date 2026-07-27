import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { SalesChart } from "../components/dashboard/SalesChart"
import { TopSellingItems } from "../components/dashboard/TopSellingItems"
import { useEffect, useState } from "react"
import { fetchSettings } from "../services/settingsService"
import { InventoryService } from "../services/inventoryService"
import { AlertTriangle, Loader2 } from "lucide-react"
import { getImageUrl, formatNumber } from "../lib/utils"
import { useDashboard } from "../hooks/useDashboard"
import { Button } from "../components/ui/button"
import { useSelector } from "react-redux"
import { RootState } from "../store"
import type { Ingredient } from "../types"

interface DashboardHomeProps {
    setActiveTab: (tab: string) => void
}

export default function DashboardHome({ setActiveTab }: DashboardHomeProps) {
    const { user } = useSelector((state: RootState) => state.auth)
    const [logoUrl, setLogoUrl] = useState("")
    const [outletName, setOutletName] = useState("Singgah Coffee")
    const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([])
    const [showLowStockDetails, setShowLowStockDetails] = useState(false)

    const formatCurrency = (value: number) => {
        return `Rp ${formatNumber(value)}`
    }

    const { data: _summary, isLoading: statsLoading } = useDashboard()
    const summary: any = _summary ?? {
        total_sales: 0,
        active_orders: 0,
        low_stock_count: 0,
        transactions_today: 0,
        sales_trend: [] as { name: string; total: number }[],
        category_breakdown: [] as { category: string; total: number }[],
        top_products: [] as { name: string; category: string; sales: number }[]
    }

    useEffect(() => {
        const loadBranding = async () => {
            try {
                const settings = await fetchSettings()
                if (settings.outlet_logo_url) setLogoUrl(settings.outlet_logo_url)
                if (settings.outlet_name) setOutletName(settings.outlet_name)
            } catch (error) {
                void error
            }
        }
        loadBranding()
    }, [])

    useEffect(() => {
        if (summary.low_stock_count > 0) {
            InventoryService.getLowStockAlerts().then(res => {
                setLowStockItems(res.alerts || [])
            }).catch(() => {})
        }
    }, [summary.low_stock_count])

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
                            <Button variant="outline" size="sm" className="text-xs sm:text-sm opacity-50 cursor-not-allowed" title="Feature coming soon">Ekspor Data</Button>
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
                                    onClick={(e) => { e.stopPropagation(); setActiveTab('ingredients') }}
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <SalesChart data={summary.sales_trend || []} />
                <TopSellingItems items={summary.top_products || []} />
            </div>
        </div>
    )
}
