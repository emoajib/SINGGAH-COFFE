import {
    LayoutDashboard,
    CreditCard,
    BarChart3,
    Settings,
    Puzzle,
    Monitor,
    Coffee,
    Wallet,
    Smartphone
} from "lucide-react"
import { Button } from "../ui/button"
import { useSelector } from "react-redux"
import { RootState } from "../../store"
import { useEffect, useState } from "react"
import { fetchSettings } from "../../services/settingsService"
import { getImageUrl } from "../../lib/utils"

interface SidebarProps {
    activeTab: string
    setActiveTab: (tab: string) => void
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
    const { user } = useSelector((state: RootState) => state.auth)
    const role = user?.role || 'cashier'
    const [logoUrl, setLogoUrl] = useState("")
    const [outletName, setOutletName] = useState("Singgah Coffee")

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

    const menuItems = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "manager", "cashier"] },
        { id: "pos", label: "Terminal Kasir", icon: Monitor, roles: ["owner", "manager", "cashier"] },
        { id: "products", label: "Bahan & Resep", icon: Coffee, roles: ["owner", "manager"] },
        { id: "expenses", label: "Pengeluaran", icon: Wallet, roles: ["owner", "manager"] },
        { id: "sales", label: "Penjualan", icon: CreditCard, roles: ["owner", "manager"] },
        { id: "reports", label: "Laporan", icon: BarChart3, roles: ["owner"] },
        { id: "integration", label: "Integrasi", icon: Puzzle, roles: ["owner"] },
        { id: "settings", label: "Pengaturan", icon: Settings, roles: ["owner", "manager", "cashier"] },
    ]

    const filteredMenu = menuItems.filter(item => item.roles.includes(role))

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
    }

    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                {logoUrl ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                        <img
                            src={getImageUrl(logoUrl)}
                            alt="Logo"
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {outletName.charAt(0)}
                    </div>
                )}
                <div className="overflow-hidden">
                    <h1 className="font-bold text-sm text-gray-900 truncate">{outletName}</h1>
                    <p className="text-[10px] text-gray-500">Moka POS System</p>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {filteredMenu.map((item) => {
                    const Icon = item.icon
                    const isActive = activeTab === item.id

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400"}`} />
                            {item.label}
                        </button>
                    )
                })}
            </nav>

<div className="p-4 border-t border-gray-100">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-sm mb-1">Butuh Bantuan?</h4>
                    <p className="text-xs text-gray-500 mb-3">Buka dokumentasi sistem.</p>
                    <Button variant="outline" size="sm" className="w-full text-xs h-8">Pusat Bantuan</Button>
                </div>
                
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <button
                        onClick={() => window.open('/api/mobile/download', '_blank')}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border border-gray-300 hover:bg-gray-50"
                    >
                        <Smartphone className="w-5 h-5 text-gray-400" />
                        Download Android App
                    </button>
                </div>
                
                <div className="flex items-center gap-3 px-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border border-primary/20">
                        {user ? getInitials(user.name) : "U"}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 truncate">{user?.name || "User"}</p>
                        <p className="text-xs text-gray-500 capitalize">{user?.role || "staff"}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
