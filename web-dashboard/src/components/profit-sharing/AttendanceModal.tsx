import { useState, useEffect, useMemo } from "react"
import { X, Calendar, CheckCircle, Copy, UserCheck, UserX, Save, Loader2 } from "lucide-react"
import { Button } from "../ui/button"
import type { ShiftConfig, ProfitSharingPerson } from "../../types"

// Simple date formatting without date-fns
const formatDate = (date: Date, fmt: string): string => {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][date.getDay()]
  const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][date.getMonth()]
  
  return fmt
    .replace('yyyy', year.toString())
    .replace('MM', month)
    .replace('dd', day)
    .replace('EEEE', dayName)
    .replace('MMM', monthName)
}

interface AttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  person: ProfitSharingPerson
  shiftConfigs: ShiftConfig[]
  startDate: string
  endDate: string
  onSave: (attendance: Record<string, number[]>) => Promise<void>
  isLoading?: boolean
}

export function AttendanceModal({
  isOpen,
  onClose,
  person,
  shiftConfigs,
  startDate,
  endDate,
  onSave,
  isLoading = false
}: AttendanceModalProps) {
  // Catatan: semua hooks harus jalan tanpa syarat (aturan React), jadi
  // tidak ada early-return sebelum hooks. Guard person dilakukan setelah hooks.
  // Generate list of dates in period
  const periodDates = useMemo(() => {
    if (!startDate || !endDate) return []
    const dates: string[] = []
    const curr = new Date(startDate)
    const last = new Date(endDate)
    while (curr <= last) {
      dates.push(formatDate(curr, "yyyy-MM-dd"))
      curr.setDate(curr.getDate() + 1)
    }
    return dates
  }, [startDate, endDate])

  // Parse existing attendance (terima objek maupun string JSON dari draft tersimpan).
  // ID shift dinormalisasi ke number agar perbandingan includes() selalu tepat
  // (ID string vs number membuat toggle terlihat mati: diklik tapi tak berubah).
  const parseAttendance = (v: unknown): Record<string, number[]> => {
    const norm = (arr: unknown): number[] =>
      (Array.isArray(arr) ? arr : []).map(Number).filter((n) => Number.isFinite(n))
    if (!v) return {}
    if (typeof v === "object") {
      const out: Record<string, number[]> = {}
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = norm(val)
      return out
    }
    if (typeof v === "string") {
      try {
        const parsed = JSON.parse(v)
        if (parsed && typeof parsed === "object") {
          const out: Record<string, number[]> = {}
          for (const [k, val] of Object.entries(parsed)) out[k] = norm(val)
          return out
        }
      } catch { /* abaikan */ }
    }
    return {}
  }
  const [attendance, setAttendance] = useState<Record<string, number[]>>(() => {
    const existing = parseAttendance(person?.attendance)
    if (Object.keys(existing).length > 0) return existing
    // Fallback: derive from leave_dates if no attendance
    if (person?.leave_dates) {
      try {
        const leaveDates: string[] = JSON.parse(person.leave_dates)
        const attendanceMap: Record<string, number[]> = {}
        const defaultShifts = person.shift_ids || []
        for (const dateStr of periodDates) {
          if (!leaveDates.includes(dateStr) && defaultShifts.length > 0) {
            attendanceMap[dateStr] = [...defaultShifts]
          }
        }
        return attendanceMap
      } catch {
        return {}
      }
    }
    return {}
  })

  // Determine if person has default shifts assigned
  const defaultShiftIds = (person?.shift_ids || []).map(Number).filter((n) => Number.isFinite(n))
  const isAllDay = defaultShiftIds.length === 0

  // Toggle shift for a date
  const toggleShiftForDate = (dateStr: string, shiftId: number) => {
    setAttendance(prev => {
      const current = prev[dateStr] || []
      const newShifts = current.includes(shiftId)
        ? current.filter(id => id !== shiftId)
        : [...current, shiftId]
      const next = { ...prev }
      if (newShifts.length > 0) {
        next[dateStr] = newShifts
      } else {
        delete next[dateStr]
      }
      return next
    })
  }

  // Quick actions
  const handleFullAttendance = () => {
    // Staf All-Day (tanpa shift default): tandai semua shift aktif di semua
    // tanggal. Sebelumnya fungsi ini tidak menghasilkan apa-apa (no-op) untuk
    // staf All-Day sehingga tombol terlihat mati saat diklik.
    const ids = defaultShiftIds.length > 0
      ? [...defaultShiftIds]
      : shiftConfigs.filter((c) => c.is_active).map((c) => Number(c.id))
    if (ids.length === 0) return
    const newAttendance: Record<string, number[]> = {}
    for (const dateStr of periodDates) {
      newAttendance[dateStr] = [...ids]
    }
    setAttendance(newAttendance)
  }

  const handleFullLeave = () => {
    setAttendance({})
  }

  const handleCopyFromDefault = () => {
    if (defaultShiftIds.length === 0) return
    const newAttendance: Record<string, number[]> = {}
    for (const dateStr of periodDates) {
      newAttendance[dateStr] = [...defaultShiftIds]
    }
    setAttendance(newAttendance)
  }

  const handleSave = async () => {
    await onSave(attendance)
    onClose()
  }

  // Count attended days
  const attendedDays = Object.keys(attendance).length
  const totalDays = periodDates.length

  // Filter tampilan tanggal: semua / hanya hadir / hanya libur.
  const [dateFilter, setDateFilter] = useState<"semua" | "hadir" | "libur">("semua")
  const visibleDates = periodDates.filter((d) => {
    if (dateFilter === "hadir") return (attendance[d] || []).length > 0
    if (dateFilter === "libur") return (attendance[d] || []).length === 0
    return true
  })

  // Handle outside click to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  // Early return SETELAH semua hooks (aturan React). Parent selalu melepas
  // mount saat modal ditutup, dan key memaksa remount per barista.
  if (!isOpen || !person) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center">
              {(person.name?.charAt(0) || "?").toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{person.name}</h3>
              <p className="text-xs text-slate-500">
                {isAllDay ? "All-Day Staff (tanpa shift default)" : `${defaultShiftIds.length} shift default: ${defaultShiftIds.map(id => {
                  const s = shiftConfigs.find(c => c.id === id)
                  return s ? s.name : `#${id}`
                }).join(", ")}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              {attendedDays}/{totalDays} hari hadir
            </span>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Legend (Hadir/Libur bisa diklik sebagai filter tanggal) */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-4 text-xs">
          <button type="button" onClick={() => setDateFilter(dateFilter === "hadir" ? "semua" : "hadir")}
            title="Klik untuk tampilkan hanya tanggal hadir"
            className={`flex items-center gap-2 rounded px-1.5 py-0.5 ${dateFilter === "hadir" ? "bg-emerald-100 ring-1 ring-emerald-400" : "hover:bg-slate-100"}`}>
            <span className="w-3 h-3 rounded-full border-2 border-emerald-500 bg-emerald-50"></span>
            <span className="text-slate-700">Hadir ({attendedDays})</span>
          </button>
          <button type="button" onClick={() => setDateFilter(dateFilter === "libur" ? "semua" : "libur")}
            title="Klik untuk tampilkan hanya tanggal libur"
            className={`flex items-center gap-2 rounded px-1.5 py-0.5 ${dateFilter === "libur" ? "bg-slate-200 ring-1 ring-slate-400" : "hover:bg-slate-100"}`}>
            <span className="w-3 h-3 rounded-full border-2 border-slate-300"></span>
            <span className="text-slate-700">Libur ({totalDays - attendedDays})</span>
          </button>
          <div className="flex items-center gap-2 text-slate-700">
            <span className="w-3 h-3 rounded-full border-2 border-amber-500 bg-amber-50"></span>
            <span>Shift default</span>
          </div>
          {shiftConfigs.length > 0 && (
            <div className="flex items-center gap-2 text-slate-700">
              <span className="w-3 h-3 rounded-full border-2 border-indigo-500 bg-indigo-50"></span>
              <span>Shift tambahan</span>
            </div>
          )}
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto p-4">
          {periodDates.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>Tentukan tanggal mulai dan akhir periode terlebih dahulu</p>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {visibleDates.length === 0 && (
                <p className="text-center text-xs text-slate-400 italic col-span-full py-4">
                  Tidak ada tanggal pada filter ini. Klik legenda Hadir/Libur untuk kembali.
                </p>
              )}
              {visibleDates.map((dateStr) => {
                const date = new Date(dateStr + "T00:00:00")
                const dayName = formatDate(date, "EEEE")
                const dateFormatted = formatDate(date, "dd MMM")
                const attendedShifts = attendance[dateStr] || []
                const isWeekend = date.getDay() === 0 || date.getDay() === 6

                return (
                  <div
                    key={dateStr}
                    className={`p-3 rounded-xl border transition-all ${
                      attendedShifts.length > 0
                        ? "bg-emerald-50 border-emerald-200 shadow-sm"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${isWeekend ? "text-rose-600" : "text-slate-900"}`}>
                          {dateFormatted}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isWeekend ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                          {dayName.substring(0, 3)}
                        </span>
                      </div>
                      {attendedShifts.length > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {attendedShifts.length} shift
                        </span>
                      )}
                    </div>

                    {shiftConfigs.length === 0 ? (
                      <div className="text-center py-2">
                        <span className="text-xs text-slate-400 italic">Belum ada konfigurasi shift</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {shiftConfigs.map(shift => {
                          const isAttended = attendedShifts.includes(shift.id)
                          const isDefaultShift = defaultShiftIds.includes(shift.id)

                          return (
                            <button
                              key={shift.id}
                              type="button"
                              onClick={() => toggleShiftForDate(dateStr, shift.id)}
                              className={`px-2.5 py-1.5 text-[10px] font-medium rounded-lg border transition-all flex flex-col items-center gap-0.5 ${
                                isAttended
                                  ? isDefaultShift
                                    ? "bg-emerald-100 border-emerald-400 text-emerald-800 shadow-sm"
                                    : "bg-indigo-50 border-indigo-300 text-indigo-800"
                                  : isDefaultShift
                                  ? "bg-amber-50 border-amber-200 text-amber-700 opacity-60"
                                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                              title={isAttended ? "Klik untuk batalkan kehadiran" : "Klik untuk tandai hadir"}
                            >
                              <span className={isDefaultShift ? "font-bold" : ""}>
                                {shift.name}
                              </span>
                              <span className="text-[9px] opacity-75">
                                {(shift.start_time || "").slice(0, 5)}-{(shift.end_time || "").slice(0, 5)}
                              </span>
                              {isAttended && (
                                <CheckCircle className={`w-3 h-3 ${isDefaultShift ? "text-emerald-500" : "text-indigo-500"}`} />
                              )}
                            </button>
                          )
                        })}

                        {/* All-day indicator for unassigned baristas */}
                        {isAllDay && (
                          <button
                            type="button"
                            onClick={() => toggleShiftForDate(dateStr, 0)}
                            className={`px-2.5 py-1.5 text-[10px] font-medium rounded-lg border transition-all flex flex-col items-center gap-0.5 ${
                              attendedShifts.includes(0)
                                ? "bg-emerald-100 border-emerald-400 text-emerald-800 shadow-sm"
                                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                            title={attendedShifts.includes(0) ? "Klik untuk batalkan kehadiran" : "Klik untuk tandai hadir (all-day)"}
                          >
                            <span className="font-medium">All-Day</span>
                            <span className="text-[9px] opacity-75">Tanpa shift</span>
                            {attendedShifts.includes(0) && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Empty state for dates with no shifts selected */}
                    {shiftConfigs.length > 0 && attendedShifts.length === 0 && !isAllDay && (
                      <p className="text-center text-xs text-slate-400 italic mt-2 py-1">
                        Libur / Tidak hadir
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleFullAttendance}
              disabled={isLoading}
              className="gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              Hadir Penuh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFullLeave}
              disabled={isLoading}
              className="gap-1.5 text-rose-700 border-rose-300 hover:bg-rose-50"
            >
              <UserX className="w-3.5 h-3.5" />
              Cuti Penuh
            </Button>
            {defaultShiftIds.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyFromDefault}
                disabled={isLoading}
                className="gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Salin dari Default
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan Kehadiran
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}