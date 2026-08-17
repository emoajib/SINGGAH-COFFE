import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { ArrowUpCircle, ArrowDownCircle, History, Edit2, Trash2, Tag, ShoppingBag } from 'lucide-react'
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
    onRestock: (ing: Ingredient, type: 'IN' | 'OUT') => void;
    onHistory: (ing: Ingredient) => void;
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
                        const purchaseUnit = ing.purchase_unit || (ing.unit === 'gram' ? 'kg' : ing.unit === 'ml' ? 'liter' : 'pcs');
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
                                    <div className="flex justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 rounded-full border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                                            onClick={() => onRestock(ing, 'IN')}
                                            title="Stok Masuk / Pembelian"
                                        >
                                            <ArrowUpCircle className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 rounded-full border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                                            onClick={() => onRestock(ing, 'OUT')}
                                            title="Stok Keluar / Limbah"
                                        >
                                            <ArrowDownCircle className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 w-8 p-0 rounded-full border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                                            onClick={() => onHistory(ing)}
                                            title="Riwayat Mutasi Stok"
                                        >
                                            <History className="h-4 w-4" />
                                        </Button>
                                        <div className="w-px h-8 bg-gray-200 mx-1" />
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600" onClick={() => onEdit(ing)}>
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => onDelete(ing.id)}>
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