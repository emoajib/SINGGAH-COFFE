import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "../ui/button"
import { OpsService } from "../../services/opsService"

// Generate jadwal 1 bulan penuh: semua barista aktif x semua shift aktif.
// Idempoten (yang sudah ada dilewati). Hasilnya tetap bisa diedit/dihapus
// per baris pada tabel di bawah. Murni pencatatan jadwal.
export function ScheduleGeneratePanel() {
  const qc = useQueryClient()
  const now = new Date()
  const [bulan, setBulan] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [status, setStatus] = useState("dijadwalkan")
  const [weekendOff, setWeekendOff] = useState(false)
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)
  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <h3 className="font-bold text-sm">Generate jadwal 1 bulan</h3>
      <div className="flex flex-wrap gap-2 items-end">
        <input type="month" className="border rounded px-2 py-1 text-sm" value={bulan} onChange={(e) => setBulan(e.target.value)} />
        <select className="border rounded px-2 py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["dijadwalkan", "libur", "izin", "sakit"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={weekendOff} onChange={(e) => setWeekendOff(e.target.checked)} />
          Libur Sabtu-Minggu
        </label>
        <Button size="sm" disabled={busy || !bulan} onClick={async () => {
          setMsg("")
          setBusy(true)
          try {
            const r = await OpsService.generateMonth(bulan, status, weekendOff)
            setMsg(`Dibuat ${r.dibuat}, dilewati ${r.dilewati} (sudah ada). Silakan periksa lalu edit/hapus per baris bila perlu.`)
            qc.invalidateQueries({ queryKey: ["schedules"] })
          } catch (e) {
            setMsg("Gagal: " + (e as Error).message)
          } finally {
            setBusy(false)
          }
        }}>Generate</Button>
      </div>
      {msg && <div className="text-xs text-slate-600">{msg}</div>}
    </div>
  )
}
