import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Loader2, Save } from "lucide-react"

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager

interface TaxSettingsProps {
    settings: Record<string, string>;
    saving: boolean;
    handleInputChange: (key: string, value: string) => void;
    handleSaveSettings: () => void;
}

export function TaxSettings({
    settings,
    saving,
    handleInputChange,
    handleSaveSettings
}: TaxSettingsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pajak & Layanan</CardTitle>
                <CardDescription>Konfigurasi pajak dan biaya layanan tambahan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Persentase Pajak (%)</label>
                        <Input
                            type="number"
                            value={settings.tax_percentage}
                            onChange={(e) => handleInputChange("tax_percentage", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Biaya Layanan (%)</label>
                        <Input
                            type="number"
                            value={settings.service_charge}
                            onChange={(e) => handleInputChange("service_charge", e.target.value)}
                        />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="justify-end border-t border-gray-100 p-4">
                <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Pengaturan
                </Button>
            </CardFooter>
        </Card>
    )
}
