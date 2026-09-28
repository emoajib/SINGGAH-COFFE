import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { ArrowUpCircle, ArrowDownCircle, History, Edit2, Trash2, Tag, ShoppingBag, Scale } from 'lucide-react'
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
    min_stock: number;
    cost_per_unit: number;
}

interface IngredientsTableProps {
    ingredients: Ingredient[];
    onEdit: (ing: Ingredient) => void;
    onDelete: (id: number) => void;
    onRestock: (ing: Ingredient, type: 'IN' | 'OUT' | 'AUDIT') => void;
    onHistory: (ing: Ingredient) => void;
}

/**
 * Normalisasi cerdas kemasan beli agar terhindar dari anomali data (misal: 1 ml = 1.000 ml atau 1 gram = 1.000 gram)
 */
export function getDisplayPurchaseUnit(ing: Ingredient): string {
    const pUnit = (ing.purchase_unit || '').trim().toLowerCase();
    const uUnit = (ing.unit || '').trim().toLowerCase();
    const size = ing.purchase_unit_size > 0 ? ing.purchase_unit_size : (uUnit === 'gram' || uUnit === 'ml' ? 1000 : 1);

    // Kasus anomali: purchase unit sama persis dengan unit dasar tapi size > 1
    if (!pUnit || pUnit === uUnit) {
        if (uUnit === 'gram') {
            return size >= 5000 ? 'sak/bal' : 'kg';
        }
        if (uUnit === 'ml') {
            return 'liter';
        }
        if (uUnit === 'pcs') {
            return size > 1 ? 'pack' : 'pcs';
        }
        return pUnit || uUnit;
    }

    // Kasus anomali: cup/sedotan unit pcs tapi purchase_unit diisi kg
    if (uUnit === 'pcs' && (pUnit === 'kg' || pUnit === 'gram')) {
        return size >= 500 ? 'dus' : 'pack';
    }

    return pUnit;
}

export function IngredientsTable({ ingredients, onEdit, onDelete, onRestock, onHistory }: IngredientsTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50/50 text-gray-500 uppercase text-[10px] font-bold tracking-widest border-b">
                    <tr>
                        <th className="px-6 py-4">Bahan Baku</th>
                        <th className="px-6 py-4">Kategori & Kemasan</th>
                        <th className="px-6 py-4 text-center">Stok Saat Ini</th>
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
                                    <span className={`text-lg font-black ${ing.current_stock <= ing.min_stock ? 'text-red-600' : 'text-gray-900'}`}>
                                        {formatNumber(ing.current_stock)}
                                    </span>
                                    <span className="text-[10px] text-gray-400 ml-1 font-bold">{ing.unit}</span>
                                    {unitSize > 1 && (
                                        <div className="text-[10px] text-gray-400 font-medium">
                                            ≈ {(ing.current_stock / unitSize).toFixed(1)} {purchaseUnit}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <Badge variant={ing.current_stock > ing.min_stock ? 'success' : 'destructive'} className="capitalize">
                                        {ing.current_stock > ing.min_stock ? 'Stok Aman' : 'Stok Kritis'}
                                    </Badge>
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