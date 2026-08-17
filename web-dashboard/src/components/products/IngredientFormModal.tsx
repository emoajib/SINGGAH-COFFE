import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { Dialog } from "../ui/dialog"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import api from '../../lib/api'

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

interface IngredientFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingIngredient: Ingredient | null;
    onSaved: () => void;
}

const CATEGORY_OPTIONS = [
    'Kopi',
    'Susu',
    'Pemanis',
    'Kemasan',
    'Es',
    'Topping',
    'Lainnya',
];

const UNIT_OPTIONS = ['gram', 'ml', 'pcs', 'lembar', 'sachet'];
const PURCHASE_UNIT_OPTIONS = ['kg', 'liter', 'pcs', 'gram', 'ml', 'pack', 'kardus', 'sachet'];

export function IngredientFormModal({ isOpen, onClose, editingIngredient, onSaved }: IngredientFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        unit: 'gram',
        purchase_unit: 'kg',
        purchase_unit_size: 1000 as number | string,
        cost_per_unit: 0 as number | string,
        min_stock: 0 as number | string,
    });

    useEffect(() => {
        if (editingIngredient) {
            setFormData({
                name: editingIngredient.name,
                category: editingIngredient.category || '',
                unit: editingIngredient.unit,
                purchase_unit: editingIngredient.purchase_unit || 'kg',
                purchase_unit_size: editingIngredient.purchase_unit_size || 1000,
                cost_per_unit: editingIngredient.cost_per_unit,
                min_stock: editingIngredient.min_stock,
            });
        } else {
            setFormData({ name: '', category: '', unit: 'gram', purchase_unit: 'kg', purchase_unit_size: 1000, cost_per_unit: 0, min_stock: 0 });
        }
    }, [editingIngredient, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                purchase_unit_size: Number(formData.purchase_unit_size),
                cost_per_unit: Number(formData.cost_per_unit),
                min_stock: Number(formData.min_stock),
            };

            if (editingIngredient) {
                await api.put(`/ingredients/${editingIngredient.id}`, payload);
            } else {
                await api.post('/ingredients', payload);
            }
            onSaved();
            onClose();
        } catch (error) {
            alert('Gagal menyimpan bahan');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title={editingIngredient ? 'Edit Spesifikasi Bahan' : 'Daftar Bahan Baru'}
        >
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
                {/* Nama Bahan */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Nama Bahan</label>
                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Contoh: Susu Full Cream" />
                </div>

                {/* Kategori */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Kategori</label>
                    <div className="flex gap-2">
                        <select
                            value={CATEGORY_OPTIONS.includes(formData.category) ? formData.category : (formData.category ? 'custom' : '')}
                            onChange={e => {
                                if (e.target.value !== 'custom') setFormData({ ...formData, category: e.target.value });
                                else setFormData({ ...formData, category: '' });
                            }}
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="">-- Pilih Kategori --</option>
                            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            <option value="custom">Lainnya (ketik sendiri)</option>
                        </select>
                        {(!CATEGORY_OPTIONS.includes(formData.category) && formData.category !== '') && (
                            <Input
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                placeholder="Nama kategori..."
                                className="flex-1"
                            />
                        )}
                    </div>
                </div>

                {/* Satuan & Stok Minim */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Satuan Pakai</label>
                        <div className="flex gap-2">
                            <select
                                value={UNIT_OPTIONS.includes(formData.unit) ? formData.unit : 'custom'}
                                onChange={e => { if (e.target.value !== 'custom') setFormData({ ...formData, unit: e.target.value }); }}
                                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                <option value="custom">lainnya</option>
                            </select>
                        </div>
                        {!UNIT_OPTIONS.includes(formData.unit) && (
                            <Input value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="gram / ml / pcs" />
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Stok Minim</label>
                        <Input type="number" value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: e.target.value })} />
                    </div>
                </div>

                {/* Satuan Beli & Isi per Satuan Beli */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Satuan Beli</label>
                        <select
                            value={PURCHASE_UNIT_OPTIONS.includes(formData.purchase_unit) ? formData.purchase_unit : 'custom'}
                            onChange={e => { if (e.target.value !== 'custom') setFormData({ ...formData, purchase_unit: e.target.value }); }}
                            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            {PURCHASE_UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                            <option value="custom">lainnya</option>
                        </select>
                        {!PURCHASE_UNIT_OPTIONS.includes(formData.purchase_unit) && (
                            <Input value={formData.purchase_unit} onChange={e => setFormData({ ...formData, purchase_unit: e.target.value })} placeholder="kg / liter / pack" />
                        )}
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">
                            Isi per Satuan Beli ({formData.unit})
                        </label>
                        <Input
                            type="number"
                            step="any"
                            min={0.01}
                            value={formData.purchase_unit_size}
                            onChange={e => setFormData({ ...formData, purchase_unit_size: e.target.value })}
                            placeholder="Contoh: 1000"
                        />
                        <p className="text-[10px] text-gray-500">
                            Misal: 1 kg = <strong>1000</strong> gram
                        </p>
                    </div>
                </div>

                {/* Biaya per Satuan */}
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Biaya per Satuan (Rp/{formData.unit})</label>
                    <Input type="number" step="any" value={formData.cost_per_unit} onChange={e => setFormData({ ...formData, cost_per_unit: Number(e.target.value) })} required />
                    <div className="flex items-start gap-2 p-2 bg-blue-50 text-blue-700 rounded-md text-[10px] mt-1">
                        <Info size={12} className="mt-0.5 shrink-0" />
                        <p>
                            <strong>PENTING:</strong> Masukkan harga per satuan terkecil ({formData.unit}).
                            <br />Contoh: Susu Rp 22.000/liter → input <strong>{formData.unit === 'ml' ? '22' : '22.000/1000'}</strong> ({formData.unit === 'ml' ? '22.000 ÷ 1000 ml = 22' : `harga per ${formData.unit}`}).
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                    <Button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan Bahan'}</Button>
                </div>
            </form>
        </Dialog>
    );
}