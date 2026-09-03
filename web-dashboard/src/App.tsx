import { useState } from "react"
import { useSelector, useDispatch } from "react-redux"
import { RootState } from "./store"
import { setCashFloatPending } from "./store/authSlice"
import Sidebar from "./components/layout/Sidebar"
import Header from "./components/layout/Header"
import DashboardHome from "./pages/DashboardHome"
import Sales from "./pages/Sales"
import Reports from "./pages/Reports"
import BepAnalysis from "./pages/BepAnalysis"
import Integration from "./pages/Integration"
import Settings from "./pages/Settings"
import PosTerminal from "./pages/PosTerminal"
import ProductManagement from "./pages/ProductManagement"
import Expenses from "./pages/Expenses"
import BackupManagement from "./pages/BackupManagement"
import KebutuhanStok from "./pages/KebutuhanStok"
import CashRegister from "./pages/CashRegister"
import CashBookPage from "./pages/CashBook"
import ProfitSharing from "./pages/ProfitSharing"
import Login from "./pages/Login"
import CashFloatModal from "./components/cash/CashFloatModal"
import { ToastProvider } from "./hooks/use-toast"
import { Toaster } from "./components/ui/toaster"
import { ErrorBoundary } from "./components/ui/error-boundary"

function AppContent() {
    const [activeTab, setActiveTab] = useState("dashboard")
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const dispatch = useDispatch()
    const auth = useSelector((state: RootState) => state.auth)
    const isAuthenticated = auth?.isAuthenticated || false
    const userRole = (auth?.user?.role || "").toLowerCase().trim()
    const isCashier = userRole === "cashier"
    const isManager = userRole === "manager"
    const isOwner = userRole === "owner"
    const cashFloatPending = auth?.cashFloatPending !== false && !(auth?.openCashRegister)

    // Tab eksklusif owner saja
    const ownerOnlyTabs = ["reports", "bep", "kebutuhan-stok", "integration", "backup", "profit-sharing"]
    // Tab yang boleh diakses manager & owner (bukan cashier)
    const managerOnlyTabs: string[] = []

    if (!isAuthenticated) {
        return <Login />
    }

    const needsCashFloatForPos = (isCashier || isManager) && cashFloatPending
    const needsGlobalCashFloat = isCashier && cashFloatPending

    if (activeTab === "pos") {
        return (
            <div className="bg-slate-100 h-screen overflow-hidden flex flex-col p-2 md:p-3">
                <div className="flex justify-between items-center px-2 py-1 mb-2 shrink-0">
                    <h1 className="text-lg font-black text-slate-800">Kasir</h1>
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        className="text-xs px-3 py-1.5 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 font-bold text-slate-700 transition-colors"
                    >
                        Keluar Mode Kasir
                    </button>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                    {needsCashFloatForPos ? <CashFloatModal open={true} onSuccess={() => setActiveTab("pos")} onClose={() => dispatch(setCashFloatPending(false))} /> : <PosTerminal />}
                </div>
            </div>
        )
    }

    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="p-4 md:p-6 flex-1 overflow-y-auto">
                    {ownerOnlyTabs.includes(activeTab) && !isOwner ? (
                        <div className="p-8 text-center text-gray-500">Akses ditolak: halaman ini hanya untuk pemilik.</div>
                    ) : managerOnlyTabs.includes(activeTab) && !isOwner && !isManager ? (
                        <div className="p-8 text-center text-gray-500">Akses ditolak: halaman ini hanya untuk manajer dan pemilik.</div>
                    ) : (
                        <>
                            {activeTab === "dashboard" && <DashboardHome setActiveTab={setActiveTab} />}
                            {activeTab === "products" && <ProductManagement />}
                            {activeTab === "expenses" && <Expenses />}
                            {activeTab === "sales" && <Sales />}
                            {activeTab === "reports" && <Reports />}
                            {activeTab === "cash-registers" && <CashRegister />}
                            {activeTab === "cash-book" && <CashBookPage />}
                            {activeTab === "bep" && <BepAnalysis />}
                            {activeTab === "kebutuhan-stok" && <KebutuhanStok />}
                            {activeTab === "integration" && <Integration />}
                            {activeTab === "settings" && <Settings />}
                            {activeTab === "backup" && <BackupManagement />}
                            {activeTab === "profit-sharing" && <ProfitSharing />}
                        </>
                    )}
                </main>
            </div>
            {needsGlobalCashFloat && <CashFloatModal open={true} onSuccess={() => {}} onClose={() => dispatch(setCashFloatPending(false))} />}
        </div>
    )
}

function App() {
    return (
        <ToastProvider>
            <ErrorBoundary>
                <AppContent />
                <Toaster />
            </ErrorBoundary>
        </ToastProvider>
    )
}

export default App
