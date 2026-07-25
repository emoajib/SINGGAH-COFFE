import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Smartphone, Download, Upload, Loader2, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react"
import api from "../../lib/api"

export function MobileAppSettings() {
    const [uploading, setUploading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const handleApkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (!file.name.endsWith('.apk')) {
            setMessage({ type: 'error', text: 'Only .apk files are allowed' })
            return
        }
        setUploading(true)
        setMessage(null)
        try {
            const formData = new FormData()
            formData.append('apk', file)
            await api.post('/settings/upload-apk', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setMessage({ type: 'success', text: `APK uploaded successfully (${(file.size / 1024 / 1024).toFixed(1)} MB)` })
        } catch (err: any) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Upload failed' })
        } finally {
            setUploading(false)
        }
    }

    const downloadApk = () => {
        const token = localStorage.getItem('token')
        const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'
        const link = document.createElement('a')
        link.href = `${baseURL}/mobile/download`
        if (token) link.href += `?token=${token}`
        link.download = 'singgah-pos-android.apk'
        link.click()
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <CardTitle>Aplikasi Mobile POS</CardTitle>
                            <CardDescription>Kelola aplikasi Android untuk kasir mobile.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-green-800 text-sm">Download Aplikasi Android</h4>
                                <p className="text-xs text-green-700 mt-1">
                                    Aplikasi POS Mobile untuk kasir. Scan barcode atau klik tombol di bawah untuk mengunduh.
                                </p>
                                <Button size="sm" className="mt-3 gap-2" onClick={downloadApk}>
                                    <Download className="w-4 h-4" />
                                    Download APK
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-start gap-3">
                            <ExternalLink className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-blue-800 text-sm">Build via GitHub Actions</h4>
                                <p className="text-xs text-blue-700 mt-1">
                                    APK dapat dibuild otomatis melalui GitHub Actions. 
                                    Buka tab <strong>Actions</strong> di repository, pilih workflow 
                                    "Build Mobile APK", lalu klik <strong>Run workflow</strong>.
                                    Setelah selesai, upload APK hasil build di bawah ini.
                                </p>
                                <a
                                    href="https://github.com/emoajib/SINGGAH-COFFE/actions"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Button size="sm" variant="outline" className="mt-3 gap-2">
                                        <ExternalLink className="w-4 h-4" />
                                        Buka GitHub Actions
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-6">
                        <h4 className="font-bold text-sm mb-3">Upload APK</h4>
                        <p className="text-xs text-gray-500 mb-3">
                            Upload hasil build APK untuk didistribusikan ke perangkat kasir (maks 200MB).
                        </p>
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept=".apk"
                                className="hidden"
                                onChange={handleApkUpload}
                                disabled={uploading}
                            />
                            <div className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary/50 transition-colors">
                                {uploading ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                ) : (
                                    <Upload className="w-6 h-6 text-gray-400" />
                                )}
                                <div className="text-left">
                                    <p className="text-sm font-medium text-gray-700">
                                        {uploading ? "Uploading..." : "Klik untuk pilih file APK"}
                                    </p>
                                    <p className="text-xs text-gray-400">singgah-pos-android.apk</p>
                                </div>
                            </div>
                        </label>
                        {message && (
                            <div className={`flex items-center gap-2 mt-3 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {message.type === 'success' ? (
                                    <CheckCircle2 className="w-4 h-4" />
                                ) : (
                                    <AlertCircle className="w-4 h-4" />
                                )}
                                {message.text}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Cara Install</CardTitle>
                    <CardDescription>Panduan instalasi di perangkat Android.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ol className="space-y-3 text-sm list-decimal list-inside text-gray-600">
                        <li>Download file APK dari bagian atas halaman ini.</li>
                        <li>Buka Settings &rarr; Security di perangkat Android, aktifkan <strong>Install from Unknown Sources</strong>.</li>
                        <li>Buka file manager, cari file APK yang sudah di-download, lalu tap untuk menginstall.</li>
                        <li>Buka aplikasi, masukkan alamat server dan login dengan akun yang sudah ada.</li>
                    </ol>
                </CardContent>
                <CardFooter className="border-t p-4">
                    <Badge variant="outline" className="text-xs">Android 8.0+</Badge>
                </CardFooter>
            </Card>
        </div>
    )
}
