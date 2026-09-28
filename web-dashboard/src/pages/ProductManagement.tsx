import React, { useState } from 'react';
import { Plus, AlertTriangle, Warehouse, ArrowLeftRight, ArrowUpCircle, Package, ShoppingBag, Receipt } from 'lucide-react';
import api from '../lib/api';
import { Badge } from "../components/ui/badge"
import { Dialog } from "../components/ui/dialog"
import { Button } from "../components/ui/button"
import { StockAdjustmentDialog } from '../components/inventory/StockAdjustmentDialog';
import { TransferStockDialog } from '../components/inventory/TransferStockDialog';
import { useProducts, useDeleteProduct } from '../hooks/useProducts'
import { useIngredients, useDeleteIngredient, useCreateStockMutation } from '../hooks/useIngredients'
import { useQueryClient } from '@tanstack/react-query'
import { ProductCard } from '../components/products/ProductCard';
import { IngredientFormModal } from '../components/products/IngredientFormModal';
import { IngredientsTable } from '../components/products/IngredientsTable';
import { ProductFormModal } from '../components/products/ProductFormModal';

interface Ingredient {
    id: number; name: string; category: string; unit: string;
    purchase_unit: string; purchase_unit_size: number;
    current_stock: number; warehouse_stock: number; kedai_stock: number;
    min_stock: number; cost_per_unit: number;
}

interface RecipeItem {
    ingredient_id: number; quantity: number; ingredient?: Ingredient;
}

interface Product {
    id: number; name: string; category: string; price: number; cost: number; stock: number;
    sku: string; description: string; image_url: string; recipe: RecipeItem[];
}

const ProductManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'warehouse' | 'ingredients' | 'products'>('ingredients');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [isIngModalOpen, setIsIngModalOpen] = useState(false);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [restockModal, setRestockModal] = useState<{ isOpen: boolean; itemId: number; type: 'IN' | 'OUT' | 'AUDIT'; location?: 'warehouse' | 'kedai' }>({ isOpen: false, itemId: 0, type: 'IN', location: undefined });
    const [historyModal, setHistoryModal] = useState({ isOpen: false, ingredient: null as Ingredient | null, history: [] as any[] });
    const [transferIngredient, setTransferIngredient] = useState<Ingredient | null>(null);
    const [loading, setLoading] = useState(false);
    const productsQuery = useProducts();
    const ingredientsQuery = useIngredients();
    const productsRaw = productsQuery.data;
    const products: Product[] = Array.isArray(productsRaw) ? (productsRaw as unknown as Product[]) : [];
    const ingredientsRaw = ingredientsQuery.data;
    const ingredients: Ingredient[] = Array.isArray(ingredientsRaw) ? (ingredientsRaw as unknown as Ingredient[]) : [];
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
                    <button
                        onClick={() => setActiveTab('warehouse')}
                        className={`px-6 py-3 font-bold text-sm uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 border-b-4 ${
                            activeTab === 'warehouse' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-700'
                        }`}
                    >
                        <Warehouse size={15} />
                        Gudang
                    </button>
                    <button
                        onClick={() => setActiveTab('ingredients')}
                        className={`px-6 py-3 font-bold text-sm uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 border-b-4 ${
                            activeTab === 'ingredients' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-700'
                        }`}
                    >
                        <ShoppingBag size={15} />
                        Master Bahan & Harga
                    </button>
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`px-6 py-3 font-bold text-sm uppercase tracking-widest whitespace-nowrap transition-all flex items-center gap-2 border-b-4 ${
                            activeTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-700'
                        }`}
                    >
                        <Receipt size={15} />
                        Menu & Resep
                    </button>
                </div>
            </div>

            {/* ─── TAB GUDANG ─── */}
            {activeTab === 'warehouse' && (
                <div className="space-y-6">
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-indigo-100">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-white/20 rounded-xl p-2"><Warehouse size={18} /></div>
                                <span className="text-sm font-bold opacity-90">Total Stok Gudang</span>
                            </div>
                            <div className="text-2xl font-black">{ingredients.length} Bahan</div>
                            <div className="text-xs opacity-75 mt-1">Dengan data lokasi gudang</div>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-lg shadow-amber-100">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-white/20 rounded-xl p-2"><Package size={18} /></div>
                                <span className="text-sm font-bold opacity-90">Perlu Transfer ke Kedai</span>
                            </div>
                            <div className="text-2xl font-black">
                                {ingredients.filter(i => i.warehouse_stock > 0).length}
                            </div>
                            <div className="text-xs opacity-75 mt-1">Bahan ada stok di gudang</div>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 text-white shadow-lg shadow-emerald-100">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="bg-white/20 rounded-xl p-2"><ArrowLeftRight size={18} /></div>
                                <span className="text-sm font-bold opacity-90">Stok Kritis di Kedai</span>
                            </div>
                            <div className="text-2xl font-black">
                                {ingredients.filter(i => i.kedai_stock <= i.min_stock).length}
                            </div>
                            <div className="text-xs opacity-75 mt-1">Segera transfer dari gudang</div>
                        </div>
                    </div>

                    {/* Tabel Gudang */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-50/50">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Stok Gudang</h2>
                                <p className="text-xs text-gray-500 mt-0.5">Kelola stok masuk gudang & transfer ke kedai</p>
                            </div>
                            <Button
                                onClick={() => { setActiveTab('ingredients'); setIsIngModalOpen(true); }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Pilih Bahan
                            </Button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-widest border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Bahan Baku</th>
                                        <th className="px-6 py-3 text-center">🏭 Stok Gudang</th>
                                        <th className="px-6 py-3 text-center">☕ Stok Kedai</th>
                                        <th className="px-6 py-3 text-center">Status</th>
                                        <th className="px-6 py-3 text-center">Aksi Gudang</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ingredients.map(ing => (
                                        <tr key={ing.id} className="border-b hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{ing.name}</div>
                                                <div className="text-[10px] text-gray-400 font-medium">{ing.category} · {ing.unit}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-lg font-black ${
                                                    ing.warehouse_stock <= 0 ? 'text-gray-300' : 'text-indigo-700'
                                                }`}>{(ing.warehouse_stock ?? 0).toFixed(1)}</span>
                                                <span className="text-[10px] text-gray-400 ml-1">{ing.unit}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`text-base font-bold ${
                                                    (ing.kedai_stock ?? ing.current_stock) <= ing.min_stock ? 'text-red-600' : 'text-amber-700'
                                                }`}>{(ing.kedai_stock ?? ing.current_stock ?? 0).toFixed(1)}</span>
                                                <span className="text-[10px] text-gray-400 ml-1">{ing.unit}</span>
                                                {(ing.kedai_stock ?? ing.current_stock) <= ing.min_stock && (
                                                    <div className="text-[9px] text-red-500 font-bold mt-0.5">⚠ KRITIS</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {ing.warehouse_stock > 0 ? (
                                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">Ada di Gudang</span>
                                                ) : (
                                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-400">Gudang Kosong</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    {/* Stok Masuk ke Gudang */}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-3 text-[11px] font-bold border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all"
                                                        onClick={() => setRestockModal({ isOpen: true, itemId: ing.id, type: 'IN', location: 'warehouse' })}
                                                        title="Stok Masuk ke Gudang"
                                                    >
                                                        <ArrowUpCircle size={13} className="mr-1" />
                                                        Terima
                                                    </Button>
                                                    {/* Transfer Gudang → Kedai */}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 px-3 text-[11px] font-bold border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-600 hover:text-white transition-all"
                                                        onClick={() => setTransferIngredient(ing)}
                                                        title="Transfer Gudang → Kedai"
                                                        disabled={ing.warehouse_stock <= 0}
                                                    >
                                                        <ArrowLeftRight size={13} className="mr-1" />
                                                        Transfer
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {ingredients.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                                                Belum ada bahan terdaftar. Tambah dulu di tab Master Bahan & Harga.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex gap-4">
                        <Warehouse className="text-indigo-600 shrink-0" size={22} />
                        <div>
                            <h4 className="text-sm font-bold text-indigo-900">Alur Gudang → Kedai</h4>
                            <p className="text-xs text-indigo-700 leading-relaxed mt-0.5">
                                Pembelian bahan masuk ke <strong>Gudang</strong> terlebih dahulu. Gunakan tombol <strong>Transfer</strong> untuk memindahkan stok ke <strong>Kedai / Bar</strong> sesuai kebutuhan produksi harian.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── TAB MASTER BAHAN & HARGA ─── */}
            {activeTab === 'ingredients' ? (
                <div className="space-y-6">
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
                        onRestock={(ing, t) => setRestockModal({ isOpen: true, itemId: ing.id, type: t, location: 'kedai' })}
                        onTransfer={(ing) => setTransferIngredient(ing)}
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
                defaultLocation={restockModal.location}
                onConfirm={async (data) => {
                    setLoading(true);
                    try {
                        await createStockMutation.mutateAsync({
                            ingredient_id: restockModal.itemId,
                            type: (data.type || restockModal.type) as any,
                            quantity: data.qty,
                            notes: data.notes || (restockModal.type === 'IN' ? (data.isPurchase ? "Pembelian Bahan" : "Koreksi Stok Masuk") : "Koreksi Stok Keluar/Limbah"),
                            is_purchase: data.isPurchase,
                            update_master_price: data.updateMasterPrice,
                            new_cost_per_unit: data.newPrice,
                            location: data.location || 'kedai',
                        });
                        setRestockModal({ ...restockModal, isOpen: false });
                        queryClient.invalidateQueries({ queryKey: ['products'] });
                        queryClient.invalidateQueries({ queryKey: ['ingredients'] });
                    } catch { alert('Gagal memperbarui stok'); }
                    finally { setLoading(false); }
                }}
            />

            <TransferStockDialog
                ingredient={transferIngredient}
                onClose={() => setTransferIngredient(null)}
                onSuccess={() => {
                    queryClient.invalidateQueries({ queryKey: ['ingredients'] });
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
                                                {item.type === 'IN' ? 'MASUK' : item.type === 'OUT' ? 'KELUAR' : item.type === 'ADJ_ADD' ? 'AUDIT (+)' : item.type === 'ADJ_SUB' ? 'AUDIT (-)' : item.type}
                                            </Badge>
                                            <Badge variant={item.location === 'warehouse' ? 'secondary' : 'outline'} className="text-[9px] h-4 ml-1" style={item.location === 'warehouse' ? { backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' } : { backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
                                                {item.location === 'warehouse' ? '🏭 Gudang' : '☕ Kedai'}
                                            </Badge>
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