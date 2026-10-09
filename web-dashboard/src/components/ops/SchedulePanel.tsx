import { useState } from "react"
import { Button } from "../ui/button"
import { useSchedules } from "../../hooks/useOps"
import { OpsService } from "../../services/opsService"
import { useBaristas } from "../../hooks/useBarista"
import type { ShiftConfig } from "../../types"

// Panel jadwal: daftar per tanggal, tambah, hapus, salin minggu lalu.
export function SchedulePanel({ tanggal, configs }: { tanggal: string; configs: ShiftConfig[] }) {
  const { list, create, remove } = useSchedules(tanggal)
  const { data: baristas, isLoading: loadingBarista } = useBaristas()
  const [barista, setBarista] = useState("")
  const [shift, setShift] = useState("")
  const [status, setStatus] = useState("dijadwalkan")
  const [copyMsg, setCopyMsg] = useState("")
  const [bulkMsg, setBulkMsg] = useState("")
  const [bulkBusy, setBulkBusy] = useState(false)
  const rows = list.data || []
  const aktif = (baristas || []).filter((b: { status: string }) => b.status === "active")
  const namaShift = (id: number) => configs.find((c) => c.id === id)?.name || `#${id}`
  const existingKeys = new Set(rows.map((j) => `${j.barista_id}-${j.shift_config_id}`))
  const bulkCreate = async (baristaId: number, st: string) => {
    setBulkMsg("")
    setBulkBusy(true)
    let ok = 0, skip = 0
    try {
      for (const c of configs.filter((x) => x.is_active)) {
        if (existingKeys.has(`${baristaId}-${c.id}`)) { skip++; continue }
        await OpsService.createSchedule({ barista_id: baristaId, tanggal, shift_config_id: c.id, status: st })
        ok++
      }
      setBulkMsg(`Berhasil ${ok}, dilewati ${skip} (sudah ada).`)
    } catch (e) {
      setBulkMsg("Gagal: " + (e as Error).message)
    } finally {
      setBulkBusy(false)
      list.refetch()
    }
  }
  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        <select className="border rounded px-2 py-1.5 text-sm" value={barista} onChange={(e) => setBarista(e.target.value)}>
          <option value="">{loadingBarista ? "Memuat barista…" : "— barista —"}</option>
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
        <Button size="sm" variant="outline" disabled={!barista || bulkBusy}
          title="Jadwalkan barista ini masuk di SEMUA shift aktif tanggal ini"
          onClick={() => bulkCreate(Number(barista), "dijadwalkan")}>Masuk semua shift</Button>
        <Button size="sm" variant="outline" disabled={!barista || bulkBusy}
          title="Tandai barista ini libur di SEMUA shift aktif tanggal ini"
          onClick={() => bulkCreate(Number(barista), "libur")}>Libur hari ini</Button>
        <Button size="sm" variant="outline" onClick={async () => {
          setCopyMsg("")
          const d = new Date(tanggal); d.setDate(d.getDate() - 7)
          try {
            const r = await OpsService.copyWeek(d.toISOString().slice(0, 10), tanggal)
            setCopyMsg(`Disalin ${r.disalin}, dilewati ${r.dilewati} (duplikat).`)
          } catch (e) {
            setCopyMsg("Gagal menyalin: " + (e as Error).message)
          }
        }}>Salin minggu lalu</Button>
      </div>
      {copyMsg && <div className="text-xs text-slate-600">{copyMsg}</div>}
      {bulkMsg && <div className="text-xs text-slate-600">{bulkMsg}</div>}
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500 text-xs"><th>Tanggal</th><th>Barista</th><th>Shift</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((j) => (
            <tr key={j.id} className="border-t">
              <td className="py-1.5">{j.tanggal?.slice(0, 10)}</td>
              <td className="py-1.5">{j.barista_name}</td><td>{namaShift(j.shift_config_id)}</td>
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
