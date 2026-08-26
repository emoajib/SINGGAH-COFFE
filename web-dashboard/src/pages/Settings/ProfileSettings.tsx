import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Camera, Loader2, Save } from "lucide-react"
import { getImageUrl, formatCurrency } from "../../lib/utils"

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager

interface ProfileSettingsProps {
    settings: Record<string, string>;
    saving: boolean;
    handleInputChange: (key: string, value: string) => void;
    handleLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSaveSettings: () => void;
}

function angkaKeTerbilang(n: number): string {
    const units = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
    if (n < 12) return units[n];
    if (n < 20) return angkaKeTerbilang(n - 10) + ' Belas';
    if (n < 100) return angkaKeTerbilang(Math.floor(n / 10)) + ' Puluh ' + angkaKeTerbilang(n % 10);
    if (n < 200) return 'Seratus ' + angkaKeTerbilang(n - 100);
    if (n < 1000) return angkaKeTerbilang(Math.floor(n / 100)) + ' Ratus ' + angkaKeTerbilang(n % 100);
    if (n < 2000) return 'Seribu ' + angkaKeTerbilang(n - 1000);
    if (n < 1000000) return angkaKeTerbilang(Math.floor(n / 1000)) + ' Ribu ' + angkaKeTerbilang(n % 1000);
    if (n < 1000000000) return angkaKeTerbilang(Math.floor(n / 1000000)) + ' Juta ' + angkaKeTerbilang(n % 1000000);
    if (n < 1000000000000) return angkaKeTerbilang(Math.floor(n / 1000000000)) + ' Miliar ' + angkaKeTerbilang(n % 1000000000);
    return 'Angka terlalu besar';
}

export function ProfileSettings({
    settings,
    saving,
    handleInputChange,
    handleLogoUpload,
    handleSaveSettings
}: ProfileSettingsProps) {
    const capitalValue = parseInt(settings.initial_capital || "0");

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profil Outlet</CardTitle>
                <CardDescription>Kelola detail bisnis dan lokasi Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nama Outlet</label>
                        <Input
                            value={settings.outlet_name}
                            onChange={(e) => handleInputChange("outlet_name", e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nomor Telepon Bisnis</label>
                        <Input
                            value={settings.outlet_phone}
                            onChange={(e) => handleInputChange("outlet_phone", e.target.value)}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Logo Outlet</label>
                    <div className="flex gap-4 items-center">
                        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-200 overflow-hidden relative group">
                            {settings.outlet_logo_url ? (
                                <img
                                    src={getImageUrl(settings.outlet_logo_url)}
                                    alt="Logo"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <Camera className="w-8 h-8 text-gray-400" />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                <Camera className="w-6 h-6 text-white" />
                            </div>
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                disabled={saving}
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <Input
                                placeholder="Logo URL (Otomatis terisi saat upload)"
                                value={settings.outlet_logo_url}
                                readOnly
                            />
                            <p className="text-[10px] text-gray-500 italic">Klik kotak gambar untuk mengunggah dari komputer Anda. URL terisi otomatis dan ikon PWA (logo di Android) ikut diperbarui.</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Deskripsi Bisnis</label>
                    <textarea
                        className="w-full min-h-[100px] border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Jelaskan secara singkat tentang kedai kopi Anda..."
                        value={settings.outlet_description}
                        onChange={(e) => handleInputChange("outlet_description", e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Alamat</label>
                    <Input
                        value={settings.outlet_address}
                        onChange={(e) => handleInputChange("outlet_address", e.target.value)}
                    />
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-semibold mb-4 text-primary">Financial Setup (Untuk Analisis BEP)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Modal Awal (Initial Capital)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                                <Input
                                    type="number"
                                    className="pl-10"
                                    placeholder="e.g. 50000000"
                                    value={settings.initial_capital || ""}
                                    onChange={(e) => handleInputChange("initial_capital", e.target.value)}
                                />
                            </div>
                            {capitalValue > 0 && (
                                <div className="mt-1 p-2 bg-gray-50 rounded border border-gray-100 animate-in fade-in slide-in-from-top-1">
                                    <p className="text-[11px] font-bold text-primary">{formatCurrency(capitalValue)}</p>
                                    <p className="text-[10px] text-gray-500 italic">Terbaca: {angkaKeTerbilang(capitalValue)} Rupiah</p>
                                </div>
                            )}
                            <p className="text-[10px] text-gray-500 italic">Digunakan untuk menghitung Payback Period & ROI.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Saldo Kas Awal Default (Rp)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                                <Input
                                    type="number"
                                    className="pl-10"
                                    placeholder="e.g. 500000"
                                    value={settings.default_opening_float || ""}
                                    onChange={(e) => handleInputChange("default_opening_float", e.target.value)}
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 italic">Nominal awal kas yang diisi otomatis saat kasir/manajer membuka shift (jika tidak ada carry-over dari shift sebelumnya).</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Masa Amortisasi (Bulan)</label>
                            <Input
                                type="number"
                                placeholder="e.g. 12"
                                value={settings.initial_capital_amortization_months || ""}
                                onChange={(e) => handleInputChange("initial_capital_amortization_months", e.target.value)}
                            />
                            <p className="text-[10px] text-gray-500 italic">Target pengembalian modal dalam hitungan bulan.</p>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="justify-end border-t border-gray-100 p-4">
                <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Perubahan
                </Button>
            </CardFooter>
        </Card>
    )
}
