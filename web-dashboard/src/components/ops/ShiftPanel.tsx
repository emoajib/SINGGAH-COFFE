import { useState } from "react"
import { Button } from "../ui/button"
import { useShifts } from "../../hooks/useOps"
import { ProfitSharingService } from "../../services/profitSharingService"
import type { ShiftConfig } from "../../types"

const rupiah = (n: number) => "Rp" + Math.round(n || 0).toLocaleString("id-ID")

// Panel shift operasional: daftar per tanggal, buat, ubah status, tutup.
export function ShiftPanel({ tanggal, configs }: { tanggal: string; configs: ShiftConfig[] }) {
  const { list, create, close, setStatus } = useShifts(tanggal)
  const [cfg, setCfg] = useState("")
  const [warn, setWarn] = useState<string[]>([])
  const [bulkMsg, setBulkMsg] = useState("")
  const rows = list.data || []
  const namaShift = (id: number, fallback?: string) => fallback || configs.find((c) => c.id === id)?.name || `#${id}`
  const existingCfg = new Set(rows.map((s) => s.shift_config_id))
  const openAll = async () => {
    setBulkMsg("")
    let ok = 0, skip = 0
    for (const c of configs.filter((x) => x.is_active)) {
      if (existingCfg.has(c.id)) { skip++; continue }
      try { await create.mutateAsync({ shift_config_id: c.id, tgl: tanggal }); ok++ }
      catch { skip++ }
    }
    setBulkMsg(`Dibuka ${ok}, dilewati ${skip}.`)
  }
  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <div className="flex gap-2 items-end">
        <select className="border rounded px-2 py-1.5 text-sm" value={cfg} onChange={(e) => setCfg(e.target.value)}>
          <option value="">— pilih shift —</option>
          {configs.filter((c) => c.is_active).map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.start_time}–{c.end_time})</option>
          ))}
        </select>
        <Button size="sm" disabled={!cfg || create.isPending} onClick={() => create.mutate({ shift_config_id: Number(cfg), tgl: tanggal })}>Buka shift</Button>
        <Button size="sm" variant="outline" disabled={create.isPending} title="Buka semua shift aktif tanggal ini sekaligus" onClick={openAll}>Buka semua shift</Button>
      </div>
      <p className="text-xs text-slate-500">Angka pendapatan & pembagian dihitung saat shift ditutup (tombol Tutup).</p>
      {bulkMsg && <div className="text-xs text-slate-600">{bulkMsg}</div>}
      {warn.length > 0 && (
        <div className="text-xs bg-amber-50 border border-amber-300 rounded p-2">
          {warn.map((w) => <div key={w}>⚠ {w}</div>)}
        </div>
      )}
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500 text-xs"><th>Shift</th><th>Status</th><th>Pendapatan</th><th>Dasar</th><th>Owner</th><th>Pool</th><th>Sisa kas</th><th></th></tr></thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-t">
              <td className="py-1.5">{namaShift(s.shift_config_id, s.shift_name)}</td>
              <td><span className="text-xs px-2 py-0.5 rounded bg-slate-100">{s.status}</span></td>
              <td>{rupiah(s.revenue)}</td><td>{rupiah(s.dasar_bagi_hasil)}</td>
              <td>{rupiah(s.owner_share)}</td><td>{rupiah(s.pool_barista)}</td><td>{rupiah(s.sisa_kas)}</td>
              <td className="space-x-1">
                {s.status === "aktif" && (
                  <Button size="sm" variant="outline" onClick={() => close.mutate(s.id, { onSuccess: (r) => setWarn(r.warnings || []) })}>Tutup</Button>
                )}
                {(s.status === "terjadwal" || s.status === "ditutup") && (
                  <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: s.id, status: s.status === "terjadwal" ? "aktif" : "menunggu_pemeriksaan" })}>
                    {s.status === "terjadwal" ? "Aktifkan" : "Ajukan review"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <div className="text-sm text-gray-500">Belum ada shift pada tanggal ini.</div>}
    </div>
  )
}

export async function fetchShiftConfigs() {
  return ProfitSharingService.getShiftConfigs()
}
