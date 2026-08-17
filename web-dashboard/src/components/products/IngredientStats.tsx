import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Package, AlertTriangle } from 'lucide-react'

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

interface IngredientStatsProps {
    ingredients: Ingredient[];
}

export function IngredientStats({ ingredients }: IngredientStatsProps) {
    const criticalCount = ingredients.filter(i => i.current_stock <= i.min_stock).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-xl bg-gray-900 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-60">Total Master Bahan</CardTitle>
                    <Package className="w-5 h-5 opacity-40" />
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-4xl font-black tracking-tighter">{ingredients.length}</div>
                    <p className="text-[10px] opacity-40 mt-1 uppercase tracking-[0.2em] font-bold">Item Terdaftar</p>
                </CardContent>
            </Card>
            <Card className={`border-none shadow-xl relative overflow-hidden group ${criticalCount > 0 ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-90">Kesehatan Inventaris</CardTitle>
                    <AlertTriangle className="w-5 h-5 opacity-70" />
                </CardHeader>
                <CardContent className="relative z-10">
                    <div className="text-4xl font-black tracking-tighter">{criticalCount}</div>
                    <p className="text-[10px] opacity-70 mt-1 uppercase tracking-[0.2em] font-bold">Item Stok Kritis</p>
                </CardContent>
            </Card>
        </div>
    );
}