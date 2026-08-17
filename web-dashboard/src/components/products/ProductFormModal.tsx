import { useState, useEffect } from 'react';
import { Plus, X, Trash2, ImagePlus } from 'lucide-react';
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import api from '../../lib/api'
import { getImageUrl, formatNumber, compressImage } from '../../lib/utils'

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

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editingProduct: Product | null;
    ingredients: Ingredient[];
    allCategories: string[];
}

export function ProductFormModal({ isOpen, onClose, onSaved, editingProduct, ingredients, allCategories }: ProductFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        price: 0,
        stock: 0,
        sku: '',
        description: '',
        image_url: '',
        recipe: [] as RecipeItem[],
    });

    useEffect(() => {
        if (editingProduct) {
            setFormData({
                name: editingProduct.name,
                category: editingProduct.category,
                price: editingProduct.price,
                stock: editingProduct.stock,
                sku: editingProduct.sku,
                description: editingProduct.description,
                image_url: editingProduct.image_url,
                recipe: editingProduct.recipe || [],
            });
        } else {
            setFormData({
                name: '', category: '', price: 0, stock: 0,
                sku: '', description: '', image_url: '', recipe: [],
            });
        }
    }, [editingProduct, isOpen]);

    const calculateCost = (recipe: RecipeItem[]): number => {
        return recipe.reduce((total, item) => {
            const ingredient = ingredients.find((ing) => ing.id === item.ingredient_id);
            if (ingredient) {
                return total + item.quantity * ingredient.cost_per_unit;
            }
            return total;
        }, 0);
    };

    const handleAddRecipeItem = () => {
        setFormData({
            ...formData,
            recipe: [...formData.recipe, { ingredient_id: 0, quantity: 0 }],
        });
    };

    const handleRemoveRecipeItem = (index: number) => {
        const newRecipe = formData.recipe.filter((_, i) => i !== index);
        setFormData({ ...formData, recipe: newRecipe });
    };

    const handleRecipeChange = (index: number, field: 'ingredient_id' | 'quantity', value: number) => {
        const newRecipe = [...formData.recipe];
        if (field === 'ingredient_id') {
            newRecipe[index][field] = Number(value);
        } else {
            newRecipe[index][field] = value;
        }
        setFormData({ ...formData, recipe: newRecipe });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const compressedFile = await compressImage(file);
            const formDataUpload = new FormData();
            formDataUpload.append('image', compressedFile);

            const response = await api.post('/products/upload-image', formDataUpload);
            setFormData({ ...formData, image_url: response.data.url });
        } catch (error: any) {
            alert('Failed to upload image: ' + (error.response?.data?.error || error.message));
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, formData);
            } else {
                await api.post('/products', formData);
            }
            onSaved();
            onClose();
        } catch (error: any) {
            alert('Failed to save product: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const estimatedCost = calculateCost(formData.recipe);
    const estimatedProfit = formData.price - estimatedCost;
    const profitMargin = formData.price > 0 ? ((estimatedProfit / formData.price) * 100).toFixed(2) : '0';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-[2rem] max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">{editingProduct ? 'Edit Menu' : 'Tambah Menu Baru'}</h2>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all"><X size={20} /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="w-full h-56 bg-gray-50 border-4 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group" onClick={() => document.getElementById('img-up')?.click()}>
                                    {formData.image_url ? (
                                        <>
                                            <img src={getImageUrl(formData.image_url)} className="absolute w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold uppercase tracking-widest text-xs">Ganti Gambar</div>
                                        </>
                                    ) : (
                                        <div className="text-center text-gray-300 group-hover:text-primary transition-colors">
                                            <ImagePlus size={48} strokeWidth={1} className="mx-auto mb-2" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Unggah Foto Menu</span>
                                        </div>
                                    )}
                                    <input id="img-up" type="file" className="hidden" onChange={handleImageUpload} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Nama Menu</label>
                                    <Input className="h-12 rounded-2xl border-2 focus:border-primary" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Misal: Kopi Susu Gula Aren" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Kategori</label>
                                    <div className="relative">
                                        <Input 
                                            className="h-12 rounded-2xl border-2 focus:border-primary" 
                                            value={formData.category} 
                                            onChange={e => setFormData({ ...formData, category: e.target.value })} 
                                            placeholder="Ketik kategori baru..."
                                            required 
                                        />
                                        <div className="flex flex-wrap gap-1.5 mt-3 px-1">
                                            {allCategories.filter(c => c !== 'All').map(cat => (
                                                <button 
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, category: cat })}
                                                    className={`text-[9px] px-3 py-1.5 rounded-full border-2 transition-all font-black uppercase tracking-widest ${formData.category === cat ? 'bg-primary text-white border-primary shadow-lg scale-105' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Harga Jual (Rp)</label>
                                        <Input type="number" className="h-12 rounded-2xl border-2 focus:border-primary font-bold text-lg" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">SKU / Kode</label>
                                        <Input className="h-12 rounded-2xl border-2 focus:border-primary font-mono uppercase" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} required placeholder="KOPI-01" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Deskripsi Menu</label>
                                    <textarea className="w-full border-2 rounded-[1.5rem] px-4 py-3 h-32 focus:border-primary outline-none transition-all text-sm" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Jelaskan keunikan rasa menu ini..." />
                                </div>

                                <div className="p-4 bg-primary/5 rounded-[1.5rem] border-2 border-primary/10">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-black uppercase text-primary tracking-widest">HPP Terkalkulasi</span>
                                        <span className="text-lg font-black text-gray-900">Rp {formatNumber(estimatedCost)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase text-primary tracking-widest">Estimasi Profit</span>
                                        <span className={`text-lg font-black ${estimatedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Rp {formatNumber(estimatedProfit)} ({profitMargin}%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="border-t-2 border-dashed border-gray-100 pt-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight">Komposisi Resep</h3>
                                <button type="button" onClick={handleAddRecipeItem} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] flex items-center gap-2 font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">
                                    <Plus size={14} /> Tambah Bahan
                                </button>
                            </div>
                            <div className="space-y-3">
                                {formData.recipe.length === 0 ? (
                                    <div className="p-8 border-2 border-dashed border-gray-100 rounded-3xl text-center">
                                        <p className="text-xs font-bold text-gray-300 uppercase tracking-[0.2em]">Belum Ada Resep Terdaftar</p>
                                    </div>
                                ) : (
                                    formData.recipe.map((item, idx) => {
                                        const ing = ingredients.find(i => i.id === Number(item.ingredient_id));
                                        const itemCost = ing ? (ing.cost_per_unit * item.quantity) : 0;
                                        
                                        return (
                                            <div key={idx} className="flex gap-4 p-4 bg-gray-50/50 rounded-2xl border-2 border-transparent hover:border-blue-100 transition-all items-start animate-in fade-in slide-in-from-top-2">
                                                <div className="flex-1">
                                                    <select 
                                                        className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl px-4 text-xs font-bold focus:border-blue-400 outline-none transition-all" 
                                                        value={item.ingredient_id} 
                                                        onChange={e => handleRecipeChange(idx, 'ingredient_id', parseInt(e.target.value))} 
                                                        required
                                                    >
                                                        <option value={0}>Pilih Bahan Baku</option>
                                                        {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                                                    </select>
                                                    {ing && <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-2 ml-1">Market: Rp {formatNumber(ing.cost_per_unit)}/{ing.unit}</p>}
                                                </div>
                                                <div className="w-36">
                                                    <div className="relative">
                                                        <input 
                                                            type="number" 
                                                            step="0.01" 
                                                            className="w-full h-11 bg-white border-2 border-gray-100 rounded-xl px-4 text-xs font-black focus:border-blue-400 outline-none text-right transition-all" 
                                                            placeholder="QTY" 
                                                            value={item.quantity} 
                                                            onChange={e => handleRecipeChange(idx, 'quantity', parseFloat(e.target.value))} 
                                                            required 
                                                        />
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-gray-300 uppercase">{ing?.unit || 'UNIT'}</span>
                                                    </div>
                                                    {ing && <p className="text-[10px] text-blue-600 font-black mt-2 text-right">Rp {formatNumber(itemCost)}</p>}
                                                </div>
                                                <button type="button" onClick={() => handleRemoveRecipeItem(idx)} className="w-11 h-11 rounded-xl flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button type="button" variant="ghost" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-[0.2em] text-gray-400 hover:text-red-500" onClick={onClose}>Batal</Button>
                            <Button type="submit" className="flex-[2] h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20" disabled={loading}>{loading ? 'Memproses...' : editingProduct ? 'Simpan Perubahan' : 'Terbitkan Menu'}</Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}