import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "../ui/button"
import { ScheduleRosterMatrix, buildWaText, printRoster } from "./ScheduleRosterMatrix"
import { useScheduleMonth } from "../../hooks/useOps"
import { OpsService } from "../../services/opsService"
import { useBaristas } from "../../hooks/useBarista"
import type { ShiftConfig } from "../../types"

// Tab roster bulanan: 1 request data, klik-sel edit cepat, cetak + teks WA.
export function ScheduleRosterTab({ configs, outletName, userName }: { configs: ShiftConfig[]; outletName: string; userName: string }) {
  const now = new Date()
  const [bulan, setBulan] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
  const [showInactive, setShowInactive] = useState(false)
  const [msg, setMsg] = useState("")
  const qc = useQueryClient()
  const { data: rows, isLoading } = useScheduleMonth(bulan)
  const { data: baristas } = useBaristas()
  const list = (baristas || []).filter((b: { status: string }) => showInactive || b.status === "active")
  const monthRows = (rows || []).filter((r) => (r.tanggal || "").slice(0, 7) === bulan)

  const cycleCell = async (baristaId: number, tanggal: string, _currentId: number | null) => {
    setMsg("")
    try {
      const items = monthRows.filter((r) => r.barista_id === baristaId && (r.tanggal || "").slice(0, 10) === tanggal)
      if (items.length === 0) {
        for (const c of configs.filter((x) => x.is_active)) {
          await OpsService.createSchedule({ barista_id: baristaId, tanggal, shift_config_id: c.id, status: "dijadwalkan" })
        }
      } else if (items.some((x) => x.status === "dijadwalkan")) {
        for (const it of items) {
          await OpsService.updateSchedule(it.id, { barista_id: it.barista_id, tanggal: (it.tanggal || "").slice(0, 10), shift_config_id: it.shift_config_id, status: "libur" })
        }
      } else {
        for (const it of items) {
          await OpsService.deleteSchedule(it.id)
        }
      }
      qc.invalidateQueries({ queryKey: ["schedulesMonth"] })
      qc.invalidateQueries({ queryKey: ["schedules"] })
    } catch (e) {
      setMsg("Gagal menyimpan, tampilan dikembalikan: " + (e as Error).message)
      qc.invalidateQueries({ queryKey: ["schedulesMonth"] })
    }
  }

  const copyWa = async () => {
    const text = buildWaText(bulan, list.map((b: { id: number; name: string }) => ({ id: b.id, name: b.name })), monthRows, configs)
    try {
      await navigator.clipboard.writeText(text)
      setMsg("Teks WA tersalin, siap ditempel ke grup.")
    } catch {
      setMsg("Gagal menyalin otomatis, blokir izin clipboard browser.")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center bg-white rounded-lg border p-3">
        <input type="month" className="border rounded px-2 py-1 text-sm" value={bulan} onChange={(e) => setBulan(e.target.value)} />
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          Tampilkan nonaktif
        </label>
        <Button size="sm" variant="outline" onClick={() => printRoster(bulan, outletName, list.map((b: { id: number; name: string }) => ({ id: b.id, name: b.name })), monthRows, configs, userName)}>Cetak</Button>
        <Button size="sm" variant="outline" onClick={copyWa}>Salin WA</Button>
      </div>
      {msg && <div className="text-xs text-slate-600">{msg}</div>}
      {isLoading && <div className="text-sm text-gray-500">Memuat roster…</div>}
      {!isLoading && (
        <ScheduleRosterMatrix
          bulan={bulan}
          rows={monthRows}
          configs={configs}
          baristas={list.map((b: { id: number; name: string }) => ({ id: b.id, name: b.name }))}
          showInactive={showInactive}
          onCycleCell={cycleCell}
        />
      )}
    </div>
  )
}
