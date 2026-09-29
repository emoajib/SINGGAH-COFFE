import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { ArrowUpCircle, ArrowDownCircle, ArrowLeftRight, History, Edit2, Trash2, Tag, ShoppingBag, Scale, Warehouse, Coffee } from 'lucide-react'
import { formatNumber } from '../../lib/utils'

// Vetted by AI - Manual Review Required by Senior Engineer/Manager

interface Ingredient {
    id: number;
    name: string;
    category: string;
    unit: string;
    purchase_unit: string;
    purchase_unit_size: number;
    current_stock: number;
    warehouse_stock: number;
    kedai_stock: number;
    min_stock: number;
    cost_per_unit: number;
}

interface IngredientsTableProps {
    ingredients: Ingredient[];
    onEdit: (ing: Ingredient) => void;
    onDelete: (id: number) => void;
    onRestock: (ing: Ingredient, type: 'IN' | 'OUT' | 'AUDIT') => void;
    onTransfer: (ing: Ingredient) => void;
    onHistory: (ing: Ingredient) => void;
}

// Vetted by AI - Manual Review Required by Senior Engineer/Manager
/**
 * Normalisasi cerdas kemasan beli agar terhindar dari anomali data
 * Contoh: 1 kg = 1.000 gram, 1 sak/bal = 5.000+ gram, 1 pack = 300 gram, 1 liter = 1.000 ml
 */
export function getDisplayPurchaseUnit(ing: Ingredient): string {
    const pUnit = (ing.purchase_unit || '').trim().toLowerCase();
    const uUnit = (ing.unit || '').trim().toLowerCase();
    const size = ing.purchase_unit_size > 0 ? ing.purchase_unit_size : (uUnit === 'gram' || uUnit === 'ml' ? 1000 : 1);

    // Kasus anomali data: user input unit kemasan yang tidak sesuai ukuran metrik standar
    // Misal: garam 300g tapi purchase_unit diisi 'kg', atau sirup 250ml tapi purchase_unit diisi 'liter'
    if (pUnit === 'kg' && size !== 1000 && uUnit === 'gram') {
        return size >= 5000 ? 'sak/bal' : 'pack';
    }
    if (pUnit === 'liter' && size !== 1000 && uUnit === 'ml') {
        return size >= 5000 ? 'jeriken' : 'botol';
    }

    // Jika user menentukan kemasan khusus (misal 'pack', 'botol', 'dus', 'sak/bal', 'jar', 'pouch', 'sachet')
    if (pUnit && pUnit !== uUnit && pUnit !== 'custom') {
        return pUnit;
    }

    // Kasus purchase unit kosong atau sama persis dengan satuan pakai (misal unit: gram, purchase_unit: gram)
    if (uUnit === 'gram') {
        if (size === 1000) return 'kg';
        if (size >= 5000) return 'sak/bal';
        if (size > 1) return 'pack';
        return 'gram';
    }

    if (uUnit === 'ml') {
        if (size === 1000) return 'liter';
        if (size >= 5000) return 'jeriken';
        if (size > 1) return 'botol';
        return 'ml';
    }

    if (uUnit === 'pcs' || uUnit === 'lembar' || uUnit === 'sachet') {
        if (size >= 500) return 'dus';
        if (size > 1) return 'pack';
        return uUnit;
    }

    return pUnit || uUnit;
}

export function IngredientsTable({ ingredients, onEdit, onDelete, onRestock, onTransfer, onHistory }: IngredientsTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/50 text-gray-500 uppercase text-[10px] font-bold tracking-widest border-b">
                    <tr>
                        <th className="px-6 py-4">Bahan Baku</th>
                        <th className="px-6 py-4">Kategori & Kemasan</th>
                        <th className="px-6 py-4 text-center">Stok Saat Ini (Kedai & Gudang)</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Biaya Satuan</th>
                        <th className="px-6 py-4 text-center">Aksi Pengelolaan</th>
                    </tr>
                </thead>
                <tbody>
                    {ingredients.map((ing) => {
                        const purchaseUnit = getDisplayPurchaseUnit(ing);
                        const unitSize = ing.purchase_unit_size > 0 ? ing.purchase_unit_size : (ing.unit === 'gram' || ing.unit === 'ml' ? 1000 : 1);
                        const costPerPurchaseUnit = ing.cost_per_unit * unitSize;

                        return (
                            <tr key={ing.id} className="border-b hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{ing.name}</div>
                                    <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                        <span className="font-medium">Satuan Pakai:</span>
                                        <span className="font-semibold text-gray-700">{ing.unit}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1 items-start">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                                            <Tag size={10} />
                                            {ing.category || 'Belum Ditentukan'}
                                        </span>
                                        <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                            <ShoppingBag size={10} className="text-gray-400" />
                                            1 {purchaseUnit} = {formatNumber(unitSize)} {ing.unit}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {/* Bar / Kedai Operational Stock (Primary Focus) */}
                                    <div className="flex flex-col items-center">
                                        <div className="flex items-center gap-1.5">
                                            <Coffee size={14} className="text-amber-600 shrink-0" />
                                            <span className={`text-lg font-black tracking-tight ${ing.kedai_stock <= ing.min_stock ? 'text-amber-600' : 'text-gray-900'}`}>
                                                {formatNumber(ing.kedai_stock)}
                                            </span>
                                            <span className="text-xs text-gray-500 font-bold">{ing.unit}</span>
                                        </div>
                                        <div className="text-[10px] font-semibold text-amber-850 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 mt-0.5">
                                            ☕ Stok Siap Pakai di Kedai
                                        </div>
                                    </div>

                                    {/* Secondary breakdown: Warehouse & Total */}
                                    <div className="flex items-center justify-center gap-3 mt-2 text-[11px] text-gray-500 border-t border-gray-100 pt-1.5">
                                        <span className="inline-flex items-center gap-1 font-medium" title="Stok di Gudang Penyimpanan">
                                            <Warehouse size={11} className="text-indigo-600" />
                                            <span className="text-gray-400">Gudang:</span>
                                            <strong className="text-indigo-900 font-bold">{formatNumber(ing.warehouse_stock)}</strong>
                                        </span>
                                        <span className="text-gray-300">|</span>
                                        <span className="inline-flex items-center gap-1 font-medium" title="Total Seluruh Stok (Kedai + Gudang)">
                                            <span className="text-gray-400">Total:</span>
                                            <strong className="text-gray-800 font-bold">{formatNumber(ing.current_stock)}</strong>
                                            {unitSize > 1 && (
                                                <span className="text-[10px] text-gray-400 font-normal">
                                                    (≈ {(ing.current_stock / unitSize).toFixed(1)} {purchaseUnit})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {ing.current_stock <= ing.min_stock ? (
                                        <Badge variant="destructive" className="capitalize flex items-center gap-1 w-fit">
                                            Stok Kritis
                                        </Badge>
                                    ) : ing.kedai_stock <= ing.min_stock ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                                            Perlu Transfer Bar
                                        </span>
                                    ) : (
                                        <Badge variant="success" className="capitalize flex items-center gap-1 w-fit">
                                            Stok Aman
                                        </Badge>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="font-bold text-primary">
                                        Rp {formatNumber(ing.cost_per_unit)} <span className="text-[10px] text-gray-400 font-normal">/{ing.unit}</span>
                                    </div>
                                    {unitSize > 1 && (
                                        <div className="text-[10px] text-gray-500 font-medium">
                                            Rp {formatNumber(costPerPurchaseUnit)}/{purchaseUnit}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center gap-1.5">
                                        {/* Tombol Audit Stok / Stock Opname */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 rounded-full border-amber-300 bg-amber-50 text-amber-800 hover:bg-[#4B3621] hover:text-amber-200 transition-all shadow-xs"
                                            onClick={() => onRestock(ing, 'AUDIT')}
                                            title="Audit Fisik / Stock Opname (Cocokkan Stok Nyata)"
                                        >
                                            <Scale className="h-4 w-4" />
                                        </Button>

                                        {/* Tombol Transfer Gudang ↔ Kedai */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 rounded-full border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white transition-all shadow-xs"
                                            onClick={() => onTransfer(ing)}
                                            title="Transfer Stok Gudang ↔ Kedai"
                                        >
                                            <ArrowLeftRight className="h-4 w-4" />
                                        </Button>

                                        {/* Tombol Stok Masuk */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 rounded-full border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-xs"
                                            onClick={() => onRestock(ing, 'IN')}
                                            title="Stok Masuk / Pembelian"
                                        >
                                            <ArrowUpCircle className="h-4 w-4" />
                                        </Button>

                                        {/* Tombol Stok Keluar */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 rounded-full border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all shadow-xs"
                                            onClick={() => onRestock(ing, 'OUT')}
                                            title="Stok Keluar / Limbah"
                                        >
                                            <ArrowDownCircle className="h-4 w-4" />
                                        </Button>

                                        {/* Tombol Riwayat Mutasi */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 rounded-full border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-xs"
                                            onClick={() => onHistory(ing)}
                                            title="Riwayat Mutasi Stok"
                                        >
                                            <History className="h-4 w-4" />
                                        </Button>

                                        <div className="w-px h-8 bg-gray-200 mx-0.5" />

                                        {/* Edit Spesifikasi */}
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50" onClick={() => onEdit(ing)} title="Edit Bahan">
                                            <Edit2 className="h-4 w-4" />
                                        </Button>

                                        {/* Hapus Bahan */}
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50" onClick={() => onDelete(ing.id)} title="Hapus Bahan">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}