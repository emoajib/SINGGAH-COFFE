import { useState } from 'react'
import { ArrowLeftRight, Warehouse, Coffee, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '../ui/button'
import { InventoryService } from '../../services/inventoryService'

// Vetted by AI - Manual Review Required by Senior Engineer/Manager

interface Ingredient {
    id: number
    name: string
    unit: string
    warehouse_stock: number
    kedai_stock: number
    current_stock: number
}

interface TransferStockDialogProps {
    ingredient: Ingredient | null
    onClose: () => void
    onSuccess: () => void
}

type TransferDirection = 'warehouse_to_kedai' | 'kedai_to_warehouse'

export function TransferStockDialog({ ingredient, onClose, onSuccess }: TransferStockDialogProps) {
    const [direction, setDirection] = useState<TransferDirection>('warehouse_to_kedai')
    const [quantity, setQuantity] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    if (!ingredient) return null

    const fromLocation = direction === 'warehouse_to_kedai' ? 'warehouse' : 'kedai'
    const toLocation = direction === 'warehouse_to_kedai' ? 'kedai' : 'warehouse'
    const fromStock = direction === 'warehouse_to_kedai' ? ingredient.warehouse_stock : ingredient.kedai_stock
    const toStock = direction === 'warehouse_to_kedai' ? ingredient.kedai_stock : ingredient.warehouse_stock
    const qty = parseFloat(quantity) || 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (qty <= 0) {
            setError('Jumlah transfer harus lebih dari 0')
            return
        }
        if (qty > fromStock) {
            setError(`Stok ${fromLocation === 'warehouse' ? 'Gudang' : 'Kedai'} tidak cukup (tersedia: ${fromStock.toFixed(2)} ${ingredient.unit})`)
            return
        }

        setLoading(true)
        try {
            await InventoryService.transferStock(
                ingredient.id,
                qty,
                fromLocation,
                toLocation,
                notes
            )
            // Vetted by AI - Manual Review Required by Senior Engineer/Manager
            window.dispatchEvent(new CustomEvent('inventory-updated'))
            setSuccess(true)
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 1200)
        } catch (err: unknown) {
            const msg = err instanceof Error
                ? err.message
                : (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Gagal transfer stok'
            setError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 rounded-xl p-2">
                            <ArrowLeftRight className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg">Transfer Stok</h2>
                            <p className="text-violet-200 text-sm">{ingredient.name}</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Stok Info */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className={`rounded-xl border-2 p-3 transition-all ${direction === 'warehouse_to_kedai' ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                                <Warehouse size={14} className="text-indigo-600" />
                                <span className="text-xs font-bold text-indigo-700">Gudang</span>
                            </div>
                            <div className="text-xl font-black text-indigo-800">{ingredient.warehouse_stock.toFixed(1)}</div>
                            <div className="text-[10px] text-indigo-500">{ingredient.unit}</div>
                        </div>
                        <div className={`rounded-xl border-2 p-3 transition-all ${direction === 'kedai_to_warehouse' ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                                <Coffee size={14} className="text-amber-600" />
                                <span className="text-xs font-bold text-amber-700">Kedai</span>
                            </div>
                            <div className="text-xl font-black text-amber-800">{ingredient.kedai_stock.toFixed(1)}</div>
                            <div className="text-[10px] text-amber-500">{ingredient.unit}</div>
                        </div>
                    </div>

                    {/* Arah Transfer */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-widest">Arah Transfer</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setDirection('warehouse_to_kedai')}
                                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-xs font-semibold transition-all ${
                                    direction === 'warehouse_to_kedai'
                                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-1">
                                    <Warehouse size={12} />
                                    <span>→</span>
                                    <Coffee size={12} />
                                </div>
                                <span>Gudang → Kedai</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setDirection('kedai_to_warehouse')}
                                className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-xs font-semibold transition-all ${
                                    direction === 'kedai_to_warehouse'
                                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center gap-1">
                                    <Coffee size={12} />
                                    <span>→</span>
                                    <Warehouse size={12} />
                                </div>
                                <span>Kedai → Gudang</span>
                            </button>
                        </div>
                    </div>

                    {/* Preview Transfer */}
                    <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-100 p-3">
                        <div className="flex items-center justify-between text-sm">
                            <div className="text-center">
                                <div className="text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Dari</div>
                                <div className="font-bold text-gray-800">{fromLocation === 'warehouse' ? '🏭 Gudang' : '☕ Kedai'}</div>
                                <div className="text-xs text-gray-600">{fromStock.toFixed(1)} {ingredient.unit}</div>
                            </div>
                            <div className="flex flex-col items-center">
                                <ArrowLeftRight size={16} className="text-violet-500 mb-0.5" />
                                <div className={`text-sm font-black ${qty > fromStock ? 'text-red-600' : qty > 0 ? 'text-violet-700' : 'text-gray-400'}`}>
                                    {qty > 0 ? qty.toFixed(1) : '—'} {ingredient.unit}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] text-gray-500 font-semibold uppercase mb-0.5">Ke</div>
                                <div className="font-bold text-gray-800">{toLocation === 'kedai' ? '☕ Kedai' : '🏭 Gudang'}</div>
                                <div className="text-xs text-gray-600">{toStock.toFixed(1)} {ingredient.unit}</div>
                            </div>
                        </div>
                        {qty > 0 && qty <= fromStock && (
                            <div className="mt-2 pt-2 border-t border-violet-100 text-[10px] text-violet-600 text-center font-medium">
                                Setelah transfer: {fromLocation === 'warehouse' ? 'Gudang' : 'Kedai'} {(fromStock - qty).toFixed(1)} | {toLocation === 'kedai' ? 'Kedai' : 'Gudang'} {(toStock + qty).toFixed(1)} {ingredient.unit}
                            </div>
                        )}
                    </div>

                    {/* Jumlah */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-widest">
                            Jumlah Transfer <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                max={fromStock}
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                placeholder="0"
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 pr-16 text-lg font-bold focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 transition-all"
                                autoFocus
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">
                                {ingredient.unit}
                            </span>
                        </div>
                        <div className="flex justify-between mt-1">
                            <span className="text-[10px] text-gray-400">
                                Maks: {fromStock.toFixed(1)} {ingredient.unit}
                            </span>
                            {fromStock > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setQuantity(fromStock.toString())}
                                    className="text-[10px] text-violet-600 hover:text-violet-800 font-semibold"
                                >
                                    Transfer semua
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Catatan */}
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-widest">Catatan</label>
                        <input
                            type="text"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Opsional — alasan transfer"
                            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100 transition-all"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-700">
                            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-sm text-green-700">
                            <CheckCircle2 size={16} />
                            <span>Transfer berhasil!</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-1">
                        <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={onClose} disabled={loading}>
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 h-11 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-violet-200 disabled:opacity-50"
                            disabled={loading || success || qty <= 0 || qty > fromStock}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin" />
                                    Memproses...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <ArrowLeftRight size={16} />
                                    Transfer
                                </span>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
