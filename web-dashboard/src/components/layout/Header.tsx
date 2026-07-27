import { Bell, User, LogOut, Menu } from "lucide-react"
import { Button } from "../ui/button"
import { useDispatch, useSelector } from "react-redux"
import { logout } from "../../store/authSlice"
import { RootState } from "../../store"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { useEffect, useState } from "react"
import { fetchSettings } from "../../services/settingsService"

interface HeaderProps {
    onMenuClick?: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
    const dispatch = useDispatch()
    const { user } = useSelector((state: RootState) => state.auth)
    const [outletName, setOutletName] = useState("Singgah Coffee")

    useEffect(() => {
        const loadName = async () => {
            try {
                const settings = await fetchSettings()
                if (settings.outlet_name) setOutletName(settings.outlet_name)
            } catch (error) {
                console.error("Failed to load outlet name:", error)
            }
        }
        loadName()
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

            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5 text-gray-500" />
                    {/* Notification Alert Dot */}
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </Button>

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
