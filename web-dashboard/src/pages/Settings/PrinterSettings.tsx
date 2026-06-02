import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../../components/ui/card"
import { Input } from "../../components/ui/input"
import { Button } from "../../components/ui/button"
import { Loader2, Printer, Save } from "lucide-react"

// ⚠️ Vetted by SOSIOMEN - Manual Review Required by Senior Engineer/Manager

interface PrinterSettingsProps {
    settings: Record<string, string>;
    saving: boolean;
    handleInputChange: (key: string, value: string) => void;
    handleSaveSettings: () => void;
}

export function PrinterSettings({
    settings,
    saving,
    handleInputChange,
    handleSaveSettings
}: PrinterSettingsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Printer Configuration</CardTitle>
                <CardDescription>Konfigurasi printer thermal untuk struk dan dapur.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg flex gap-3 text-orange-800 text-sm">
                    <Printer className="w-5 h-5 shrink-0" />
                    <p>Pengaturan ini akan disinkronkan dengan aplikasi Mobile POS. Pastikan printer berada di jaringan (WiFi) yang sama dengan tablet Anda.</p>
                </div>

                 <div className="space-y-4">
                     <h3 className="text-sm font-semibold border-b pb-2">Printer Struk Utama</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                             <label className="text-sm font-medium">Tipe Koneksi</label>
                             <select
                                 className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                 value={settings.printer_connection || "network"}
                                 onChange={(e) => handleInputChange("printer_connection", e.target.value)}
                             >
                                 <option value="network">LAN / Network (Direkomendasikan)</option>
                                 <option value="bluetooth">Bluetooth (Khusus Mobile)</option>
                                 <option value="usb">USB</option>
                             </select>
                         </div>
                         <div className="space-y-2">
                             {settings.printer_connection === "network" ? (
                                 <>
                                     <label className="text-sm font-medium">Alamat IP</label>
                                     <Input
                                         placeholder="e.g. 192.168.1.100"
                                         value={settings.printer_ip}
                                         onChange={(e) => handleInputChange("printer_ip", e.target.value)}
                                         disabled={settings.printer_connection !== "network"}
                                     />
                                 </>
                             ) : (
                                 <>
                                     <label className="text-sm font-medium">Alamat Bluetooth (MAC)</label>
                                     <Input
                                         placeholder="e.g. AA:BB:CC:DD:EE:FF"
                                         value={settings.printer_bluetooth_address || ""}
                                         onChange={(e) => handleInputChange("printer_bluetooth_address", e.target.value)}
                                         disabled={settings.printer_connection !== "bluetooth"}
                                     />
                                 </>
                             )}
                         </div>
                         <div className="space-y-2">
                             <label className="text-sm font-medium">Lebar Kertas</label>
                             <select
                                 className="w-full h-10 border rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                 value={settings.printer_width || "80mm"}
                                 onChange={(e) => handleInputChange("printer_width", e.target.value)}
                             >
                                 <option value="58mm">58mm (Kecil)</option>
                                 <option value="80mm">80mm (Standar)</option>
                             </select>
                         </div>
                         <div className="space-y-2">
                             <label className="text-sm font-medium">Cetak Otomatis</label>
                             <div className="flex items-center gap-2 h-10">
                                 <input
                                     type="checkbox"
                                     className="w-4 h-4 text-primary"
                                     checked={settings.auto_print === "true"}
                                     onChange={(e) => handleInputChange("auto_print", e.target.checked ? "true" : "false")}
                                 />
                                 <span className="text-sm">Cetak struk setiap transaksi selesai</span>
                             </div>
                         </div>
                     </div>
                 </div>
            </CardContent>
            <CardFooter className="justify-end border-t border-gray-100 p-4">
                <Button className="gap-2" onClick={handleSaveSettings} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Simpan Pengaturan Printer
                </Button>
            </CardFooter>
        </Card>
    )
}
