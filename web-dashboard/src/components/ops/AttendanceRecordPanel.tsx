import { useState } from "react"
import { Button } from "../ui/button"
import { useAttendances, useSchedules, useShifts } from "../../hooks/useOps"
import { useBaristas } from "../../hooks/useBarista"

// Form catat kehadiran: cocokkan otomatis dengan jadwal; tanpa jadwal
// berarti luar-jadwal (wajib alasan, menunggu persetujuan).
export function AttendanceRecordPanel({ tanggal }: { tanggal: string }) {
  const { record } = useAttendances()
  const { list: shifts } = useShifts(tanggal)
  const { list: schedules } = useSchedules(tanggal)
  const { data: baristas } = useBaristas()
  const [inst, setInst] = useState("")
  const [barista, setBarista] = useState("")
  const [alasan, setAlasan] = useState("")
  const [msg, setMsg] = useState("")
  const instances = shifts.data || []
  const aktif = (baristas || []).filter((b: { status: string }) => b.status === "active")
  const instSel = instances.find((s) => s.id === Number(inst))
  const jadwalCocok = (schedules.data || []).find(
    (j) => j.barista_id === Number(barista) && j.shift_config_id === instSel?.shift_config_id
  )
  const luarJadwal = inst !== "" && barista !== "" && !jadwalCocok
  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <h3 className="font-bold text-sm">Catat kehadiran</h3>
      <div className="flex flex-wrap gap-2 items-end">
        <select className="border rounded px-2 py-1.5 text-sm" value={inst} onChange={(e) => setInst(e.target.value)}>
          <option value="">— shift —</option>
          {instances.map((s) => <option key={s.id} value={s.id}>{s.shift_name || `#${s.shift_config_id}`} ({s.status})</option>)}
        </select>
        <select className="border rounded px-2 py-1.5 text-sm" value={barista} onChange={(e) => setBarista(e.target.value)}>
          <option value="">— barista —</option>
          {aktif.map((b: { id: number; name: string }) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input className="border rounded px-2 py-1 text-sm flex-1 min-w-40" placeholder={luarJadwal ? "Alasan (wajib, luar jadwal)…" : "Alasan (opsional)…"}
          value={alasan} onChange={(e) => setAlasan(e.target.value)} />
        <Button size="sm" disabled={!inst || !barista || (luarJadwal && !alasan) || record.isPending}
          onClick={() => record.mutate({
            schedule_id: jadwalCocok?.id, shift_instance_id: Number(inst),
            barista_id: Number(barista), status: "hadir", alasan,
          }, {
            onSuccess: (a) => setMsg(a.disahkan ? "Tercatat & disahkan." : "Tercatat, menunggu persetujuan."),
            onError: (e) => setMsg("Gagal: " + (e as Error).message),
          })}>Catat hadir</Button>
      </div>
      {jadwalCocok && <div className="text-xs text-emerald-700">Cocok jadwal {jadwalCocok.barista_name} — langsung disahkan.</div>}
      {luarJadwal && <div className="text-xs text-amber-700">Di luar jadwal — perlu persetujuan owner/manajer.</div>}
      {msg && <div className="text-xs text-slate-600">{msg}</div>}
    </div>
  )
}
