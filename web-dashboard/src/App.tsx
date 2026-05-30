import { useState } from "react"
import { useSelector } from "react-redux"
import { RootState } from "./store"
import Sidebar from "./components/layout/Sidebar"
import Header from "./components/layout/Header"
import DashboardHome from "./pages/DashboardHome"
import Sales from "./pages/Sales"
import Reports from "./pages/Reports"
import Integration from "./pages/Integration"
import Settings from "./pages/Settings"
import PosTerminal from "./pages/PosTerminal"
import ProductManagement from "./pages/ProductManagement"
import Expenses from "./pages/Expenses"
import Login from "./pages/Login"
import { ToastProvider } from "./hooks/use-toast"
import { Toaster } from "./components/ui/toaster"
import { ErrorBoundary } from "./components/ui/error-boundary"

function AppContent() {
    const [activeTab, setActiveTab] = useState("dashboard")
    const auth = useSelector((state: RootState) => state.auth)
    const isAuthenticated = auth?.isAuthenticated || false

    if (!isAuthenticated) {
        return <Login />
    }

    // POS view (Full screen, no sidebar)
    if (activeTab === "pos") {
        return (
            <div className="bg-gray-50 min-h-screen p-4">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-xl font-bold">Terminal Kasir Singgah</h1>
                    <button
                        onClick={() => setActiveTab("dashboard")}
                        className="text-sm px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 font-medium text-gray-700 transition-colors"
                    >
                        Keluar Mode Kasir
                    </button>
                </div>
                <PosTerminal />
            </div>
        )
    }

    return (
        <div className="flex bg-gray-50 min-h-screen">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <Header />
                <main className="p-6 flex-1 overflow-y-auto">
                    {activeTab === "dashboard" && <DashboardHome setActiveTab={setActiveTab} />}
                    {activeTab === "products" && <ProductManagement />}
                    {activeTab === "expenses" && <Expenses />}
                    {activeTab === "sales" && <Sales />}
                    {activeTab === "reports" && <Reports />}
                    {activeTab === "integration" && <Integration />}
                    {activeTab === "settings" && <Settings />}
                </main>
            </div>
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
