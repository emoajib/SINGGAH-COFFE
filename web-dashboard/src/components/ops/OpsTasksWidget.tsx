import { AlertTriangle, Clock, Wallet, FileWarning, ClipboardCheck } from "lucide-react"
import { useOpsTasks } from "../../hooks/useOps"

// Widget daftar tugas operasional (C7): tanpa polling agresif (60 dtk).
export function OpsTasksWidget() {
  const { data, isLoading } = useOpsTasks()
  if (isLoading) return <div className="text-sm text-gray-500">Memuat tugas…</div>
  if (!data) return null
  const items = [
    { icon: Clock, label: "Shift belum ditutup", n: data.shift_belum_tutup },
    { icon: ClipboardCheck, label: "Kehadiran menunggu", n: data.kehadiran_pending },
    { icon: Wallet, label: "Kasbon menunggu", n: data.kasbon_pending },
    { icon: FileWarning, label: "Biaya belum klasifikasi", n: data.biaya_belum_klasifikasi },
    { icon: AlertTriangle, label: "Periode siap review", n: data.periode_siap_review },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
      {items.map(({ icon: Icon, label, n }) => (
        <div key={label} className={`rounded-lg border p-3 flex items-center gap-2 ${n > 0 ? "bg-amber-50 border-amber-300" : "bg-white border-gray-200"}`}>
          <Icon className={`w-4 h-4 ${n > 0 ? "text-amber-600" : "text-gray-400"}`} />
          <div>
            <div className="text-lg font-bold">{n}</div>
            <div className="text-[11px] text-gray-600">{label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
