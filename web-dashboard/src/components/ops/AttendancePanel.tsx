import { useState } from "react"
import { Button } from "../ui/button"
import { useAttendances } from "../../hooks/useOps"

// Panel persetujuan kehadiran luar-jadwal (owner & manajer).
export function AttendancePanel() {
  const { pending, approve, reject } = useAttendances()
  const [alasan, setAlasan] = useState("")
  const rows = pending.data || []
  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <h3 className="font-bold text-sm">Menunggu verifikasi ({rows.length})</h3>
      {rows.length === 0 && <div className="text-sm text-gray-500">Tidak ada kehadiran menunggu.</div>}
      {rows.map((a) => (
        <div key={a.id} className="border rounded p-2 text-sm space-y-1">
          <div><b>{a.barista_name}</b> — {a.tanggal || ""} {a.shift_name || `shift #${a.shift_instance_id}`} — <span className="text-xs px-2 py-0.5 rounded bg-amber-100">{a.status}</span></div>
          {a.alasan && <div className="text-xs text-gray-600">Alasan: {a.alasan}</div>}
          <div className="flex gap-2 items-center">
            <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate(a.id)}>Setujui</Button>
            <input className="border rounded px-2 py-1 text-xs flex-1" placeholder="Alasan penolakan…"
              value={alasan} onChange={(e) => setAlasan(e.target.value)} />
            <Button size="sm" variant="outline" disabled={!alasan || reject.isPending}
              onClick={() => reject.mutate({ id: a.id, alasan })}>Tolak</Button>
          </div>
        </div>
      ))}
    </div>
  )
}
