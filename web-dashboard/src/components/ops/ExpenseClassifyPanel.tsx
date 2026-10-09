import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "../ui/button"
import { OpsService } from "../../services/opsService"

// Membereskan backlog "biaya belum klasifikasi" dalam satu klik per rentang:
// menandai semua biaya yang belum terikat shift sebagai biaya bersama.
// Murni pencatatan operasional — tidak menyentuh hitungan bagi hasil.
export function ExpenseClassifyPanel() {
  const qc = useQueryClient()
  const monthStart = new Date()
  monthStart.setDate(1)
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const [start, setStart] = useState(fmt(monthStart))
  const [end, setEnd] = useState(fmt(today))
  const [msg, setMsg] = useState("")
  const [busy, setBusy] = useState(false)
  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <h3 className="font-bold text-sm">Klasifikasi biaya bersama</h3>
      <p className="text-xs text-slate-500">
        Tandai semua biaya yang belum terikat shift pada rentang ini sebagai <b>biaya bersama</b>
        (dialokasikan proporsional ke shift). Periksa dulu daftar pengeluaran bila ragu.
      </p>
      <div className="flex flex-wrap gap-2 items-end">
        <input type="date" className="border rounded px-2 py-1 text-sm" value={start} onChange={(e) => setStart(e.target.value)} />
        <input type="date" className="border rounded px-2 py-1 text-sm" value={end} onChange={(e) => setEnd(e.target.value)} />
        <Button size="sm" disabled={busy || !start || !end} onClick={async () => {
          setMsg("")
          setBusy(true)
          try {
            const r = await OpsService.classifyBulkShared(start, end)
            setMsg(`${r.affected} biaya ditandai sebagai biaya bersama.`)
            qc.invalidateQueries({ queryKey: ["opsTasks"] })
          } catch (e) {
            setMsg("Gagal: " + (e as Error).message)
          } finally {
            setBusy(false)
          }
        }}>Tandai periode ini biaya bersama</Button>
      </div>
      {msg && <div className="text-xs text-slate-600">{msg}</div>}
    </div>
  )
}
