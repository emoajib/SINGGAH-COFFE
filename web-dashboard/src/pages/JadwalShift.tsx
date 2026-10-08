import { useState, useEffect } from "react"
import { OpsTasksWidget } from "../components/ops/OpsTasksWidget"
import { ShiftPanel } from "../components/ops/ShiftPanel"
import { SchedulePanel } from "../components/ops/SchedulePanel"
import { AttendancePanel } from "../components/ops/AttendancePanel"
import { ProfitSharingService } from "../services/profitSharingService"
import type { ShiftConfig } from "../types"

// Halaman operasional harian untuk owner & manajer (kasir diblokir di App).
// Isi: daftar tugas, shift per tanggal, jadwal, persetujuan kehadiran.
export default function JadwalShift() {
  const today = new Date().toISOString().slice(0, 10)
  const [tanggal, setTanggal] = useState(today)
  const [tab, setTab] = useState<"shift" | "jadwal" | "hadir">("shift")
  const [configs, setConfigs] = useState<ShiftConfig[]>([])
  useEffect(() => {
    ProfitSharingService.getShiftConfigs().then(setConfigs).catch(() => setConfigs([]))
  }, [])
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold">Jadwal & Shift</h1>
        <input type="date" className="border rounded px-2 py-1 text-sm" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
      </div>
      <OpsTasksWidget />
      <div className="flex gap-2">
        {(["shift", "jadwal", "hadir"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`text-sm px-3 py-1.5 rounded ${tab === t ? "bg-slate-900 text-white" : "bg-white border"}`}>
            {t === "shift" ? "Shift" : t === "jadwal" ? "Jadwal" : "Kehadiran"}
          </button>
        ))}
      </div>
      {tab === "shift" && <ShiftPanel tanggal={tanggal} configs={configs} />}
      {tab === "jadwal" && <SchedulePanel tanggal={tanggal} configs={configs} />}
      {tab === "hadir" && <AttendancePanel />}
    </div>
  )
}
