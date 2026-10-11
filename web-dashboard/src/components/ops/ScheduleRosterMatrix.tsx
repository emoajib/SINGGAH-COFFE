import { useState, useMemo } from "react"
import type { Schedule, ShiftConfig } from "../../types"

// Matriks roster: baris = barista, kolom = tanggal. Scroll horizontal +
// kolom nama sticky agar layak pakai di HP. Klik sel = pilihan edit cepat (P, M, P+M, L, ·).
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export function ScheduleRosterMatrix({
  bulan,
  rows,
  configs,
  baristas,
  showInactive,
  onCycleCell,
  onQuickSet,
}: RosterMatrixProps & { showInactive: boolean }) {
  const dates = useMemo(() => daysOfMonth(bulan), [bulan])
  const grid = useRosterGrid(rows, dates)
  void showInactive

  const [activeCell, setActiveCell] = useState<{
    baristaId: number
    baristaName: string
    tanggal: string
    currentLabel: string
    items: Schedule[]
  } | null>(null)

  const cellText = (baristaId: number, tanggal: string): { id: number | null; label: string; cls: string } => {
    const items = grid.get(`${baristaId}|${tanggal}`) || []
    if (items.length === 0) return { id: null, label: "", cls: "bg-slate-50 text-slate-300" }
    const masuk = items.filter((x) => x.status === "dijadwalkan")
    if (masuk.length > 0) {
      return { id: masuk[0].id, label: masuk.map((x) => kodeShift(configs, x.shift_config_id)).join("+"), cls: "bg-emerald-100 text-emerald-800 font-bold" }
    }
    const first = items[0]
    const color = first.status === "libur" ? "bg-amber-100 text-amber-800" : first.status === "izin" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
    return { id: first.id, label: first.status.charAt(0).toUpperCase(), cls: color + " font-bold" }
  }

  const handleCellClick = (baristaId: number, baristaName: string, tanggal: string, currentId: number | null, label: string) => {
    if (onQuickSet) {
      setActiveCell({
        baristaId,
        baristaName,
        tanggal,
        currentLabel: label,
        items: grid.get(`${baristaId}|${tanggal}`) || [],
      })
    } else if (onCycleCell) {
      onCycleCell(baristaId, tanggal, currentId)
    }
  }

  return (
    <>
      <div className="overflow-x-auto border rounded-lg">
        <table className="border-collapse text-xs" style={{ tableLayout: "fixed", minWidth: "100%" }}>
          <thead className="sticky top-0">
            <tr>
              <th className="sticky left-0 bg-white border p-1 text-left min-w-[110px]">Barista</th>
              {dates.map((d) => {
                const dt = new Date(d + "T00:00:00")
                const weekend = dt.getDay() === 0 || dt.getDay() === 6
                return (
                  <th key={d} className={`border p-1 w-9 ${weekend ? "bg-slate-200" : "bg-slate-50"}`}>
                    <div className="font-bold">{Number(d.slice(8, 10))}</div>
                    <div className="font-normal text-[10px]">{hariIndonesia(d)}</div>
                  </th>
                )
              })}
              <th className="border p-1 bg-slate-50 min-w-[110px]">Rekap</th>
            </tr>
          </thead>
          <tbody>
            {baristas.map((b) => (
              <tr key={b.id}>
                <td className="sticky left-0 bg-white border p-1 font-semibold truncate max-w-[110px]">{b.name}</td>
                {dates.map((d) => {
                  const dt = new Date(d + "T00:00:00")
                  const weekend = dt.getDay() === 0 || dt.getDay() === 6
                  const cell = cellText(b.id, d)
                  return (
                    <td key={d} className={`border p-0.5 text-center ${weekend ? "bg-slate-100/60" : ""}`}>
                      <button
                        type="button"
                        title={`${b.name} ${d}: klik untuk pilih shift (L, P, M, P+M, kosong)`}
                        onClick={() => handleCellClick(b.id, b.name, d, cell.id, cell.label)}
                        className={`w-full rounded px-0.5 py-1 ${cell.cls} hover:ring-2 hover:ring-slate-400 transition`}
                      >
                        {cell.label || "·"}
                      </button>
                    </td>
                  )
                })}
                <RosterRecapCell baristaId={b.id} dates={dates} grid={grid} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeCell && onQuickSet && (
        <QuickEditModal
          baristaName={activeCell.baristaName}
          tanggal={activeCell.tanggal}
          currentLabel={activeCell.currentLabel}
          configs={configs}
          onSelectAction={async (action, shiftConfigIds) => {
            const { baristaId, tanggal } = activeCell
            setActiveCell(null)
            await onQuickSet(baristaId, tanggal, action, shiftConfigIds)
          }}
          onClose={() => setActiveCell(null)}
        />
      )}
    </>
  )
}

// Modal Cepat: pilih shift (P, M, P+M, L, atau kosong) dalam 1 klik
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
function QuickEditModal({
  baristaName,
  tanggal,
  currentLabel,
  configs,
  onSelectAction,
  onClose,
}: {
  baristaName: string
  tanggal: string
  currentLabel: string
  configs: ShiftConfig[]
  onSelectAction: (action: "shift" | "libur" | "clear", shiftConfigIds?: number[]) => void
  onClose: () => void
}) {
  const activeConfigs = configs.filter((c) => c.is_active)
  const [y, m, d] = tanggal.split("-")
  const bulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
  const tglFormatted = `${d} ${bulanIndo[Number(m) - 1]} ${y}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl border max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-bold text-sm">{baristaName}</div>
            <div className="text-xs text-slate-300">
              {hariIndonesia(tanggal)}, {tglFormatted}
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-lg p-1">
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded border">
            <span className="text-slate-500">Status Saat Ini:</span>
            <span className="font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
              {currentLabel || "Kosong (·)"}
            </span>
          </div>

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pilih Shift / Status:</div>
          <div className="grid grid-cols-1 gap-1.5">
            {activeConfigs.map((c) => {
              const kd = kodeShift(configs, c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectAction("shift", [c.id])}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 flex items-center justify-center rounded bg-emerald-600 text-white font-bold">{kd}</span>
                    <span>{c.name} Saja</span>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-normal">
                    {c.start_time} - {c.end_time}
                  </span>
                </button>
              )
            })}

            {activeConfigs.length > 1 && (
              <button
                type="button"
                onClick={() => onSelectAction("shift", activeConfigs.map((c) => c.id))}
                className="flex items-center justify-between px-3 py-2 rounded-lg border border-emerald-600 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition"
              >
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 flex items-center justify-center rounded bg-white text-emerald-800 font-bold">
                    {activeConfigs.map((c) => kodeShift(configs, c.id)).join("+")}
                  </span>
                  <span>Semua Shift (Multi-Shift)</span>
                </div>
                <span className="text-[11px] text-emerald-100 font-normal">{activeConfigs.length} shift</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onSelectAction("libur")}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition"
            >
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 flex items-center justify-center rounded bg-amber-500 text-white font-bold">L</span>
                <span>Libur Hari Ini</span>
              </div>
              <span className="text-[11px] text-amber-700 font-normal">Off</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectAction("clear")}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
            >
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 flex items-center justify-center rounded bg-slate-200 text-slate-600 font-bold">·</span>
                <span>Kosongkan / Reset</span>
              </div>
              <span className="text-[11px] text-slate-500 font-normal">Hapus jadwal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Rekap per barista: hitung hari masuk vs libur/izin/sakit.
function RosterRecapCell({ baristaId, dates, grid }: { baristaId: number; dates: string[]; grid: Map<string, Schedule[]> }) {
  let masuk = 0
  let off = 0
  for (const d of dates) {
    const items = grid.get(`${baristaId}|${d}`) || []
    if (items.some((x) => x.status === "dijadwalkan")) masuk++
    else if (items.length > 0) off++
  }
  return <td className="border p-1 text-[11px] whitespace-nowrap">Masuk {masuk} · Lbr {off}</td>
}

// Teks WhatsApp: satu baris per barista, tanpa andalan perataan spasi
// (font WA proporsional). Maksimal ringkas agar tidak terpotong.
// Vetted by AI - Manual Review Required by Senior Engineer/Manager
export function buildWaText(bulan: string, baristas: { id: number; name: string }[], rows: Schedule[], configs: ShiftConfig[]): string {
  const byBarista = new Map<number, Schedule[]>()
  for (const r of rows) {
    const arr = byBarista.get(r.barista_id) || []
    arr.push(r)
    byBarista.set(r.barista_id, arr)
  }
  const lines = [`*JADWAL ${bulan}*`]
  for (const b of baristas) {
    const items = byBarista.get(b.id) || []
    const byDate = new Map<string, Schedule[]>()
    for (const it of items) {
      const d = (it.tanggal || "").slice(0, 10)
      if (!d) continue
      const arr = byDate.get(d) || []
      arr.push(it)
      byDate.set(d, arr)
    }
    let masuk = 0
    let off = 0
    const parts: string[] = []
    const sortedDates = Array.from(byDate.keys()).sort()
    for (const d of sortedDates) {
      const dayItems = byDate.get(d) || []
      const tgl = d.slice(8, 10).replace(/^0/, "")
      const on = dayItems.filter((x) => x.status === "dijadwalkan")
      if (on.length > 0) {
        masuk++
        parts.push(`${tgl}${on.map((x) => kodeShift(configs, x.shift_config_id)).join("+")}`)
      } else if (dayItems.length > 0) {
        off++
        parts.push(`${tgl}${dayItems[0].status.charAt(0).toUpperCase()}`)
      }
    }
    lines.push(`${b.name}: ${parts.join(" ")} (M${masuk}/L${off})`)
  }
  lines.push("P=Pagi M=Malam L=Libur I=Izin S=Sakit (kode ikut pengaturan shift)")
  return lines.join("\n")
}

// Cetak 1 halaman landscape via dokumen mandiri (pola halaman Bagi Hasil).
export function printRoster(bulan: string, outlet: string, baristas: { id: number; name: string }[], rows: Schedule[], configs: ShiftConfig[], disusun: string) {
  const [y, m] = bulan.split("-").map(Number)
  const last = new Date(y, m, 0).getDate()
  const head: string[] = []
  for (let d = 1; d <= last; d++) head.push(`<th>${d}</th>`)
  const body = baristas.map((b) => {
    let masuk = 0
    let off = 0
    let cells = ""
    for (let d = 1; d <= last; d++) {
      const key = `${bulan}-${String(d).padStart(2, "0")}`
      const items = rows.filter((r) => r.barista_id === b.id && (r.tanggal || "").slice(0, 10) === key)
      let txt = ""
      let cls = ""
      const on = items.filter((x) => x.status === "dijadwalkan")
      if (on.length > 0) {
        masuk++
        txt = on.map((x) => kodeShift(configs, x.shift_config_id)).join("+")
        cls = "background:#d1fae5;"
      } else if (items.length > 0) {
        off++
        txt = items[0].status.charAt(0).toUpperCase()
        cls = "background:#fef3c7;"
      }
      cells += `<td style="${cls}">${txt}</td>`
    }
    return `<tr><td class="nm">${b.name}</td>${cells}<td>M${masuk}/L${off}</td></tr>`
  }).join("")
  const now = new Date()
  const stamp = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
  const html = `<html><head><title>Roster ${bulan}</title><style>
    @page{size:A4 landscape;margin:8mm}body{font-family:Arial,sans-serif;font-size:7pt}
    table{border-collapse:collapse;width:100%;table-layout:fixed}
    th,td{border:1px solid #999;padding:1px 2px;text-align:center;overflow:hidden}
    .nm{text-align:left;font-weight:bold}.head{display:flex;justify-content:space-between;margin-bottom:6px}
    h2{margin:0;font-size:12pt}.sig{margin-top:10px;display:flex;gap:40px}.sig div{border-top:1px solid #000;padding-top:2px;min-width:140px;text-align:center}
    </style></head><body>
    <div class="head"><div><h2>JADWAL BARISTA — ${bulan}</h2><div>${outlet}</div></div>
    <div>Dicetak: ${stamp}<br>Disusun: ${disusun}</div></div>
    <table><thead><tr><th>Barista</th>${head.join("")}<th>Rekap</th></tr></thead><tbody>${body}</tbody></table>
    <p>P=Pagi M=Malam L=Libur I=Izin S=Sakit (kode ikut pengaturan shift)</p>
    <div class="sig"><div>Owner<br><br><br>( )</div><div>Manajer<br><br><br>( )</div></div>
    <script>window.onload=function(){window.print()}</script></body></html>`
  const w = window.open("", "_blank", "width=1000,height=700")
  if (w) {
    w.document.write(html)
    w.document.close()
  }
}

export interface RosterMatrixProps {
  bulan: string
  rows: Schedule[]
  configs: ShiftConfig[]
  baristas: { id: number; name: string }[]
  showInactive: boolean
  onCycleCell?: (baristaId: number, tanggal: string, currentId: number | null) => void
  onQuickSet?: (baristaId: number, tanggal: string, action: "shift" | "libur" | "clear", shiftConfigIds?: number[]) => Promise<void>
}

// Kode tampil: pakai kode eksplisit, fallback huruf pertama tiap kata nama.
export function kodeShift(configs: ShiftConfig[], id: number): string {
  const c = configs.find((x) => x.id === id)
  if (!c) return "?"
  if (c.kode && c.kode.trim() !== "") return c.kode.trim().toUpperCase().slice(0, 3)
  const inits = c.name.split(/\s+/).map((w) => w.charAt(0)).join("").toUpperCase()
  return inits.slice(0, 3) || "?";
}

export function hariIndonesia(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][d.getDay()]
}

export function daysOfMonth(bulan: string): string[] {
  const [y, m] = bulan.split("-").map(Number)
  const last = new Date(y, m, 0).getDate()
  const out: string[] = []
  for (let d = 1; d <= last; d++) {
    out.push(`${bulan}-${String(d).padStart(2, "0")}`)
  }
  return out
}

export function useRosterGrid(rows: Schedule[], dates: string[]) {
  return useMemo(() => {
    const map = new Map<string, Schedule[]>()
    for (const r of rows) {
      const key = `${r.barista_id}|${(r.tanggal || "").slice(0, 10)}`
      const arr = map.get(key) || []
      arr.push(r)
      map.set(key, arr)
    }
    return map
  }, [rows, dates])
}
