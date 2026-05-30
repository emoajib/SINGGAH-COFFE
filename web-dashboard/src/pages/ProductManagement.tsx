import React, { useState } from 'react';
import { Plus, Edit2, Trash2, X, ImagePlus, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Package, History, Info } from 'lucide-react';
import api from '../lib/api';
import { getImageUrl, formatNumber } from '../lib/utils';
import { Badge } from "../components/ui/badge"
import { Dialog } from "../components/ui/dialog"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { StockAdjustmentDialog } from '../components/inventory/StockAdjustmentDialog';
import { useProducts, useCreateProduct, useDeleteProduct } from '../hooks/useProducts'
import { useIngredients, useCreateIngredient, useDeleteIngredient, useCreateStockMutation } from '../hooks/useIngredients'
import { useQueryClient } from '@tanstack/react-query'

interface Ingredient {
    id: number;
    name: string;
    unit: string;
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

const ProductManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'products' | 'ingredients'>('ingredients');
    const [isIdModalOpen, setIsIdModalOpen] = useState(false); // For Ingredient Modal
    const [isModalOpen, setIsModalOpen] = useState(false); // For Product Modal
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [loading, setLoading] = useState(false);

    // Stock Adjustment States
    const [restockModal, setRestockModal] = useState({ isOpen: false, itemId: 0, type: 'IN' as 'IN' | 'OUT' });
    const [historyModal, setHistoryModal] = useState({ isOpen: false, ingredient: null as Ingredient | null, history: [] as any[] });

    // Form Data for Product
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

    // Form Data for Ingredient
    const [ingData, setIngData] = useState({
        name: '',
        unit: 'gram',
        cost_per_unit: 0 as number | string,
        min_stock: 0 as number | string,
    });

    // React Query hooks
    const productsQuery = useProducts();
    const ingredientsQuery = useIngredients();
    const products = (productsQuery.data ?? []) as unknown as Product[];
    const ingredients = (ingredientsQuery.data ?? []) as unknown as Ingredient[];
    const createProduct = useCreateProduct();
    const deleteProduct = useDeleteProduct();
    const createIngredient = useCreateIngredient();
    const deleteIngredient = useDeleteIngredient();
    const createStockMutation = useCreateStockMutation();
    const queryClient = useQueryClient();

    const handleSaveIngredient = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...ingData,
                cost_per_unit: Number(ingData.cost_per_unit),
                min_stock: Number(ingData.min_stock)
            };

            if (editingIngredient) {
                await api.put(`/ingredients/${editingIngredient.id}`, payload);
            } else {
                await createIngredient.mutateAsync(payload as any);
            }
            queryClient.invalidateQueries({ queryKey: ['ingredients'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            setIsIdModalOpen(false);
            setEditingIngredient(null);
        } catch (error) {
            alert('Gagal menyimpan bahan');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteIngredient = async (id: number) => {
        if (!confirm('Hapus bahan ini? Tindakan ini akan menghapus semua penggunaan bahan ini di resep produk.')) return;
        try {
            await deleteIngredient.mutateAsync(id);
        } catch (error) {
            alert('Gagal menghapus bahan');
        }
    };

    const calculateCost = (recipe: RecipeItem[]): number => {
        return recipe.reduce((total, item) => {
            const ingredient = ingredients.find((ing) => ing.id === item.ingredient_id);
            if (ingredient) {
                return total + item.quantity * ingredient.cost_per_unit;
            }
            return total;
        }, 0);
    };

    const handleOpenModal = (product?: Product) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                category: product.category,
                price: product.price,
                stock: product.stock,
                sku: product.sku,
                description: product.description,
                image_url: product.image_url,
                recipe: product.recipe || [],
            });
        } else {
            setEditingProduct(null);
            setFormData({
                name: '',
                category: '',
                price: 0,
                stock: 0,
                sku: '',
                description: '',
                image_url: '',
                recipe: [],
            });
        }
        setIsModalOpen(true);
    };

    const handleOpenIngModal = (ing?: Ingredient) => {
        if (ing) {
            setEditingIngredient(ing);
            setIngData({
                name: ing.name,
                unit: ing.unit,
                cost_per_unit: ing.cost_per_unit,
                min_stock: ing.min_stock,
            });
        } else {
            setEditingIngredient(null);
            setIngData({ name: '', unit: 'gram', cost_per_unit: 0, min_stock: 0 });
        }
        setIsIdModalOpen(true);
    };

    const handleOpenRestock = (ing: Ingredient, type: 'IN' | 'OUT') => {
        setRestockModal({ isOpen: true, itemId: ing.id, type });
    };

    const handleOpenHistory = async (ing: Ingredient) => {
        setLoading(true);
        try {
            const data = await queryClient.fetchQuery({
                queryKey: ['stock-mutations', ing.id],
                queryFn: () => api.get(`/ingredients/${ing.id}/history`).then(r => r.data),
            });
            setHistoryModal({ isOpen: true, ingredient: ing, history: data as any[] });
        } catch (error) {
            alert('Gagal mengambil riwayat stok');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, formData);
            } else {
                await createProduct.mutateAsync(formData as any);
            }
            queryClient.invalidateQueries({ queryKey: ['products'] });
            handleCloseModal();
        } catch (error: any) {
            alert('Failed to save product: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await deleteProduct.mutateAsync(id);
        } catch (error) {
            alert('Failed to delete product');
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formDataUpload = new FormData();
        formDataUpload.append('image', file);

        try {
            const response = await api.post('/products/upload-image', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setFormData({ ...formData, image_url: response.data.url });
        } catch (error) {
            alert('Failed to upload image');
        }
    };

    const estimatedCost = calculateCost(formData.recipe);
    const estimatedProfit = formData.price - estimatedCost;
    const profitMargin = formData.price > 0 ? ((estimatedProfit / formData.price) * 100).toFixed(2) : '0';

    return (
        <div className="p-6">
            <div className="flex flex-col mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Manajemen Produksi</h1>
                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab('ingredients')}
                        className={`px-6 py-2 font-medium ${activeTab === 'ingredients' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Master Bahan & Harga
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`px-6 py-2 font-medium ${activeTab === 'products' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Resep Produk & Profitabilitas
                    </button>
                </div>
            </div>

            {activeTab === 'ingredients' ? (
                <div className="space-y-6">
                    {/* Stats Cards for Ingredients */}
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
                        <Card className={`border-none shadow-xl relative overflow-hidden group ${ingredients.filter(i => i.current_stock <= i.min_stock).length > 0 ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                                <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-90">Kesehatan Inventaris</CardTitle>
                                <AlertTriangle className="w-5 h-5 opacity-70" />
                            </CardHeader>
                            <CardContent className="relative z-10">
                                <div className="text-4xl font-black tracking-tighter">{ingredients.filter(i => i.current_stock <= i.min_stock).length}</div>
                                <p className="text-[10px] opacity-70 mt-1 uppercase tracking-[0.2em] font-bold">Item Stok Kritis</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">Inventaris Bahan Baku</h2>
                        <Button onClick={() => handleOpenIngModal()} className="bg-primary hover:bg-primary/90">
                            <Plus className="mr-2 h-4 w-4" /> Tambah Bahan Baru
                        </Button>
                    </div>

                    <Card className="border-none shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50/50 text-gray-500 uppercase text-[10px] font-bold tracking-widest border-b">
                                    <tr>
                                        <th className="px-6 py-4">Bahan</th>
                                        <th className="px-6 py-4 text-center">Stok Saat Ini</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Biaya/Unit</th>
                                        <th className="px-6 py-4 text-center">Aksi Pengelolaan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ingredients.map((ing) => (
                                        <tr key={ing.id} className="border-b hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{ing.name}</div>
                                                <div className="text-[10px] text-gray-400 font-medium">Logistik / {ing.unit}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-lg font-black ${ing.current_stock <= ing.min_stock ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {formatNumber(ing.current_stock)}
                                                </span>
                                                <span className="text-[10px] text-gray-400 ml-1 font-bold">{ing.unit}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant={ing.current_stock > ing.min_stock ? 'success' : 'destructive'} className="capitalize">
                                                    {ing.current_stock > ing.min_stock ? 'Stok Aman' : 'Stok Kritis'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-primary">
                                                Rp {formatNumber(ing.cost_per_unit)}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 p-0 rounded-full border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                                                        onClick={() => handleOpenRestock(ing, 'IN')}
                                                        title="Stok Masuk / Pembelian"
                                                    >
                                                        <ArrowUpCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 p-0 rounded-full border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white"
                                                        onClick={() => handleOpenRestock(ing, 'OUT')}
                                                        title="Stok Keluar / Limbah"
                                                    >
                                                        <ArrowDownCircle className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-8 p-0 rounded-full border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                                                        onClick={() => handleOpenHistory(ing)}
                                                        title="Riwayat Mutasi Stok"
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </Button>
                                                    <div className="w-px h-8 bg-gray-200 mx-1" />
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600" onClick={() => handleOpenIngModal(ing)}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600" onClick={() => handleDeleteIngredient(ing.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    {/* Important Info Box */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4">
                        <AlertTriangle className="text-amber-600 shrink-0" size={24} />
                        <div>
                            <h4 className="text-sm font-bold text-amber-900">Integrasi Pengeluaran</h4>
                            <p className="text-xs text-amber-800 leading-relaxed">
                                Saat melakukan <strong>Stok Masuk</strong>, Anda dapat mencentang opsi pembelian untuk secara otomatis membuat catatan di halaman <strong>Pengeluaran</strong>.
                                Sistem akan menghitung total biaya berdasarkan (Jumlah Baru × Biaya per Satuan) yang terdaftar.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">Resep Produk</h2>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
                        >
                            <Plus size={20} /> Tambah Produk
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map((product) => (
                            <div key={product.id} className="bg-white rounded-lg shadow-md border overflow-hidden flex flex-col">
                                {product.image_url && (
                                    <div className="h-40 bg-gray-100"><img src={getImageUrl(product.image_url)} className="w-full h-full object-cover" /></div>
                                )}
                                <div className="p-4 flex-1">
                                    <div className="flex justify-between mb-2">
                                        <div><h3 className="font-bold">{product.name}</h3><p className="text-xs text-gray-500">{product.category}</p></div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleOpenModal(product)} className="text-blue-600"><Edit2 size={16} /></button>
                                            <button onClick={() => handleDelete(product.id)} className="text-red-600"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                    <div className="space-y-1 text-xs border-t pt-2">
                                        <div className="flex justify-between"><span>Harga Jual:</span><span className="font-bold">Rp {formatNumber(product.price)}</span></div>
                                        <div className="flex justify-between"><span>Modal (HPP):</span><span className="font-bold text-blue-600">Rp {formatNumber(product.cost)}</span></div>
                                        <div className="flex justify-between border-t mt-1 pt-1 font-semibold"><span>Profit:</span><span className="text-green-600">Rp {formatNumber(product.price - product.cost)}</span></div>
                                    </div>
                                    {product.recipe && product.recipe.length > 0 && (
                                        <div className="mt-2 text-[10px] text-gray-400">Resep: {product.recipe?.map(r => r.ingredient?.name).join(', ') || 'N/A'}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Ingredient Modal */}
            <Dialog
                isOpen={isIdModalOpen}
                onClose={() => setIsIdModalOpen(false)}
                title={editingIngredient ? 'Edit Spesifikasi Bahan' : 'Daftar Bahan Baru'}
            >
                <form onSubmit={handleSaveIngredient} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Nama Bahan</label>
                        <Input value={ingData.name} onChange={e => setIngData({ ...ingData, name: e.target.value })} required placeholder="Contoh: Susu Full Cream" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Satuan</label>
                            <Input value={ingData.unit} onChange={e => setIngData({ ...ingData, unit: e.target.value })} placeholder="gram / ml / pcs" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Stok Minim</label>
                            <Input type="number" value={ingData.min_stock} onChange={e => setIngData({ ...ingData, min_stock: e.target.value })} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Biaya per Satuan (Rp)</label>
                        <Input type="number" step="any" value={ingData.cost_per_unit} onChange={e => setIngData({ ...ingData, cost_per_unit: Number(e.target.value) })} required />
                        <div className="flex items-start gap-2 p-2 bg-blue-50 text-blue-700 rounded-md text-[10px] mt-1">
                            <Info size={12} className="mt-0.5" />
                            <p>
                                <strong>PENTING:</strong> Masukkan harga sesuai satuan terkecil (gram/ml).
                                <br />Contoh: Jika beli Gula seharga Rp 15.000/kg, maka input <strong>15</strong> (karena 15.000 / 1000gr = 15).
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={() => setIsIdModalOpen(false)}>Batal</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Bahan'}</Button>
                    </div>
                </form>
            </Dialog>

            {/* Stock Adjustment Modal */}
            <StockAdjustmentDialog
                isOpen={restockModal.isOpen}
                onClose={() => setRestockModal({ ...restockModal, isOpen: false })}
                ingredient={ingredients.find(i => i.id === restockModal.itemId) || null}
                type={restockModal.type}
                isLoading={loading}
                onConfirm={async (data) => {
                    setLoading(true);
                    try {
                        await createStockMutation.mutateAsync({
                            ingredient_id: restockModal.itemId,
                            type: restockModal.type,
                            quantity: data.qty,
                            notes: restockModal.type === 'IN' ? (data.isPurchase ? "Pembelian Bahan" : "Koreksi Stok Masuk") : "Koreksi Stok Keluar/Limbah",
                            is_purchase: data.isPurchase,
                            update_master_price: data.updateMasterPrice,
                            new_cost_per_unit: data.newPrice
                        });
                        setRestockModal({ ...restockModal, isOpen: false });
                        queryClient.invalidateQueries({ queryKey: ['products'] });
                    } catch (error) {
                        alert('Gagal memperbarui stok');
                    } finally {
                        setLoading(false);
                    }
                }}
            />

            {/* History Modal */}
            <Dialog
                isOpen={historyModal.isOpen}
                onClose={() => setHistoryModal({ ...historyModal, isOpen: false })}
                title={`Riwayat Mutasi: ${historyModal.ingredient?.name || ''}`}
            >
                <div className="max-h-[60vh] overflow-y-auto">
                    {historyModal.history.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm">Belum ada riwayat mutasi</div>
                    ) : (
                        <div className="space-y-4">
                            {historyModal.history.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start border-b pb-3 last:border-0">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={item.type === 'IN' || item.type === 'ADJ_ADD' ? 'success' : 'destructive'} className="text-[10px] h-5">
                                                {item.type === 'IN' ? 'MASUK' : item.type === 'OUT' ? 'KELUAR' : item.type}
                                            </Badge>
                                            <span className="font-bold text-sm">
                                                {item.type === 'IN' || item.type === 'ADJ_ADD' ? '+' : '-'}{formatNumber(Number(item.quantity))} {historyModal.ingredient?.unit}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{item.notes || '-'}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">Ref: {item.reference_id || 'N/A'}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400">{new Date(item.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={() => setHistoryModal({ ...historyModal, isOpen: false })}>Tutup</Button>
                </div>
            </Dialog>

            {/* Product Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">{editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}</h2>
                                <button onClick={handleCloseModal} className="text-gray-500"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="w-full h-40 bg-gray-50 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer overflow-hidden relative" onClick={() => document.getElementById('img-up')?.click()}>
                                            {formData.image_url ? <img src={getImageUrl(formData.image_url)} className="absolute w-full h-full object-cover" /> : <div className="text-center text-gray-400"><ImagePlus className="mx-auto mb-2" /><span className="text-xs">Unggah Gambar</span></div>}
                                            <input id="img-up" type="file" className="hidden" onChange={handleImageUpload} />
                                        </div>
                                        <div><label className="block text-sm font-semibold mb-1">Nama Produk</label><input className="w-full border rounded-lg px-3 py-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required /></div>
                                        <div><label className="block text-sm font-semibold mb-1">Kategori</label><input className="w-full border rounded-lg px-3 py-2" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} required /></div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-sm font-semibold mb-1">Harga (Rp)</label><input type="number" className="w-full border rounded-lg px-3 py-2" value={formData.price} onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })} required /></div>
                                            <div><label className="block text-sm font-semibold mb-1">SKU</label><input className="w-full border rounded-lg px-3 py-2" value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} required /></div>
                                        </div>
                                        <div><label className="block text-sm font-semibold mb-1">Deskripsi</label><textarea className="w-full border rounded-lg px-3 py-2 h-24" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                                    </div>
                                </div>
                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold">Komposisi Resep</h3><button type="button" onClick={handleAddRecipeItem} className="text-blue-600 text-sm flex items-center gap-1 font-semibold"><Plus size={16} /> Tambah Bahan Ke Resep</button></div>
                                    <div className="space-y-4">
                                        {formData.recipe.map((item, idx) => {
                                            // Find the latest ingredient data from state to get the cost
                                            const ing = ingredients.find(i => i.id === Number(item.ingredient_id));
                                            const itemCost = ing ? (ing.cost_per_unit * item.quantity) : 0;
                                            
                                            return (
                                                <div key={idx} className="flex gap-3 animate-in fade-in items-start">
                                                    <div className="flex-1">
                                                        <select 
                                                            className="w-full border rounded-lg px-3 py-2 text-sm" 
                                                            value={item.ingredient_id} 
                                                            onChange={e => handleRecipeChange(idx, 'ingredient_id', parseInt(e.target.value))} 
                                                            required
                                                        >
                                                            <option value={0}>Pilih Bahan</option>
                                                            {ingredients.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                                                        </select>
                                                        {ing && <p className="text-[10px] text-gray-400 mt-1 ml-1">Harga master: Rp {formatNumber(ing.cost_per_unit)}/{ing.unit}</p>}
                                                    </div>
                                                    <div className="w-32">
                                                        <input 
                                                            type="number" 
                                                            step="0.01" 
                                                            className="w-full border rounded-lg px-3 py-2 text-sm" 
                                                            placeholder="Jumlah" 
                                                            value={item.quantity} 
                                                            onChange={e => handleRecipeChange(idx, 'quantity', parseFloat(e.target.value))} 
                                                            required 
                                                        />
                                                        {ing && <p className="text-[10px] text-blue-600 font-bold mt-1 text-right">Rp {formatNumber(itemCost)}</p>}
                                                    </div>
                                                    <button type="button" onClick={() => handleRemoveRecipeItem(idx)} className="text-red-500 pt-2"><Trash2 size={20} /></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {formData.recipe.length > 0 && (
                                    <div className="bg-gray-900 text-white p-4 rounded-xl flex justify-between items-center">
                                        <div><p className="text-xs opacity-60">Total HPP Produk</p><p className="text-lg font-bold">Rp {formatNumber(estimatedCost)}</p></div>
                                        <div className="text-right"><p className="text-xs opacity-60">Estimasi Laba</p><p className={`text-lg font-bold ${estimatedProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>Rp {formatNumber(estimatedProfit)} ({profitMargin}%)</p></div>
                                    </div>
                                )}
                                <div className="flex justify-end gap-4"><button type="button" onClick={handleCloseModal} className="font-semibold underline">Batal</button><button type="submit" className="bg-blue-600 text-white px-10 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Produk'}</button></div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManagement;
