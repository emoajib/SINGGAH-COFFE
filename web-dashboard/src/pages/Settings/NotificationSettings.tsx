import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { AlertCircle, Loader2, Save } from "lucide-react"

// ⚠️ Vetted by AI - Manual Review Required by Senior Engineer/Manager

interface NotificationSettingsProps {
    settings: Record<string, string>;
    saving: boolean;
    handleInputChange: (key: string, value: string) => void;
    handleSaveSettings: () => void;
}

export function NotificationSettings({
    settings,
    saving,
    handleInputChange,
    handleSaveSettings
}: NotificationSettingsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Notifikasi & Alert</CardTitle>
                <CardDescription>Konfigurasi peringatan stok dan laporan sistem.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4">
                    <div className="p-4 border rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors">
                        <div className="space-y-0.5">
                            <p className="font-medium">Peringatan Stok Habis</p>
                            <p className="text-sm text-gray-500">Munculkan notifikasi di dashboard jika bahan baku di bawah stok minim.</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={settings.enable_stock_alerts === "true"}
                                onChange={(e) => handleInputChange("enable_stock_alerts", e.target.checked ? "true" : "false")}
                            />
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg space-y-4 bg-gray-50 opacity-70 cursor-not-allowed">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium">Ringkasan Penjualan Harian (Email)</p>
                                    <Badge variant="outline" className="text-[8px] uppercase">Coming Soon</Badge>
                                </div>
                                <p className="text-sm text-gray-500">Terima rekap harian melalui email otomatis.</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    disabled
                                    className="w-5 h-5 rounded border-gray-300 text-primary opacity-50"
                                    checked={false}
                                />
                            </div>
                        </div>
                        <div className="p-3 bg-white border border-gray-200 rounded-xl flex gap-2 text-[10px] text-gray-500 font-bold italic">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>Fitur ini memerlukan konfigurasi SMTP Server pada backend. Hubungi IT Support.</span>
                        </div>
                    </div>

                    <div className="p-4 border rounded-lg flex items-center justify-between opacity-50 grayscale">
                        <div className="space-y-0.5">
                            <p className="font-medium text-gray-400">Notifikasi WhatsApp Langsung</p>
                            <p className="text-sm text-gray-400">Kirim struk digital ke WhatsApp pelanggan.</p>
                        </div>
                        <Badge variant="secondary">Enterprise Only</Badge>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="justify-end border-t border-gray-100 p-4">
                <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Pengaturan Notifikasi
                </Button>
            </CardFooter>
        </Card>
    )
}
