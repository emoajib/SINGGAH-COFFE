import { useState } from "react"
import { useDispatch } from "react-redux"
import { setOpenCashRegister } from "../../store/authSlice"
import { CashRegisterService } from "../../services/cashRegisterService"
import { Dialog } from "../ui/dialog"
import { Input } from "../ui/input"
import { formatNumber } from "../../lib/utils"

interface CashFloatModalProps {
    open: boolean
    onSuccess: () => void
}

export default function CashFloatModal({ open, onSuccess }: CashFloatModalProps) {
    const dispatch = useDispatch()
    const [amount, setAmount] = useState("")
    const [notes, setNotes] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const displayAmount = amount ? formatNumber(parseInt(amount.replace(/\./g, ''))) : ""
    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '')
        setAmount(digits)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        const num = parseFloat(amount.replace(/\./g, ''))
        if (!num || num <= 0) {
            setError("Nominal harus diisi dan lebih dari 0")
            return
        }
        setLoading(true)
        try {
            const result = await CashRegisterService.openCashRegister({
                opening_amount: num,
                notes,
            })
            dispatch(setOpenCashRegister(result))
            onSuccess()
        } catch (err: any) {
            setError(err.response?.data?.error || "Gagal membuka kas. Periksa koneksi dan coba lagi.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog
            isOpen={open}
            onClose={() => {}}
            title="Uang Receh Kembalian"
            description="Masukkan nominal uang receh yang disediakan untuk kembalian sebelum memulai kasir."
            footer={
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    {loading ? "Menyimpan..." : "Simpan & Mulai Kasir"}
                </button>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                        Nominal Uang Receh (Rp)
                    </label>
                    <Input
                        type="text"
                        inputMode="numeric"
                        value={displayAmount}
                        onChange={handleAmountChange}
                        placeholder="Contoh: 500.000"
                        className="text-lg font-bold"
                        required
                    />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1">
                        Catatan (Opsional)
                    </label>
                    <Input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Keterangan tambahan"
                    />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
        </Dialog>
    )
}