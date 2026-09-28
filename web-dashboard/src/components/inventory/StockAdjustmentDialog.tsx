import React, { useState, useEffect } from 'react';
import { Info, Loader2, ArrowUpCircle, ArrowDownCircle, Scale, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatNumber } from '../../lib/utils';
import { Dialog } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

// Vetted by AI - Manual Review Required by Senior Engineer/Manager

interface Ingredient {
    id: number;
    name: string;
    category: string;
    unit: string;
    purchase_unit?: string;
    purchase_unit_size?: number;
    current_stock: number;
    cost_per_unit: number;
}

interface StockAdjustmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    ingredient: Ingredient | null;
    type: 'IN' | 'OUT' | 'AUDIT';
    onConfirm: (data: {
        qty: number;
        type?: 'IN' | 'OUT' | 'ADJ_ADD' | 'ADJ_SUB';
        notes?: string;
        isPurchase: boolean;
        updateMasterPrice: boolean;
        newPrice: number;
    }) => Promise<void>;
    isLoading?: boolean;
}

const AUDIT_REASONS = [
    'Susut Penimbangan & Dosing Kopi',
    'Tumpah / Kerusakan Bahan (Waste)',
    'Bahan Kadaluarsa / Basi',
    'Koreksi Salah Hitung / Salah Catat',
    'Penerimaan Bahan Belum Tercatat',
    'Audit Rutin / Tutup Shift Kafe',
    'Lainnya (Koreksi Stok Fisik)'
];

export const StockAdjustmentDialog: React.FC<StockAdjustmentDialogProps> = ({
    isOpen,
    onClose,
    ingredient,
    type: initialType,
    onConfirm,
    isLoading = false
}) => {
    const [activeMode, setActiveMode] = useState<'IN' | 'OUT' | 'AUDIT'>('IN');
    const [qty, setQty] = useState<number>(0);
    const [realStock, setRealStock] = useState<number>(0);
    const [auditReason, setAuditReason] = useState<string>(AUDIT_REASONS[0]);
    const [customNotes, setCustomNotes] = useState<string>('');
    const [price, setPrice] = useState<number>(ingredient?.cost_per_unit || 0);
    const [isPurchase, setIsPurchase] = useState(true);
    const [updateMasterPrice, setUpdateMasterPrice] = useState(false);

    useEffect(() => {
        if (isOpen && ingredient) {
            setActiveMode(initialType);
            setQty(0);
            setRealStock(ingredient.current_stock || 0);
            setAuditReason(AUDIT_REASONS[0]);
            setCustomNotes('');
            setPrice(ingredient.cost_per_unit || 0);
            setIsPurchase(true);
            setUpdateMasterPrice(false);
        }
    }, [isOpen, ingredient, initialType]);

    if (!ingredient) return null;

    // Hitung selisih untuk mode audit
    const currentStock = ingredient.current_stock || 0;
    const stockDiff = realStock - currentStock;
    const financialDiff = Math.abs(stockDiff) * (ingredient.cost_per_unit || 0);

    const handleConfirm = async () => {
        if (activeMode === 'AUDIT') {
            if (stockDiff === 0) {
                alert('Stok fisik sama persis dengan data sistem. Tidak ada perubahan yang diperlukan.');
                onClose();
                return;
            }

            const isAddition = stockDiff > 0;
            const diffAmount = Math.abs(stockDiff);
            const mutationType = isAddition ? 'ADJ_ADD' : 'ADJ_SUB';
            const noteText = `Audit Fisik / Stock Opname: disesuaikan dari ${formatNumber(currentStock)} ${ingredient.unit} menjadi ${formatNumber(realStock)} ${ingredient.unit} (${isAddition ? '+' : '-'}${formatNumber(diffAmount)} ${ingredient.unit}) - ${auditReason}${customNotes.trim() ? ` (${customNotes.trim()})` : ''}`;

            await onConfirm({
                qty: diffAmount,
                type: mutationType,
                notes: noteText,
                isPurchase: false,
                updateMasterPrice: false,
                newPrice: ingredient.cost_per_unit
            });
            return;
        }

        if (qty <= 0) return;

        await onConfirm({
            qty,
            type: activeMode,
            isPurchase: activeMode === 'IN' && isPurchase,
            updateMasterPrice: activeMode === 'IN' && updateMasterPrice,
            newPrice: price,
            notes: activeMode === 'IN' 
                ? (isPurchase ? "Pembelian Bahan Masuk" : "Koreksi Stok Masuk")
                : "Koreksi Stok Keluar / Limbah"
        });
    };

    const totalExpense = qty * (updateMasterPrice ? price : ingredient.cost_per_unit);

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="Kelola & Sesuaikan Stok Bahan"
        >
            <div className="space-y-5 py-2" role="form" aria-label="Stock Adjustment Form">
                {/* Switcher Mode Tab */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
                    <button
                        type="button"
                        onClick={() => setActiveMode('IN')}
                        className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                            activeMode === 'IN'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        <span>Stok Masuk</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveMode('OUT')}
                        className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                            activeMode === 'OUT'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <ArrowDownCircle className="w-3.5 h-3.5" />
                        <span>Stok Keluar</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveMode('AUDIT')}
                        className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                            activeMode === 'AUDIT'
                                ? 'bg-[#4B3621] text-amber-300 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Scale className="w-3.5 h-3.5" />
                        <span>Audit Fisik</span>
                    </button>
                </div>

                {/* Ingredient Info Card */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bahan Terpilih</p>
                        <p className="text-base font-extrabold text-slate-900">{ingredient.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Kategori: <span className="font-semibold text-slate-700">{ingredient.category || 'Umum'}</span> &middot; Biaya: <span className="font-semibold text-slate-700">Rp {formatNumber(ingredient.cost_per_unit)}/{ingredient.unit}</span>
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase">Stok Sistem</span>
                        <span className="text-sm font-black text-slate-800">
                            {formatNumber(currentStock)} <span className="text-xs font-normal text-slate-500">{ingredient.unit}</span>
                        </span>
                    </div>
                </div>

                {/* MODE AUDIT FISIK / STOCK OPNAME */}
                {activeMode === 'AUDIT' ? (
                    <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                                <Scale className="w-4 h-4 text-amber-800" />
                                <span>Pencocokan Stok Fisik Kedai (Stock Opname)</span>
                            </div>
                            <p className="text-[11px] text-amber-800 leading-relaxed">
                                Timbang atau hitung jumlah fisik riil yang ada di kedai. Sistem akan secara otomatis menghitung selisih dan memperbarui data stok aplikasi seketika.
                            </p>

                            <div className="pt-2">
                                <label className="text-[11px] font-black uppercase tracking-wider text-amber-950 block mb-1.5">
                                    Jumlah Fisik Nyata di Kafe ({ingredient.unit}):
                                </label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        step="any"
                                        placeholder="0"
                                        className="h-14 text-2xl font-black text-center rounded-2xl bg-white border-2 border-amber-300 focus:border-amber-700 text-slate-900"
                                        value={realStock === 0 && currentStock !== 0 ? '' : realStock}
                                        onChange={(e) => setRealStock(Number(e.target.value) || 0)}
                                        disabled={isLoading}
                                        autoFocus
                                    />
                                    <span className="absolute right-4 top-4 text-xs font-bold text-slate-400">
                                        {ingredient.unit}
                                    </span>
                                </div>
                            </div>

                            {/* Status Selisih Hitungan */}
                            <div className="pt-1">
                                {stockDiff < 0 ? (
                                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs flex items-start gap-2.5">
                                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-extrabold text-rose-900">
                                                Selisih Kurang: {formatNumber(Math.abs(stockDiff))} {ingredient.unit}
                                            </span>
                                            <p className="text-[11px] text-rose-700 mt-0.5">
                                                Stok aplikasi akan berkurang sebesar {formatNumber(Math.abs(stockDiff))} {ingredient.unit} (Nilai susut: Rp {formatNumber(financialDiff)}).
                                            </p>
                                        </div>
                                    </div>
                                ) : stockDiff > 0 ? (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs flex items-start gap-2.5">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-extrabold text-emerald-900">
                                                Selisih Lebih: +{formatNumber(stockDiff)} {ingredient.unit}
                                            </span>
                                            <p className="text-[11px] text-emerald-700 mt-0.5">
                                                Stok aplikasi akan bertambah sebesar {formatNumber(stockDiff)} {ingredient.unit} (Nilai koreksi: Rp {formatNumber(financialDiff)}).
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-xs text-blue-800 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                                        <span>Stok fisik cocok sempurna dengan data aplikasi.</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Alasan Audit */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 block">Alasan Penyesuaian Audit:</label>
                            <select
                                value={auditReason}
                                onChange={(e) => setAuditReason(e.target.value)}
                                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-700"
                            >
                                {AUDIT_REASONS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        {/* Catatan Tambahan */}
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Catatan Tambahan (Opsional):</label>
                            <Input
                                type="text"
                                placeholder="Cth: Hasil timbang toples barista shift pagi"
                                className="text-xs h-9 rounded-xl"
                                value={customNotes}
                                onChange={(e) => setCustomNotes(e.target.value)}
                            />
                        </div>
                    </div>
                ) : (
                    /* MODE MANUAL STOK MASUK / KELUAR */
                    <div className="space-y-4 animate-in fade-in duration-200">
                        {/* Main Quantity Input */}
                        <div className="space-y-2 text-center">
                            <label 
                                htmlFor="stock-qty"
                                className="text-xs font-bold uppercase tracking-widest text-slate-400"
                            >
                                Jumlah {activeMode === 'IN' ? 'Stok Masuk' : 'Stok Keluar'} ({ingredient.unit})
                            </label>
                            <div className="relative">
                                <Input
                                    id="stock-qty"
                                    type="number"
                                    placeholder="0"
                                    className="h-16 text-3xl font-black text-center rounded-2xl bg-slate-50 focus:bg-white transition-colors border-2 focus:border-primary"
                                    value={qty || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQty(Number(e.target.value) || 0)}
                                    disabled={isLoading}
                                    min="0.01"
                                    step="any"
                                    autoFocus
                                />
                                <span className="absolute right-4 top-5 text-sm font-bold text-slate-400">
                                    {ingredient.unit}
                                </span>
                            </div>
                        </div>

                        {activeMode === 'IN' && (
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
                                        <strong>Catat sebagai Pengeluaran Kedai</strong><br />
                                        <span className="text-blue-700 opacity-80">
                                            Total biaya tercatat di Buku Kas: Rp {formatNumber(totalExpense)}
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
                                            if (e.target.checked) setPrice(ingredient.cost_per_unit);
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
                    </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex gap-3">
                    <Button 
                        variant="outline" 
                        className="flex-1 h-12 rounded-xl text-xs font-bold" 
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Batal
                    </Button>
                    <Button
                        className={`flex-1 h-12 rounded-xl font-bold text-xs text-white shadow-lg transition-transform active:scale-95 ${
                            activeMode === 'AUDIT'
                                ? 'bg-[#4B3621] hover:bg-[#3D2C1B] shadow-amber-900/20'
                                : activeMode === 'IN'
                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                        }`}
                        onClick={handleConfirm}
                        disabled={isLoading || (activeMode !== 'AUDIT' && qty <= 0)}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin h-5 w-5" />
                                <span>Memproses...</span>
                            </div>
                        ) : activeMode === 'AUDIT' ? (
                            "Cocokkan & Update Stok"
                        ) : (
                            "Konfirmasi Transaksi"
                        )}
                    </Button>
                </div>

                {/* Helper Tooltip */}
                <div className="flex items-center gap-2 text-[10px] text-slate-400 justify-center">
                    <Info size={12} />
                    <span>
                        {activeMode === 'AUDIT'
                            ? "Hasil audit stok fisik akan tercatat permanen di riwayat mutasi"
                            : "Transaksi ini akan tercatat permanen di Riwayat Mutasi"}
                    </span>
                </div>
            </div>
        </Dialog>
    );
};
