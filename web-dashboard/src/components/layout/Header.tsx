// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import {
    Bell,
    User,
    LogOut,
    Menu,
    Download,
    HelpCircle,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    ShoppingCart,
    Package
} from "lucide-react"
import { Button } from "../ui/button"
import { useDispatch, useSelector } from "react-redux"
import { logout } from "../../store/authSlice"
import { RootState } from "../../store"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { useEffect, useState } from "react"
import { fetchSettings } from "../../services/settingsService"
import { InventoryService } from "../../services/inventoryService"
import type { Ingredient } from "../../types"

interface HeaderProps {
    onMenuClick?: () => void
    onGuideClick?: () => void
    onNavigate?: (tab: string) => void
}

export default function Header({ onMenuClick, onGuideClick, onNavigate }: HeaderProps) {
    const dispatch = useDispatch()
    const { user } = useSelector((state: RootState) => state.auth)
    const [outletName, setOutletName] = useState("Singgah Coffee")
    const [alerts, setAlerts] = useState<Ingredient[]>([])
    const [alertCount, setAlertCount] = useState<number>(0)
    const [loadingAlerts, setLoadingAlerts] = useState(false)
    const [stockAlertsEnabled, setStockAlertsEnabled] = useState(true)
    const [popoverOpen, setPopoverOpen] = useState(false)

    const loadAlerts = async () => {
        setLoadingAlerts(true)
        try {
            const res = await InventoryService.getLowStockAlerts()
            setAlerts(res.alerts || [])
            setAlertCount(res.count ?? (res.alerts ? res.alerts.length : 0))
        } catch (error) {
            void error
        } finally {
            setLoadingAlerts(false)
        }
    }

    const loadSettingsAndAlerts = async () => {
        try {
            const settings = await fetchSettings()
            if (settings.outlet_name) setOutletName(settings.outlet_name)
            const enabled = settings.enable_stock_alerts !== "false"
            setStockAlertsEnabled(enabled)
            if (enabled) {
                await loadAlerts()
            } else {
                setAlerts([])
                setAlertCount(0)
            }
        } catch (error) {
            void error
        }
    }

    useEffect(() => {
        loadSettingsAndAlerts()
        const interval = setInterval(() => {
            loadSettingsAndAlerts()
        }, 60000)

        const handleSync = () => {
            loadSettingsAndAlerts()
        }

        window.addEventListener("settings-updated", handleSync)
        window.addEventListener("inventory-updated", handleSync)

        return () => {
            clearInterval(interval)
            window.removeEventListener("settings-updated", handleSync)
            window.removeEventListener("inventory-updated", handleSync)
        }
    }, [])

    return (
        <header className="bg-white border-b h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 w-full">
            <div className="flex items-center gap-3">
                <button onClick={onMenuClick} className="lg:hidden p-1.5 hover:bg-gray-100 rounded-md">
                    <Menu className="w-5 h-5 text-gray-600" />
                </button>
                <h2 className="font-semibold text-base md:text-lg text-gray-800 truncate">
                    Dashboard {outletName}
                </h2>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent("open-pwa-install"))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 text-xs font-bold transition-all shadow-xs active:scale-95"
                    title="Pasang Aplikasi di iPad / Tablet"
                >
                    <Download className="w-3.5 h-3.5 text-amber-700" />
                    <span>Pasang Aplikasi</span>
                </button>

                {onGuideClick && (
                    <button
                        onClick={onGuideClick}
                        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border border-indigo-200 text-xs font-bold transition-all shadow-xs active:scale-95"
                        title="Buku Panduan & SOP Operasional Kafe"
                    >
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Panduan & SOP</span>
                    </button>
                )}

                {/* Notification Bell Center */}
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative hover:bg-slate-100 transition-colors"
                            title="Notifikasi & Peringatan Stok"
                        >
                            <Bell className={`w-5 h-5 ${stockAlertsEnabled && alertCount > 0 ? "text-amber-600" : "text-gray-500"}`} />
                            {stockAlertsEnabled && alertCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                                    {alertCount > 99 ? "99+" : alertCount}
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-xl rounded-2xl border border-gray-100 overflow-hidden z-50">
                        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bell className="w-4 h-4 text-amber-400" />
                                <span className="font-semibold text-sm">Notifikasi & Peringatan</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {stockAlertsEnabled && alertCount > 0 && (
                                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {alertCount} Menipis
                                    </span>
                                )}
                                <button
                                    onClick={() => loadAlerts()}
                                    disabled={loadingAlerts}
                                    className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                                    title="Segarkan"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAlerts ? "animate-spin" : ""}`} />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                            {!stockAlertsEnabled ? (
                                <div className="p-6 text-center text-gray-500 space-y-2">
                                    <AlertCircle className="w-8 h-8 text-gray-400 mx-auto" />
                                    <p className="text-sm font-medium text-gray-700">Peringatan Dinonaktifkan</p>
                                    <p className="text-xs text-gray-500">
                                        Peringatan stok habis saat ini dimatikan. Anda dapat mengaktifkannya di menu Pengaturan &gt; Notifikasi &amp; Alert.
                                    </p>
                                </div>
                            ) : loadingAlerts && alerts.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2">
                                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                                    <p className="text-xs">Memeriksa stok bahan baku...</p>
                                </div>
                            ) : alertCount === 0 ? (
                                <div className="p-6 text-center text-gray-500 space-y-2">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                                    <p className="text-sm font-semibold text-gray-800">Semua Stok Aman</p>
                                    <p className="text-xs text-gray-500">
                                        Tidak ada bahan baku yang berada di bawah batas minimum saat ini.
                                    </p>
                                </div>
                            ) : (
                                <div className="p-2 space-y-1.5">
                                    {alerts.map((item) => {
                                        const isOutOfStock = (item.current_stock ?? 0) <= 0
                                        return (
                                            <div
                                                key={item.id}
                                                onClick={() => {
                                                    setPopoverOpen(false)
                                                    onNavigate?.("products")
                                                }}
                                                className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-200 group"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2">
                                                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${isOutOfStock ? "bg-rose-500 ring-2 ring-rose-200" : "bg-amber-500"}`} />
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-900 group-hover:text-primary transition-colors">
                                                                {item.name}
                                                            </p>
                                                            <p className="text-[11px] text-gray-500">
                                                                Sisa: <strong className={isOutOfStock ? "text-rose-600" : "text-amber-700"}>
                                                                    {item.current_stock ?? 0} {item.unit}
                                                                </strong> (Min: {item.min_stock} {item.unit})
                                                            </p>
                                                            {(item.kedai_stock !== undefined || item.warehouse_stock !== undefined) && (
                                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                                    Kedai: {item.kedai_stock ?? 0} {item.unit} | Gudang: {item.warehouse_stock ?? 0} {item.unit}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${isOutOfStock ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>
                                                        {isOutOfStock ? "Habis" : "Menipis"}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {stockAlertsEnabled && alertCount > 0 && (
                            <div className="p-2.5 bg-gray-50 border-t border-gray-100 grid grid-cols-2 gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs font-semibold gap-1.5 h-8 justify-center"
                                    onClick={() => {
                                        setPopoverOpen(false)
                                        onNavigate?.("kebutuhan-stok")
                                    }}
                                >
                                    <ShoppingCart className="w-3.5 h-3.5" />
                                    <span>Rencana Belanja</span>
                                </Button>
                                <Button
                                    size="sm"
                                    className="text-xs font-semibold gap-1.5 h-8 justify-center"
                                    onClick={() => {
                                        setPopoverOpen(false)
                                        onNavigate?.("products")
                                    }}
                                >
                                    <Package className="w-3.5 h-3.5" />
                                    <span>Buka Gudang</span>
                                </Button>
                            </div>
                        )}
                    </PopoverContent>
                </Popover>

                <div className="h-8 w-px bg-gray-200"></div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-gray-900">{user?.name || "User"}</p>
                        <p className="text-xs text-capitalize text-gray-500">{user?.role || "Role"}</p>
                    </div>

                    <Popover>
                        <PopoverTrigger asChild>
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 cursor-pointer">
                                <User className="w-5 h-5 text-primary" />
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 mr-4">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => dispatch(logout())}
                            >
                                <LogOut className="w-4 h-4 mr-2" /> Keluar
                            </Button>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </header>
    )
}
