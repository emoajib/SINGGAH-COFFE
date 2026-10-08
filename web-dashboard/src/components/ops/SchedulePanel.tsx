import { useState } from "react"
import { Button } from "../ui/button"
import { useSchedules } from "../../hooks/useOps"
import { OpsService } from "../../services/opsService"
import { useBaristas } from "../../hooks/useBarista"
import type { ShiftConfig } from "../../types"

// Panel jadwal: daftar per tanggal, tambah, hapus, salin minggu lalu.
export function SchedulePanel({ tanggal, configs }: { tanggal: string; configs: ShiftConfig[] }) {
  const { list, create, remove } = useSchedules(tanggal)
  const { data: baristas } = useBaristas()
  const [barista, setBarista] = useState("")
  const [shift, setShift] = useState("")
  const [status, setStatus] = useState("dijadwalkan")
  const rows = list.data || []
  const aktif = (baristas || []).filter((b: { status: string }) => b.status === "active")
  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        <select className="border rounded px-2 py-1.5 text-sm" value={barista} onChange={(e) => setBarista(e.target.value)}>
          <option value="">— barista —</option>
          {aktif.map((b: { id: number; name: string }) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="border rounded px-2 py-1.5 text-sm" value={shift} onChange={(e) => setShift(e.target.value)}>
          <option value="">— shift —</option>
          {configs.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="border rounded px-2 py-1.5 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["dijadwalkan", "libur", "izin", "sakit"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button size="sm" disabled={!barista || !shift || create.isPending}
          onClick={() => create.mutate({ barista_id: Number(barista), tanggal, shift_config_id: Number(shift), status })}>Tambah</Button>
        <Button size="sm" variant="outline" onClick={async () => {
          const d = new Date(tanggal); d.setDate(d.getDate() - 7)
          await OpsService.copyWeek(d.toISOString().slice(0, 10), tanggal)
        }}>Salin minggu lalu</Button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500 text-xs"><th>Barista</th><th>Shift</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((j) => (
            <tr key={j.id} className="border-t">
              <td className="py-1.5">{j.barista_name}</td><td>{j.shift_name || `#${j.shift_config_id}`}</td>
              <td><span className="text-xs px-2 py-0.5 rounded bg-slate-100">{j.status}</span></td>
              <td><Button size="sm" variant="outline" onClick={() => remove.mutate(j.id)}>Hapus</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="text-sm text-gray-500">Belum ada jadwal pada tanggal ini.</div>}
    </div>
  )
}
