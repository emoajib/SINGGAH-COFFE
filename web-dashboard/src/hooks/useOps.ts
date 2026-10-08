import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { OpsService } from "../services/opsService"

// Fase C/D: hooks jadwal, kehadiran, shift, tugas.
export function useOpsTasks() {
  return useQuery({
    queryKey: ["opsTasks"],
    queryFn: () => OpsService.getTasks(),
    refetchInterval: 60000,
  })
}

export function useShifts(tanggal: string) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ["shiftInstances", tanggal],
    queryFn: () => OpsService.getShifts(tanggal),
    enabled: tanggal !== "",
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ["shiftInstances"] })
  const create = useMutation({
    mutationFn: ({ shift_config_id, tgl }: { shift_config_id: number; tgl: string }) =>
      OpsService.createShift(shift_config_id, tgl),
    onSuccess: invalidate,
  })
  const close = useMutation({
    mutationFn: (id: number) => OpsService.closeShift(id),
    onSuccess: invalidate,
  })
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      OpsService.setShiftStatus(id, status),
    onSuccess: invalidate,
  })
  return { list, create, close, setStatus }
}

export function useSchedules(tanggal: string) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ["schedules", tanggal],
    queryFn: () => OpsService.getSchedules(tanggal),
    enabled: tanggal !== "",
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ["schedules"] })
  const create = useMutation({
    mutationFn: OpsService.createSchedule,
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: number) => OpsService.deleteSchedule(id),
    onSuccess: invalidate,
  })
  return { list, create, remove }
}

export function useAttendances() {
  const qc = useQueryClient()
  const pending = useQuery({
    queryKey: ["attendancesPending"],
    queryFn: () => OpsService.pendingAttendances(),
  })
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["attendancesPending"] })
    qc.invalidateQueries({ queryKey: ["opsTasks"] })
  }
  const record = useMutation({ mutationFn: OpsService.recordAttendance, onSuccess: invalidate })
  const approve = useMutation({
    mutationFn: (id: number) => OpsService.approveAttendance(id),
    onSuccess: invalidate,
  })
  const reject = useMutation({
    mutationFn: ({ id, alasan }: { id: number; alasan: string }) =>
      OpsService.rejectAttendance(id, alasan),
    onSuccess: invalidate,
  })
  return { pending, record, approve, reject }
}
