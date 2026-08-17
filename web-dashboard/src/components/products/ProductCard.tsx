import { Badge } from "../ui/badge"
import { Edit2, Trash2 } from 'lucide-react'
import { getImageUrl, formatNumber } from '../../lib/utils'

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

interface RecipeItem {
    ingredient_id: number;
    quantity: number;
    ingredient?: Ingredient;
}

interface Product {
    id: number;
    name: string;
    category: string;
    price: number;
    cost: number;
    stock: number;
    sku: string;
    description: string;
    image_url: string;
    recipe: RecipeItem[];
}

interface ProductCardProps {
    product: Product;
    onEdit: (product: Product) => void;
    onDelete: (id: number) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
    return (
        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col group hover:scale-[1.02] transition-all duration-300">
            <div className="h-40 relative">
                <img 
                    src={getImageUrl(product.image_url) || 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=400'} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                <div className="absolute top-3 right-3 flex gap-1">
                    <button onClick={() => onEdit(product)} className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-blue-600 shadow-lg hover:bg-blue-600 hover:text-white transition-colors">
                        <Edit2 size={14} />
                    </button>
                    <button onClick={() => onDelete(product.id)} className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-red-600 shadow-lg hover:bg-red-600 hover:text-white transition-colors">
                        <Trash2 size={14} />
                    </button>
                </div>
                <div className="absolute bottom-3 left-3">
                    <Badge className="bg-primary/90 backdrop-blur-sm text-[8px] font-black uppercase tracking-widest border-none">
                        {product.category}
                    </Badge>
                </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-gray-900 leading-tight mb-3">{product.name}</h3>
                
                <div className="space-y-2 mt-auto">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-bold uppercase tracking-tighter text-[9px]">Harga Jual</span>
                        <span className="font-black text-gray-900">Rp {formatNumber(product.price)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-bold uppercase tracking-tighter text-[9px]">Modal (HPP)</span>
                        <span className="font-bold text-blue-600">Rp {formatNumber(product.cost)}</span>
                    </div>
                    <div className="pt-2 border-t flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-primary tracking-widest">Profit</span>
                        <span className="text-sm font-black text-emerald-600">Rp {formatNumber(product.price - product.cost)}</span>
                    </div>
                </div>
                
                {product.recipe && product.recipe.length > 0 && (
                    <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-50">
                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">Komposisi</p>
                        <p className="text-[10px] text-gray-500 italic line-clamp-1">
                            {product.recipe?.map(r => r.ingredient?.name).join(', ')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}