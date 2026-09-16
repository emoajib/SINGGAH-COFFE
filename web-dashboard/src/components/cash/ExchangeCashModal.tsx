import { useState } from "react"
import { Dialog } from "../ui/dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Loader2 } from "lucide-react"
import { useToast } from "../../hooks/use-toast"
import { useExchangeCash } from "../../hooks/useCashBook"

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
interface ExchangeCashModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function ExchangeCashModal({ isOpen, onClose, onSuccess }: ExchangeCashModalProps) {
  const { toast } = useToast()
  const exchangeMut = useExchangeCash()

  const [exchangeData, setExchangeData] = useState({
    from_method: 'Cash',
    to_method: 'QRIS',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
  })

  const handleExchange = async () => {
    if (exchangeData.from_method === exchangeData.to_method) {
      toast({ title: "Gagal", description: "Metode asal dan tujuan tidak boleh sama", variant: "error" })
      return
    }
    if (exchangeData.amount <= 0) {
      toast({ title: "Gagal", description: "Jumlah nominal harus lebih dari 0", variant: "error" })
      return
    }
    try {
      const res = await exchangeMut.mutateAsync(exchangeData)
      toast({ title: "Berhasil", description: res.message || "Tukar kas berhasil dicatat", variant: "success" })
      onClose()
      setExchangeData({
        from_method: 'Cash',
        to_method: 'QRIS',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        description: '',
      })
      if (onSuccess) onSuccess()
    } catch (e: any) {
      toast({ title: "Gagal", description: e.response?.data?.error || "Gagal tukar kas", variant: "error" })
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Tukar Kas (Cash ↔ QRIS / Bank)"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleExchange} disabled={exchangeMut.isPending}>
            {exchangeMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            Proses Tukar Kas
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs sm:text-sm">
          💡 <strong>Info:</strong> Operasi ini mencatat perpindahan fisik dana (misal setor tunai kas toko ke rekening bank atau tarik tunai dari ATM ke kasir). Total saldo keseluruhan tetap seimbang (net-zero) dan tidak mempengaruhi laporan laba rugi.
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Dari Akun (Keluar)</label>
            <select
              value={exchangeData.from_method}
              onChange={(e) => setExchangeData({ ...exchangeData, from_method: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="Cash">Cash (Tunai)</option>
              <option value="QRIS">QRIS / Rekening Bank</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Ke Akun (Masuk)</label>
            <select
              value={exchangeData.to_method}
              onChange={(e) => setExchangeData({ ...exchangeData, to_method: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="QRIS">QRIS / Rekening Bank</option>
              <option value="Cash">Cash (Tunai)</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tanggal</label>
            <Input
              type="date"
              value={exchangeData.date}
              onChange={(e) => setExchangeData({ ...exchangeData, date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Jumlah (Rp)</label>
            <Input
              type="number"
              value={exchangeData.amount || ""}
              onChange={(e) => setExchangeData({ ...exchangeData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="cth. 500000"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Keterangan (Opsional)</label>
          <Input
            value={exchangeData.description}
            onChange={(e) => setExchangeData({ ...exchangeData, description: e.target.value })}
            placeholder="cth. Penukaran uang cash ke QRIS pelanggan / setor tunai"
          />
        </div>
      </div>
    </Dialog>
  )
}
