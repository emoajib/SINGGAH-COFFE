import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { CreditCard, Loader2, Save, Smartphone } from "lucide-react"

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager

interface IntegrationSettingsProps {
    settings: Record<string, string>;
    saving: boolean;
    handleInputChange: (key: string, value: string) => void;
    handleSaveSettings: () => void;
}

export function IntegrationSettings({
    settings,
    saving,
    handleInputChange,
    handleSaveSettings
}: IntegrationSettingsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>API Integrasi</CardTitle>
                <CardDescription>Konfigurasi kunci akses untuk layanan pihak ketiga.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 bg-gray-50 border rounded-lg space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <CreditCard className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-sm">Xendit Payment Gateway</h3>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-400">Secret API Key</label>
                        <Input
                            type="password"
                            placeholder="xnd_production_..."
                            value={settings.xendit_api_key || ""}
                            onChange={(e) => handleInputChange("xendit_api_key", e.target.value)}
                        />
                        <p className="text-[10px] text-gray-500">Wajib diisi untuk mengaktifkan pembayaran QRIS otomatis.</p>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-gray-400">Callback Verification Token</label>
                        <Input
                            type="password"
                            placeholder="Gunakan token unik untuk keamanan"
                            value={settings.xendit_callback_token || ""}
                            onChange={(e) => handleInputChange("xendit_callback_token", e.target.value)}
                        />
                        <p className="text-[10px] text-gray-500 italic">Samakan dengan 'Callback Token' di Dashboard Xendit Anda.</p>
                    </div>
                </div>

                <div className="p-4 border border-dashed rounded-lg opacity-50 grayscale">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                <Smartphone className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-sm text-gray-400">GoFood / GrabFood Bridge</h3>
                        </div>
                        <Badge variant="outline">Enterprise</Badge>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="justify-end border-t border-gray-100 p-4">
                <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Kunci API
                </Button>
            </CardFooter>
        </Card>
    )
}
