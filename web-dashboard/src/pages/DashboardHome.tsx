import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { SalesChart } from "../components/dashboard/SalesChart"
import { TopSellingItems } from "../components/dashboard/TopSellingItems"
import { useEffect, useState } from "react"
import { fetchSettings } from "../services/settingsService"
import { Loader2 } from "lucide-react"
import { getImageUrl } from "../lib/utils"
import { useDashboard } from "../hooks/useDashboard"

export default function DashboardHome() {
    const [logoUrl, setLogoUrl] = useState("")
    const [outletName, setOutletName] = useState("Singgah Coffee")

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(value)
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
                console.error("Failed to load branding:", error)
            }
        }
        loadBranding()
    }, [])

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
                        <h1 className="text-3xl font-bold text-gray-900">Ringkasan {outletName}</h1>
                        <p className="text-gray-500">Selamat datang kembali di panel administrasi Anda.</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">Ekspor Data</Button>
                    <Button>Pesanan Baru</Button>
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
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Stok Menipis</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {statsLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : summary.low_stock_count}
                        </div>
                        <p className={`text-xs mt-1 ${summary.low_stock_count > 0 ? "text-destructive font-bold" : "text-gray-500"}`}>
                            {summary.low_stock_count > 0 ? "Perlu perhatian" : "Semua stok aman"}
                        </p>
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

import { Button } from "../components/ui/button"
