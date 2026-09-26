// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import type { RootState } from "../../store"
import {
    Download,
    Share2,
    PlusSquare,
    X,
    Smartphone,
    CheckCircle2,
    Compass,
    Apple
} from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export default function PWAInstallBanner() {
    // 0. Ambil status otentikasi dari Redux. Notifikasi HANYA untuk user internal (owner, manager, cashier, barista).
    const { isAuthenticated, user } = useSelector((state: RootState) => state.auth)

    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isStandalone, setIsStandalone] = useState(false)
    const [isSafari, setIsSafari] = useState(true)
    const [showPlatformModal, setShowPlatformModal] = useState(false)
    const [activePlatformTab, setActivePlatformTab] = useState<"ios" | "android">("ios")
    const [isDismissed, setIsDismissed] = useState(false)

    useEffect(() => {
        // Cek apakah sudah running standalone (sudah diinstall)
        const checkStandalone = () => {
            const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches
            const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true
            return isStandaloneMedia || isNavigatorStandalone
        }

        if (checkStandalone()) {
            setIsStandalone(true)
            return
        }

        // Cek apakah banner sedang dalam masa dismiss (3 hari)
        const dismissedUntil = localStorage.getItem("pwa_install_dismissed_until")
        if (dismissedUntil && new Date().getTime() < parseInt(dismissedUntil, 10)) {
            setIsDismissed(true)
        }

        // Deteksi iOS / iPadOS
        // iPad 6 di iPadOS 13-17 melaporkan MacIntel dengan touch points > 1
        const ua = window.navigator.userAgent.toLowerCase()
        const isAppleDevice = /iphone|ipad|ipod/.test(ua) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
        setActivePlatformTab(isAppleDevice ? "ios" : "android")

        // Cek apakah browser adalah Safari bawaan di iOS
        const isChromeIOS = /crios/.test(ua)
        const isFirefoxIOS = /fxios/.test(ua)
        setIsSafari(!isChromeIOS && !isFirefoxIOS)

        // Tangkap event beforeinstallprompt untuk Android / Chromium
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setIsDismissed(false)
        }

        // Handler manual trigger dari tombol Sidebar / Header
        const handleOpenManual = () => {
            setIsDismissed(false)
            setShowPlatformModal(true)
        }

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
        window.addEventListener("open-pwa-install", handleOpenManual)

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
            window.removeEventListener("open-pwa-install", handleOpenManual)
        }
    }, [deferredPrompt])

    // PROTEKSI ROLE & HALAMAN PUBLIK:
    // Jangan tampilkan notifikasi install di web publik pelanggan (/loyalty/*) atau saat belum login
    const currentPath = typeof window !== "undefined" ? window.location.pathname : ""
    if (!isAuthenticated || !user || currentPath.startsWith("/loyalty")) {
        return null
    }

    const handleDismiss = () => {
        const expireTime = new Date().getTime() + 3 * 24 * 60 * 60 * 1000
        localStorage.setItem("pwa_install_dismissed_until", expireTime.toString())
        setIsDismissed(true)
        setShowPlatformModal(false)
    }

    const handleOpenModal = () => {
        setShowPlatformModal(true)
    }

    const handleAndroidAutoInstall = async () => {
        if (deferredPrompt) {
            await deferredPrompt.prompt()
            const choiceResult = await deferredPrompt.userChoice
            if (choiceResult.outcome === "accepted") {
                setIsDismissed(true)
                setShowPlatformModal(false)
            }
            setDeferredPrompt(null)
        }
    }

    return (
        <>
            {/* Banner Floating di bawah (Hanya untuk user yang login & belum standalone) */}
            {!isStandalone && !isDismissed && !showPlatformModal && (
                <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-[#4B3621] text-white rounded-2xl p-4 shadow-2xl border border-amber-900/40 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom duration-300">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                                <Smartphone className="w-5 h-5 text-amber-300" />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-amber-50">Pasang Singgah POS</h4>
                                <p className="text-xs text-amber-200/80">Tersedia untuk iPad, iOS & Android</p>
                            </div>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="text-amber-200/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                            aria-label="Tutup"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <button
                            onClick={handleOpenModal}
                            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                        >
                            <Download className="w-4 h-4" />
                            Pilihan Pasang (iOS & Android)
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="text-xs text-amber-200/80 hover:text-white py-2 px-3 rounded-xl hover:bg-white/5 transition-colors font-medium"
                        >
                            Nanti
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Pilihan Pasang Aplikasi: Tab iOS (iPad) & Tab Android */}
            {showPlatformModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 text-slate-800 shadow-2xl relative border border-slate-100">
                        <button
                            onClick={() => setShowPlatformModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-5">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 mx-auto flex items-center justify-center mb-2.5 border border-amber-100">
                                <Smartphone className="w-6 h-6 text-amber-700" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">Pasang Aplikasi Singgah POS</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Akses kasir & barista lebih cepat, stabil, dan layar penuh.
                            </p>
                        </div>

                        {/* Tab Switcher: Apple iPad / iOS vs Android */}
                        <div className="flex p-1 bg-slate-100 rounded-2xl mb-5">
                            <button
                                type="button"
                                onClick={() => setActivePlatformTab("ios")}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                    activePlatformTab === "ios"
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <Apple className="w-4 h-4 text-slate-800" />
                                <span>Apple iPad / iOS</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActivePlatformTab("android")}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                    activePlatformTab === "android"
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                <Smartphone className="w-4 h-4 text-emerald-600" />
                                <span>Android / Chrome</span>
                            </button>
                        </div>

                        {/* KONTEN TAB 1: APPLE IPAD / IOS (SAFARI) */}
                        {activePlatformTab === "ios" && (
                            <div className="space-y-3.5 mb-6 text-xs text-slate-700">
                                {!isSafari && (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
                                        <Compass className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold block">Gunakan Safari Bawaan iPad:</span>
                                            <span>
                                                Apple hanya mendukung pemasangan aplikasi PWA lewat browser <strong>Safari</strong>. Silakan salin link kafe dan buka melalui Safari.
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0 text-xs">
                                        1
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                            Tekan Tombol Bagikan (Share) <Share2 className="w-3.5 h-3.5 text-amber-700 inline" />
                                        </span>
                                        <p className="text-slate-600 mt-1 leading-relaxed">
                                            Di <strong>iPad</strong>: Tombol berada di <strong>Pojok Kanan Atas Layar</strong> (ikon kotak dengan panah ke atas di samping kolom alamat URL).
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0 text-xs">
                                        2
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                            Pilih "Tambah ke Layar Utama"
                                            <PlusSquare className="w-3.5 h-3.5 text-amber-700" />
                                        </span>
                                        <p className="text-slate-600 mt-1 leading-relaxed">
                                            Gulir lembar menu ke bawah hingga menemukan opsi <strong>Tambah ke Layar Utama</strong> (<em>Add to Home Screen</em>).
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0 text-xs">
                                        3
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                            Tekan "Tambah" (Add)
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        </span>
                                        <p className="text-slate-600 mt-1 leading-relaxed">
                                            Tekan tombol <strong>Tambah</strong> di pojok kanan atas jendela pop-up. Ikon Singgah POS akan muncul di Layar Utama iPad.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* KONTEN TAB 2: ANDROID / CHROME */}
                        {activePlatformTab === "android" && (
                            <div className="space-y-3.5 mb-6 text-xs text-slate-700">
                                {deferredPrompt && (
                                    <button
                                        onClick={handleAndroidAutoInstall}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 mb-3"
                                    >
                                        <Download className="w-4 h-4" />
                                        Pasang Otomatis Sekarang di Android
                                    </button>
                                )}

                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0 text-xs">
                                        1
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-900">Buka Menu Peramban Chrome (⋮)</span>
                                        <p className="text-slate-600 mt-1 leading-relaxed">
                                            Tekan ikon titik tiga di pojok kanan atas browser Google Chrome.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0 text-xs">
                                        2
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-900">Pilih "Pasang Aplikasi" / "Tambahkan"</span>
                                        <p className="text-slate-600 mt-1 leading-relaxed">
                                            Pilih menu <strong>Pasang Aplikasi</strong> (<em>Install App</em>) atau Tambahkan ke Layar Utama.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-black shrink-0 text-xs">
                                        3
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-900">Tekan "Pasang" (Install)</span>
                                        <p className="text-slate-600 mt-1 leading-relaxed">
                                            Konfirmasi pemasangan. Singgah POS akan terpasang di laci aplikasi & layar utama Android.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => {
                                setShowPlatformModal(false)
                                handleDismiss()
                            }}
                            className="w-full bg-[#4B3621] hover:bg-[#3D2C1B] text-white font-bold py-3 rounded-2xl text-xs transition-all shadow-md active:scale-95"
                        >
                            Saya Mengerti
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
