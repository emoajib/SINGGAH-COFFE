import React, { useState } from 'react';
import { Plus, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import { Badge } from "../components/ui/badge"
import { Dialog } from "../components/ui/dialog"
import { Button } from "../components/ui/button"
import { StockAdjustmentDialog } from '../components/inventory/StockAdjustmentDialog';
import { useProducts, useDeleteProduct } from '../hooks/useProducts'
import { useIngredients, useDeleteIngredient, useCreateStockMutation } from '../hooks/useIngredients'
import { useQueryClient } from '@tanstack/react-query'
import { ProductCard } from '../components/products/ProductCard';
import { IngredientStats } from '../components/products/IngredientStats';
import { IngredientFormModal } from '../components/products/IngredientFormModal';
import { IngredientsTable } from '../components/products/IngredientsTable';
import { ProductFormModal } from '../components/products/ProductFormModal';

interface Ingredient {
    id: number; name: string; unit: string; current_stock: number; min_stock: number; cost_per_unit: number;
}

interface RecipeItem {
    ingredient_id: number; quantity: number; ingredient?: Ingredient;
}

interface Product {
    id: number; name: string; category: string; price: number; cost: number; stock: number;
    sku: string; description: string; image_url: string; recipe: RecipeItem[];
}

const ProductManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'products' | 'ingredients'>('ingredients');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [isIngModalOpen, setIsIngModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [restockModal, setRestockModal] = useState({ isOpen: false, itemId: 0, type: 'IN' as 'IN' | 'OUT' });
    const [historyModal, setHistoryModal] = useState({ isOpen: false, ingredient: null as Ingredient | null, history: [] as any[] });
    const [loading, setLoading] = useState(false);

    const productsQuery = useProducts();
    const ingredientsQuery = useIngredients();
    const products = (productsQuery.data ?? []) as unknown as Product[];
    const ingredients = (ingredientsQuery.data ?? []) as unknown as Ingredient[];
    const deleteProduct = useDeleteProduct();
    const deleteIngredient = useDeleteIngredient();
    const createStockMutation = useCreateStockMutation();
    const queryClient = useQueryClient();

    const allCategories = ['All', ...new Set(products.map(p => p.category))];

    const handleDeleteIngredient = async (id: number) => {
        if (!confirm('Hapus bahan ini? Tindakan ini akan menghapus semua penggunaan bahan ini di resep produk.')) return;
        try { await deleteIngredient.mutateAsync(id); } catch { alert('Gagal menghapus bahan'); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try { await deleteProduct.mutateAsync(id); } catch { alert('Failed to delete product'); }
    };

    const handleOpenHistory = async (ing: Ingredient) => {
        setLoading(true);
        try {
            const data = await queryClient.fetchQuery({
                queryKey: ['stock-mutations', ing.id],
                queryFn: () => api.get(`/ingredients/${ing.id}/history`).then(r => r.data),
            });
            setHistoryModal({ isOpen: true, ingredient: ing, history: data as any[] });
        } catch { alert('Gagal mengambil riwayat stok'); }
        finally { setLoading(false); }
    };

    return (
        <div className="p-6">
            <div className="flex flex-col mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center md:text-left">Manajemen Produksi</h1>
                <div className="flex border-b overflow-x-auto no-scrollbar">
                    <button onClick={() => setActiveTab('ingredients')} className={`px-6 py-3 font-bold text-sm uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'ingredients' ? 'border-b-4 border-primary text-primary' : 'text-gray-400 hover:text-gray-700'}`}>Master Bahan & Harga</button>
                    <button onClick={() => setActiveTab('products')} className={`px-6 py-3 font-bold text-sm uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === 'products' ? 'border-b-4 border-primary text-primary' : 'text-gray-400 hover:text-gray-700'}`}>Menu & Resep</button>
                </div>
            </div>

            {activeTab === 'ingredients' ? (
                <div className="space-y-6">
                    <IngredientStats ingredients={ingredients} />
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-800">Inventaris Bahan Baku</h2>
                        <Button onClick={() => { setEditingIngredient(null); setIsIngModalOpen(true); }} className="bg-primary hover:bg-primary/90">
                            <Plus className="mr-2 h-4 w-4" /> Tambah Bahan Baru
                        </Button>
                    </div>
                    <IngredientsTable
                        ingredients={ingredients}
                        onEdit={(ing) => { setEditingIngredient(ing); setIsIngModalOpen(true); }}
                        onDelete={handleDeleteIngredient}
                        onRestock={(ing, t) => setRestockModal({ isOpen: true, itemId: ing.id, type: t })}
                        onHistory={handleOpenHistory}
                    />
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
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Daftar Menu & Resep</h2>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {allCategories.map(cat => (
                                    <Badge key={cat} variant="secondary" className="bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-widest">{cat}</Badge>
                                ))}
                            </div>
                        </div>
                        <Button onClick={() => { setEditingProduct(null); setIsProductModalOpen(true); }} className="bg-primary hover:bg-primary/90 shadow-lg w-full md:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> Tambah Menu Baru
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map(product => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                onEdit={(p) => { setEditingProduct(p); setIsProductModalOpen(true); }}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </div>
            )}

            <ProductFormModal
                isOpen={isProductModalOpen}
                onClose={() => { setIsProductModalOpen(false); setEditingProduct(null); }}
                onSaved={() => { queryClient.invalidateQueries({ queryKey: ['products'] }); }}
                editingProduct={editingProduct}
                ingredients={ingredients}
                allCategories={allCategories}
            />

            <IngredientFormModal
                isOpen={isIngModalOpen}
                onClose={() => { setIsIngModalOpen(false); setEditingIngredient(null); }}
                editingIngredient={editingIngredient}
                onSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ['ingredients'] });
                    queryClient.invalidateQueries({ queryKey: ['products'] });
                }}
            />

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
                    } catch { alert('Gagal memperbarui stok'); }
                    finally { setLoading(false); }
                }}
            />

            <Dialog isOpen={historyModal.isOpen} onClose={() => setHistoryModal({ ...historyModal, isOpen: false })} title={`Riwayat Mutasi: ${historyModal.ingredient?.name || ''}`}>
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
                                            <span className="font-bold text-sm">{item.type === 'IN' || item.type === 'ADJ_ADD' ? '+' : '-'}{Number(item.quantity)} {historyModal.ingredient?.unit}</span>
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
        </div>
    );
};

export default ProductManagement;