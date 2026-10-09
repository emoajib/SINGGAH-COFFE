import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "../ui/button"
import { OpsService } from "../../services/opsService"
import { useBaristas } from "../../hooks/useBarista"
import type { ShiftConfig } from "../../types"

// Titipan libur/izin/sakit barista: hari apa, shift apa (kosong = semua
// shift hari itu). Dipakai generate + tersimpan sebagai arsip riwayat.
export function ScheduleRequestPanel({ bulan, configs }: { bulan: string; configs: ShiftConfig[] }) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ["scheduleRequests", bulan],
    queryFn: () => OpsService.getRequests(bulan),
  })
  const { data: baristas } = useBaristas()
  const [barista, setBarista] = useState("")
  const [tanggal, setTanggal] = useState("")
  const [shift, setShift] = useState("")
  const [jenis, setJenis] = useState("libur")
  const [catatan, setCatatan] = useState("")
  const [msg, setMsg] = useState("")
  const aktif = (baristas || []).filter((b: { status: string }) => b.status === "active")
  const namaShift = (id?: number) => !id ? "semua shift" : (configs.find((c) => c.id === id)?.name || `#${id}`)
  const create = useMutation({
    mutationFn: () => OpsService.createRequest({
      barista_id: Number(barista), tanggal,
      shift_config_id: shift ? Number(shift) : undefined, jenis, catatan: catatan || undefined,
    }),
    onSuccess: () => {
      setBarista(""); setTanggal(""); setShift(""); setCatatan("")
      setMsg("Request tersimpan sebagai arsip.")
      qc.invalidateQueries({ queryKey: ["scheduleRequests"] })
    },
    onError: (e) => setMsg("Gagal: " + (e as Error).message),
  })
  const remove = useMutation({
    mutationFn: (id: number) => OpsService.deleteRequest(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["scheduleRequests"] }),
  })
  const rows = list.data || []
  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <h3 className="font-bold text-sm">Titipan libur barista</h3>
      <div className="flex flex-wrap gap-2 items-end">
        <select className="border rounded px-2 py-1.5 text-sm" value={barista} onChange={(e) => setBarista(e.target.value)}>
          <option value="">— barista —</option>
          {aktif.map((b: { id: number; name: string }) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <input type="date" className="border rounded px-2 py-1 text-sm" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
        <select className="border rounded px-2 py-1.5 text-sm" value={shift} onChange={(e) => setShift(e.target.value)}>
          <option value="">semua shift</option>
          {configs.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="border rounded px-2 py-1.5 text-sm" value={jenis} onChange={(e) => setJenis(e.target.value)}>
          {["libur", "izin", "sakit"].map((j) => <option key={j} value={j}>{j}</option>)}
        </select>
        <input className="border rounded px-2 py-1 text-sm flex-1 min-w-32" placeholder="Catatan (opsional)…"
          value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        <Button size="sm" disabled={!barista || !tanggal || create.isPending} onClick={() => create.mutate()}>Simpan titipan</Button>
      </div>
      {msg && <div className="text-xs text-slate-600">{msg}</div>}
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500 text-xs"><th>Tanggal</th><th>Barista</th><th>Shift</th><th>Jenis</th><th>Catatan</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="py-1.5">{r.tanggal?.slice(0, 10)}</td>
              <td className="py-1.5">{r.barista_name}</td>
              <td>{r.shift_name || namaShift(r.shift_config_id)}</td>
              <td><span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">{r.jenis}</span></td>
              <td className="text-xs text-slate-500">{r.catatan || "—"}</td>
              <td><Button size="sm" variant="outline" onClick={() => remove.mutate(r.id)}>Hapus</Button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="text-sm text-gray-500">Belum ada titipan bulan ini.</div>}
    </div>
  )
}
