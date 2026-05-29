import React, { useState } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { Dialog } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";

/**
 * ARCHITECTURE:
 * This component follows a controlled-component pattern for visibility 
 * but manages its own internal form state to minimize parent re-renders.
 * It uses Shadcn UI primitives for accessibility (Radix UI) and styling.
 */

interface Ingredient {
    id: number;
    name: string;
    unit: string;
    cost_per_unit: number;
}

interface StockAdjustmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    ingredient: Ingredient | null;
    type: 'IN' | 'OUT';
    onConfirm: (data: {
        qty: number;
        isPurchase: boolean;
        updateMasterPrice: boolean;
        newPrice: number;
    }) => Promise<void>;
    isLoading?: boolean;
}

/**
 * PRODUCTION-LEVEL UI COMPONENT: StockAdjustmentDialog
 * - Handles internal state for qty and pricing
 * - WCAG Accessible via Radix UI Dialog
 * - Built-in loading states and price previews
 */
export const StockAdjustmentDialog: React.FC<StockAdjustmentDialogProps> = ({
    isOpen,
    onClose,
    ingredient,
    type,
    onConfirm,
    isLoading = false
}) => {
    const [qty, setQty] = useState<number>(0);
    const [price, setPrice] = useState<number>(ingredient?.cost_per_unit || 0);
    const [isPurchase, setIsPurchase] = useState(true);
    const [updateMasterPrice, setUpdateMasterPrice] = useState(false);

    if (!ingredient) return null;

    const handleConfirm = async () => {
        if (qty <= 0) return;
        await onConfirm({
            qty,
            isPurchase: type === 'IN' && isPurchase,
            updateMasterPrice: type === 'IN' && updateMasterPrice,
            newPrice: price
        });
        // Reset local state on success is usually handled by closing, 
        // but we keep it for consistency.
        setQty(0);
    };

    const totalExpense = qty * (updateMasterPrice ? price : ingredient.cost_per_unit);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={type === 'IN' ? "Input Stok Masuk" : "Catat Stok Keluar"}
        >
            <div className="space-y-6 py-4" role="form" aria-label="Stock Adjustment Form">
                {/* Ingredient Info Card */}
                <div className="p-4 bg-slate-50 rounded-2xl border flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bahan Terpilih</p>
                        <p className="text-lg font-bold text-slate-900">{ingredient.name}</p>
                    </div>
                    <Badge variant="outline" className="bg-white">{ingredient.unit}</Badge>
                </div>

                {/* Main Quantity Input */}
                <div className="space-y-2 text-center">
                    <label 
                        htmlFor="stock-qty"
                        className="text-xs font-bold uppercase tracking-widest text-slate-400"
                    >
                        Jumlah {type === 'IN' ? 'Masuk' : 'Keluar'}
                    </label>
                    <Input
                        id="stock-qty"
                        type="number"
                        placeholder="0"
                        className="h-16 text-3xl font-black text-center rounded-2xl bg-slate-50 focus:bg-white transition-colors border-2 focus:border-primary"
                        value={qty || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQty(Number(e.target.value))}
                        disabled={isLoading}
                        min="0.01"
                        step="any"
                        autoFocus
                    />
                </div>

                {type === 'IN' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Expense Integration Toggle */}
                        <div className="flex items-start gap-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100 group transition-all hover:bg-blue-50">
                            <input
                                type="checkbox"
                                id="isPurchase"
                                className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary cursor-pointer"
                                checked={isPurchase}
                                onChange={(e) => setIsPurchase(e.target.checked)}
                                disabled={isLoading}
                            />
                            <label htmlFor="isPurchase" className="text-xs font-medium text-blue-900 cursor-pointer select-none flex-1">
                                <strong>Catat sebagai Pengeluaran</strong><br />
                                <span className="text-blue-700 opacity-80">
                                    Total biaya: Rp {totalExpense.toLocaleString()}
                                </span>
                            </label>
                        </div>

                        {/* Master Price Update Toggle */}
                        <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${updateMasterPrice ? 'bg-amber-50 border-amber-200' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'}`}>
                            <input
                                type="checkbox"
                                id="updateMasterPrice"
                                className="mt-1 w-4 h-4 rounded text-amber-600 focus:ring-amber-600 cursor-pointer"
                                checked={updateMasterPrice}
                                onChange={(e) => {
                                    setUpdateMasterPrice(e.target.checked);
                                    if(e.target.checked) setPrice(ingredient.cost_per_unit);
                                }}
                                disabled={isLoading}
                            />
                            <div className="flex-1">
                                <label htmlFor="updateMasterPrice" className="text-xs font-medium text-amber-900 cursor-pointer block mb-2 select-none">
                                    <strong>Update Harga Master Bahan</strong><br />
                                    <span className="text-amber-700 opacity-80">Simpan harga baru ini ke database</span>
                                </label>
                                {updateMasterPrice && (
                                    <div className="relative animate-in zoom-in-95 duration-200">
                                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">Rp</span>
                                        <Input
                                            type="number"
                                            className="pl-9 h-8 text-sm font-bold bg-white"
                                            value={price || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(Number(e.target.value) || 0)}
                                            disabled={isLoading}
                                            placeholder={ingredient.cost_per_unit.toString()}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex gap-3">
                    <Button 
                        variant="outline" 
                        className="flex-1 h-12 rounded-xl" 
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Batal
                    </Button>
                    <Button
                        className={`flex-1 h-12 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${type === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}`}
                        onClick={handleConfirm}
                        disabled={isLoading || qty <= 0}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin h-5 w-5" />
                                <span>Memproses...</span>
                            </div>
                        ) : (
                            "Konfirmasi Transaksi"
                        )}
                    </Button>
                </div>

                {/* Helper Tooltip */}
                <div className="flex items-center gap-2 text-[10px] text-slate-400 justify-center">
                    <Info size={12} />
                    <span>Transaksi ini akan tercatat permanen di Riwayat Mutasi</span>
                </div>
            </div>
        </Dialog>
    );
};
