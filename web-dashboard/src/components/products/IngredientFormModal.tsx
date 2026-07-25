import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { Dialog } from "../ui/dialog"
import { Input } from "../ui/input"
import { Button } from "../ui/button"
import api from '../../lib/api'

interface Ingredient {
    id: number;
    name: string;
    unit: string;
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

export function IngredientFormModal({ isOpen, onClose, editingIngredient, onSaved }: IngredientFormModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        unit: 'gram',
        cost_per_unit: 0 as number | string,
        min_stock: 0 as number | string,
    });

    useEffect(() => {
        if (editingIngredient) {
            setFormData({
                name: editingIngredient.name,
                unit: editingIngredient.unit,
                cost_per_unit: editingIngredient.cost_per_unit,
                min_stock: editingIngredient.min_stock,
            });
        } else {
            setFormData({ name: '', unit: 'gram', cost_per_unit: 0, min_stock: 0 });
        }
    }, [editingIngredient, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                cost_per_unit: Number(formData.cost_per_unit),
                min_stock: Number(formData.min_stock)
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
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Nama Bahan</label>
                    <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="Contoh: Susu Full Cream" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Satuan</label>
                        <Input value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="gram / ml / pcs" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Stok Minim</label>
                        <Input type="number" value={formData.min_stock} onChange={e => setFormData({ ...formData, min_stock: e.target.value })} />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 uppercase tracking-wider text-[10px]">Biaya per Satuan (Rp)</label>
                    <Input type="number" step="any" value={formData.cost_per_unit} onChange={e => setFormData({ ...formData, cost_per_unit: Number(e.target.value) })} required />
                    <div className="flex items-start gap-2 p-2 bg-blue-50 text-blue-700 rounded-md text-[10px] mt-1">
                        <Info size={12} className="mt-0.5" />
                        <p>
                            <strong>PENTING:</strong> Masukkan harga sesuai satuan terkecil (gram/ml).
                            <br />Contoh: Jika beli Gula seharga Rp 15.000/kg, maka input <strong>15</strong> (karena 15.000 / 1000gr = 15).
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