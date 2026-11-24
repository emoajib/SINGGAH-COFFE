import { useEffect, useState } from "react";
import { InventoryService, type Ingredient } from "../services/inventoryService";
import { StockOpnameService } from "../services/stockOpnameService";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useToast } from "../hooks/use-toast";

export default function StockOpname() {
    const { toast } = useToast();
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [items, setItems] = useState<Record<number, { physical: string; note: string }>>({});
    const [periodFrom, setPeriodFrom] = useState(new Date().toISOString().slice(0, 10));
    const [periodTo, setPeriodTo] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState("");
    const [history, setHistory] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        const ings = await InventoryService.getAll();
        setIngredients(ings);
        const h = await StockOpnameService.list();
        setHistory(h);
    };

    useEffect(() => { load(); }, []);

    const setPhysical = (id: number, v: string) => {
        setItems(prev => ({ ...prev, [id]: { physical: v, note: prev[id]?.note || "" } }));
    };
    const setNote = (id: number, v: string) => {
        setItems(prev => ({ ...prev, [id]: { physical: prev[id]?.physical || "0", note: v } }));
    };

    const save = async () => {
        setSaving(true);
        try {
            const payload = {
                period_from: periodFrom,
                period_to: periodTo,
                notes,
                items: ingredients.map(ing => ({
                    ingredient_id: ing.id,
                    physical_stock: Number(items[ing.id]?.physical || 0),
                    note: items[ing.id]?.note || ""
                }))
            };
            const opname = await StockOpnameService.create(payload);
            toast({ title: "Berhasil", description: "Stok opname disimpan", variant: "success" });
            StockOpnameService.downloadPdf(opname.id);
            await load();
        } catch (e: any) {
            toast({ title: "Gagal", description: e?.response?.data?.error || "Gagal simpan", variant: "error" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <Card>
                <CardHeader><CardTitle>Stok Opname</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-3 flex-wrap">
                        <div>
                            <label className="text-sm">Dari</label>
                            <Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-sm">Sampai</label>
                            <Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-sm">Catatan</label>
                            <Input value={notes} onChange={e => setNotes(e.target.value)} />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm table-fixed">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2 w-2/5">Bahan</th>
                                    <th className="text-center p-2 w-1/6">Stok Sistem</th>
                                    <th className="text-center p-2 w-1/6">Stok Fisik</th>
                                    <th className="text-center p-2 w-1/6">Selisih</th>
                                    <th className="text-center p-2 w-1/5">Catatan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ingredients.map(ing => {
                                    const phys = Number(items[ing.id]?.physical || 0);
                                    const diff = phys - (ing.kedai_stock || 0);
                                    return (
                                        <tr key={ing.id} className="border-b">
                                            <td className="p-2">{ing.name} ({ing.unit})</td>
                                            <td className="p-2 text-center">{ing.kedai_stock}</td>
                                            <td className="p-2 text-center">
                                                <Input type="number" placeholder="0" className="w-28 text-center border border-gray-300 bg-white" value={items[ing.id]?.physical || ""} onChange={e => setPhysical(ing.id, e.target.value)} />
                                            </td>
                                            <td className={`p-2 text-center ${diff !== 0 ? "text-red-600 font-bold" : ""}`}>{diff.toFixed(2)}</td>
                                            <td className="p-2 text-center">
                                                <Input value={items[ing.id]?.note || ""} onChange={e => setNote(ing.id, e.target.value)} />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan & Generate PDF"}</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Riwayat Stok Opname</CardTitle></CardHeader>
                <CardContent>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-2">ID</th>
                                <th className="text-left p-2">Periode</th>
                                <th className="text-left p-2">Catatan</th>
                                <th className="text-left p-2">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((h: any) => (
                                <tr key={h.id} className="border-b">
                                    <td className="p-2">{h.id}</td>
                                    <td className="p-2">{h.period_from?.slice(0,10)} - {h.period_to?.slice(0,10)}</td>
                                    <td className="p-2">{h.notes}</td>
                                    <td className="p-2">
                                        <Button size="sm" variant="outline" onClick={() => StockOpnameService.downloadPdf(h.id)}>Download PDF</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
