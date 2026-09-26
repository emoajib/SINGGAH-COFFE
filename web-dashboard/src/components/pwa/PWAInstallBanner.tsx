// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useState, useEffect } from "react"
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle2 } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

export default function PWAInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isStandalone, setIsStandalone] = useState(false)
    const [isIOS, setIsIOS] = useState(false)
    const [showIOSModal, setShowIOSModal] = useState(false)
    const [showAndroidModal, setShowAndroidModal] = useState(false)
    const [isDismissed, setIsDismissed] = useState(false)

    useEffect(() => {
        // 1. Cek apakah sudah running standalone (sudah diinstall)
        const checkStandalone = () => {
            const isStandaloneMedia = window.matchMedia("(display-mode: standalone)").matches
            const isNavigatorStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true
            return isStandaloneMedia || isNavigatorStandalone
        }

        if (checkStandalone()) {
            setIsStandalone(true)
            return
        }

        // 2. Cek apakah banner sedang dalam masa dismiss (3 hari)
        const dismissedUntil = localStorage.getItem("pwa_install_dismissed_until")
        if (dismissedUntil && new Date().getTime() < parseInt(dismissedUntil, 10)) {
            setIsDismissed(true)
        }

        // 3. Deteksi iOS / iPadOS
        const ua = window.navigator.userAgent.toLowerCase()
        const isAppleDevice = /iphone|ipad|ipod/.test(ua) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
        setIsIOS(isAppleDevice)

        // 4. Tangkap event beforeinstallprompt untuk Android / Chromium
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setIsDismissed(false)
        }

        const handleOpenManual = () => {
            setIsDismissed(false)
            if (isAppleDevice) {
                setShowIOSModal(true)
            } else if (deferredPrompt) {
                deferredPrompt.prompt().then(() => {
                    deferredPrompt.userChoice.then((res) => {
                        if (res.outcome === "accepted") setDeferredPrompt(null)
                    })
                })
            } else {
                setShowAndroidModal(true)
            }
        }

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
        window.addEventListener("open-pwa-install", handleOpenManual)

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
            window.removeEventListener("open-pwa-install", handleOpenManual)
        }
    }, [deferredPrompt])

    const handleDismiss = () => {
        const expireTime = new Date().getTime() + 3 * 24 * 60 * 60 * 1000
        localStorage.setItem("pwa_install_dismissed_until", expireTime.toString())
        setIsDismissed(true)
        setShowIOSModal(false)
        setShowAndroidModal(false)
    }

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSModal(true)
            return
        }

        if (deferredPrompt) {
            await deferredPrompt.prompt()
            const choiceResult = await deferredPrompt.userChoice
            if (choiceResult.outcome === "accepted") {
                setIsDismissed(true)
            }
            setDeferredPrompt(null)
        } else {
            setShowAndroidModal(true)
        }
    }

    // Jika sudah diinstall atau sedang disembunyikan, tidak render apa-apa
    if (isStandalone || isDismissed) {
        return null
    }

    return (
        <>
            {/* Banner Floating di bawah */}
            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-[#4B3621] text-white rounded-2xl p-4 shadow-2xl border border-amber-900/40 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom duration-300">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                            <Smartphone className="w-5 h-5 text-amber-300" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-amber-50">Pasang Singgah POS</h4>
                            <p className="text-xs text-amber-200/80">Akses lebih cepat & layar penuh di iPad/Tablet</p>
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
                        onClick={handleInstallClick}
                        className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                        {isIOS ? "Panduan iPad / iOS" : "Pasang Sekarang"}
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="text-xs text-amber-200/80 hover:text-white py-2 px-3 rounded-xl hover:bg-white/5 transition-colors font-medium"
                    >
                        Nanti
                    </button>
                </div>
            </div>

            {/* Modal Panduan Khusus iOS / iPadOS */}
            {showIOSModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-800 shadow-2xl relative border border-slate-100">
                        <button
                            onClick={() => setShowIOSModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-5">
                            <div className="w-14 h-14 rounded-2xl bg-amber-50 mx-auto flex items-center justify-center mb-3 border border-amber-100">
                                <Share2 className="w-7 h-7 text-amber-700" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Pasang di iPad / iPhone</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Ikuti 3 langkah mudah di peramban Safari:
                            </p>
                        </div>

                        <div className="space-y-3.5 mb-6 text-xs text-slate-700">
                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 text-xs">
                                    1
                                </div>
                                <div>
                                    <span className="font-semibold text-slate-900">Tekan tombol Bagikan (Share)</span>
                                    <p className="text-slate-500 mt-0.5">Ikon kotak dengan panah ke atas di bagian atas atau bawah Safari.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 text-xs">
                                    2
                                </div>
                                <div>
                                    <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                                        Pilih "Tambah ke Layar Utama"
                                        <PlusSquare className="w-3.5 h-3.5 text-amber-700" />
                                    </span>
                                    <p className="text-slate-500 mt-0.5">Gulir menu ke bawah sampai menemukan opsi Add to Home Screen.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 text-xs">
                                    3
                                </div>
                                <div>
                                    <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                                        Tekan "Tambah" (Add)
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    </span>
                                    <p className="text-slate-500 mt-0.5">Aplikasi Singgah POS siap dibuka langsung dari layar utama.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setShowIOSModal(false)
                                handleDismiss()
                            }}
                            className="w-full bg-[#4B3621] hover:bg-[#3D2C1B] text-white font-semibold py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95"
                        >
                            Saya Mengerti
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Panduan Khusus Android / Chrome */}
            {showAndroidModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-800 shadow-2xl relative border border-slate-100">
                        <button
                            onClick={() => setShowAndroidModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-5">
                            <div className="w-14 h-14 rounded-2xl bg-amber-50 mx-auto flex items-center justify-center mb-3 border border-amber-100">
                                <Download className="w-7 h-7 text-amber-700" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Pasang di Android / Tablet</h3>
                            <p className="text-xs text-slate-500 mt-1">
                                Ikuti 3 langkah mudah di browser Chrome:
                            </p>
                        </div>

                        <div className="space-y-3.5 mb-6 text-xs text-slate-700">
                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 text-xs">
                                    1
                                </div>
                                <div>
                                    <span className="font-semibold text-slate-900">Buka Menu Peramban (⋮)</span>
                                    <p className="text-slate-500 mt-0.5">Tekan ikon titik tiga di pojok kanan atas browser.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 text-xs">
                                    2
                                </div>
                                <div>
                                    <span className="font-semibold text-slate-900">Pilih "Pasang Aplikasi" / "Tambahkan"</span>
                                    <p className="text-slate-500 mt-0.5">Pilih "Install App" atau "Tambahkan ke Layar Utama".</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0 text-xs">
                                    3
                                </div>
                                <div>
                                    <span className="font-semibold text-slate-900">Tekan "Pasang" (Install)</span>
                                    <p className="text-slate-500 mt-0.5">Aplikasi Singgah POS siap dibuka langsung dari layar utama.</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                setShowAndroidModal(false)
                                handleDismiss()
                            }}
                            className="w-full bg-[#4B3621] hover:bg-[#3D2C1B] text-white font-semibold py-2.5 rounded-xl text-xs transition-all shadow-md active:scale-95"
                        >
                            Saya Mengerti
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
