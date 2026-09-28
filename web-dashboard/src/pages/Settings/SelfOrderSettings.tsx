// Vetted by AI - Manual Review Required by Senior Engineer/Manager
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  QrCode,
  Printer,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Coffee,
  X,
  Smartphone
} from "lucide-react";
import { getImageUrl } from "../../lib/utils";

interface SelfOrderSettingsProps {
  settings: Record<string, string>;
  saving: boolean;
  handleInputChange: (key: string, value: string) => void;
  handleSaveSettings: () => void;
}

export function SelfOrderSettings({
  settings,
  saving,
  handleInputChange,
  handleSaveSettings,
}: SelfOrderSettingsProps) {
  const [showStandeeModal, setShowStandeeModal] = useState(false);

  const isEnabled = settings.self_order_enabled !== "false";

  const publicOrderUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/order`
      : "https://sosiomen.com/order";

  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(
    publicOrderUrl
  )}`;

  return (
    <div className="space-y-6">
      {/* Kartu Status & Saklar Fitur */}
      <Card className="rounded-3xl border-slate-200/80 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/60 border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base font-extrabold text-slate-900">
                  Pemesanan Mandiri Smartphone (QR Menu)
                </CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Izinkan pelanggan memindai barcode di meja untuk melihat menu & memesan via smartphone.
                </p>
              </div>
            </div>

            <span
              className={`text-xs font-black px-3 py-1 rounded-full border ${
                isEnabled
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-red-50 text-red-800 border-red-200"
              }`}
            >
              {isEnabled ? "Aktif" : "Nonaktif"}
            </span>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Toggle Switch */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div>
              <label className="text-sm font-extrabold text-slate-900 block">
                Status Pemesanan Mandiri
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                Bila dimatikan, halaman menu pelanggan akan menampilkan pemberitahuan untuk memesan langsung ke kasir.
              </p>
            </div>

            <select
              name="self_order_enabled"
              value={settings.self_order_enabled || "true"}
              onChange={(e) => handleInputChange("self_order_enabled", e.target.value)}
              className="text-xs font-extrabold px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="true">Aktif (Pelanggan Bisa Pesan)</option>
              <option value="false">Nonaktif (Tutup Pemesanan QR)</option>
            </select>
          </div>

          {/* Alur Kerja & Keamanan Zero Trust */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs mb-1">
                <Smartphone className="w-4 h-4" /> 1. Pelanggan Memesan
              </div>
              <p className="text-[11px] text-amber-900/80 leading-snug">
                Pelanggan scan barcode, memilih menu, dan mengisi Nama Pemesan. Menerima 4-digit kode pengambilan.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/60">
              <div className="flex items-center gap-2 text-blue-900 font-extrabold text-xs mb-1">
                <CheckCircle2 className="w-4 h-4" /> 2. Pelunasan di Kasir
              </div>
              <p className="text-[11px] text-blue-900/80 leading-snug">
                Pelanggan ke kasir menyebutkan kode / nama. Kasir memproses pelunasan (Tunai/QRIS) via Open Bills.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60">
              <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs mb-1">
                <ShieldCheck className="w-4 h-4" /> 3. Racik & Potong Stok
              </div>
              <p className="text-[11px] text-emerald-900/80 leading-snug">
                Setelah lunas, pesanan diteruskan ke Barista KDS, stok bahan baku dipotong, dan tercatat di Buku Kas.
              </p>
            </div>
          </div>

          {/* Quick Preview & Standee Action */}
          <div className="p-5 rounded-2xl bg-[#4B3621] text-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 block mb-1">
                Standee Meja Barcode
              </span>
              <h3 className="text-base font-black">Cetak Standee Meja & Kartu Menu QR</h3>
              <p className="text-xs text-amber-100/80 mt-1 max-w-md">
                Pajang barcode di atas meja kafe untuk kenyamanan pelanggan tanpa perlu menunggu antrean kasir yang panjang.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <a
                href={publicOrderUrl}
                target="_blank"
                rel="noreferrer"
                className="bg-white/10 hover:bg-white/20 text-white font-bold text-xs py-2 px-3.5 rounded-xl border border-white/20 flex items-center gap-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Menu</span>
              </a>

              <Button
                type="button"
                onClick={() => setShowStandeeModal(true)}
                className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Standee Meja</span>
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-slate-50/60 border-t border-slate-100 flex justify-end p-4">
          <Button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="bg-[#4B3621] hover:bg-[#3d2c1a] text-amber-300 font-extrabold text-xs px-5 py-2.5 rounded-xl shadow"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan Pengaturan"}
          </Button>
        </CardFooter>
      </Card>

      {/* Modal Cetak Standee Meja */}
      {showStandeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-slate-800 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setShowStandeeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-4">
              <h3 className="text-base font-extrabold text-slate-900">Standee Meja Pemesanan</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cetak dan pajang di akrilik meja kafe untuk pelanggan scan.
              </p>
            </div>

            {/* Desain Akrilik Meja Siap Cetak */}
            <div
              id="standee-selforder-print"
              className="bg-[#4B3621] text-[#F5F0E6] rounded-2xl p-6 text-center border-2 border-amber-900/50 shadow-inner space-y-3"
            >
              {settings.outlet_logo_url ? (
                <div className="w-16 h-16 rounded-2xl bg-white p-1.5 mx-auto shadow-md border-2 border-amber-400/40 flex items-center justify-center overflow-hidden">
                  <img
                    src={getImageUrl(settings.outlet_logo_url)}
                    alt={settings.outlet_name || "Logo Singgah Coffee"}
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 mx-auto flex items-center justify-center text-amber-300 border border-amber-400/30">
                  <Coffee className="w-6 h-6" />
                </div>
              )}

              <div>
                <h4 className="font-black text-base tracking-wide uppercase">
                  {settings.outlet_name || "Singgah Coffee"}
                </h4>
                <p className="text-[11px] text-amber-200/90 font-medium">
                  {settings.outlet_description || "Pesan Menu Tanpa Antre di Kasir"}
                </p>
              </div>

              {/* Kotak QR Code */}
              <div className="bg-white p-3 rounded-2xl inline-block shadow-md mx-auto">
                <img
                  src={qrImageSrc}
                  alt="QR Code Pemesanan Mandiri"
                  className="w-44 h-44 object-contain mx-auto"
                />
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-xs font-black uppercase text-amber-300 tracking-wider block">
                  ☕ SCAN UNTUK PESAN ☕
                </span>
                <p className="text-[10px] text-amber-100 leading-tight">
                  1. Scan Barcode &middot; 2. Pilih Menu &middot; 3. Bayar di Kasir
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full bg-[#4B3621] hover:bg-[#3D2C1B] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Printer className="w-4 h-4" />
                Cetak Standee Meja Sekarang
              </button>
              <button
                type="button"
                onClick={() => setShowStandeeModal(false)}
                className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
