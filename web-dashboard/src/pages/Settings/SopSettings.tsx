import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Info, Loader2, Save, Shield, Users } from "lucide-react"

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager

interface SopSettingsProps {
    settings: Record<string, string>;
    saving: boolean;
    handleInputChange: (key: string, value: string) => void;
    handleSaveSettings: () => void;
}

export function SopSettings({
    settings,
    saving,
    handleInputChange,
    handleSaveSettings
}: SopSettingsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Policy & Standard Operating Procedures</CardTitle>
                <CardDescription>Definisikan panduan operasional untuk anggota tim Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-800 text-xs italic">
                    <Info className="w-5 h-5 shrink-0" />
                    <p>SOP yang Anda tulis di sini akan muncul di Dashboard utama aplikasi Mobile POS sebagai referensi cepat bagi staf.</p>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" /> Manager SOP
                    </label>
                    <textarea
                        className="w-full min-h-[150px] border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                        placeholder="1. Buka toko jam 07:00&#10;2. Cek stok pagi..."
                        value={settings.sop_manager}
                        onChange={(e) => handleInputChange("sop_manager", e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" /> SOP Kasir
                    </label>
                    <textarea
                        className="w-full min-h-[150px] border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
                        placeholder="1. Sambut setiap pelanggan dengan senyuman&#10;2. Konfirmasi pesanan sebelum pembayaran..."
                        value={settings.sop_cashier}
                        onChange={(e) => handleInputChange("sop_cashier", e.target.value)}
                    />
                </div>
            </CardContent>
            <CardFooter className="justify-end border-t border-gray-100 p-4">
                <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Update Team SOP
                </Button>
            </CardFooter>
        </Card>
    )
}
