import React, { useState, useEffect } from "react"
import {
    RefreshCw,
    Settings,
    ShieldCheck,
    Globe,
    Smartphone,
    CreditCard,
    ArrowRight,
    Loader2,
    Clock,
    AlertCircle
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import api from '../lib/api'

interface IntegrationLog {
    id: number;
    webhook_id: string;
    status: string;
    created_at: string;
}

const Integration: React.FC = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [logs, setLogs] = useState<IntegrationLog[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(true);
    const [settings, setSettings] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoadingLogs(true);
        try {
            const [logsRes, settingsRes] = await Promise.all([
                api.get('/integrations/logs'),
                api.get('/settings')
            ]);
            setLogs(logsRes.data || []);
            setSettings(settingsRes.data || {});
        } catch (err) {
            console.error("Failed to fetch integration data", err);
        } finally {
            setIsLoadingLogs(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        await fetchData();
        setTimeout(() => setIsSyncing(false), 1000);
    };

    const isXenditConfigured = !!settings.xendit_api_key;

    return (
        <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen font-sans">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight text-primary uppercase">Omnichannel Hub</h1>
                    <p className="text-gray-500 font-medium italic">Status integrasi eksternal dan log audit pembayaran riil.</p>
                </div>
                <Button
                    className="gradient-primary text-white font-bold hover:opacity-90 transition-all shadow-xl rounded-xl px-8"
                    onClick={handleSync}
                    disabled={isSyncing}
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Memperbarui Data...' : 'Refresh Status'}
                </Button>
            </div>

            {/* Integration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

                {/* QRIS / Xendit */}
                <Card className={`border-none shadow-2xl relative overflow-hidden group ${!isXenditConfigured ? 'opacity-70' : ''}`}>
                    <CardHeader className="pb-4 relative z-10">
                        <div className="flex justify-between items-center mb-2">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <Badge variant={isXenditConfigured ? "success" : "outline"} className="px-4 py-1 rounded-full border-none">
                                {isXenditConfigured ? 'Terhubung' : 'Belum Setup'}
                            </Badge>
                        </div>
                        <CardTitle className="text-xl font-bold text-gray-900">Xendit QRIS Node</CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-widest text-gray-400">Gerbang Pembayaran Otomatis</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                        <div className="space-y-4 p-4 bg-gray-900/5 rounded-2xl border border-white/40 shadow-inner">
                            <div className="flex items-center gap-3 text-sm">
                                <ShieldCheck className={`w-4 h-4 ${isXenditConfigured ? 'text-green-600' : 'text-gray-400'}`} />
                                <span className="font-bold text-gray-700">Status Keamanan: {isXenditConfigured ? 'Aktif' : 'Nonaktif'}</span>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">API Key Hash</label>
                                <div className="h-10 bg-white/80 flex items-center px-4 rounded-xl font-mono text-xs text-gray-500 overflow-hidden">
                                    {settings.xendit_api_key ? '••••••••••••••••••••••••••••' : 'API Key Belum Diatur'}
                                </div>
                            </div>
                        </div>
                        {!isXenditConfigured && (
                            <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl flex gap-2 text-[10px] text-orange-700 font-bold italic">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>Segera atur API Key di menu Pengaturan untuk mengaktifkan QRIS.</span>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="p-6 flex justify-end gap-3 border-t">
                        <Button variant="ghost" className="font-bold text-xs text-gray-500" onClick={() => window.location.href = '/settings'}>Buka Pengaturan</Button>
                    </CardFooter>
                </Card>

                {/* GoFood Integration - HONEST STATUS */}
                <Card className="border-none shadow-2xl relative overflow-hidden opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-center mb-2">
                            <div className="p-3 rounded-2xl bg-green-100 text-green-600 shadow-inner">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <Badge variant="outline" className="px-4 py-1 rounded-full text-[10px] font-black tracking-tighter uppercase italic">Phase 3: Development</Badge>
                        </div>
                        <CardTitle className="text-xl font-bold text-gray-900">GoFood Bridge</CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-widest text-gray-400">Otomatisasi Menu & Pesanan</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-gray-100 rounded-2xl border border-dashed border-gray-300">
                            <p className="text-[10px] text-center text-gray-500 font-bold uppercase tracking-widest italic py-4">Modul ini sedang dalam tahap pengembangan API Partner.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* GrabFood Integration - HONEST STATUS */}
                <Card className="border-none shadow-2xl relative overflow-hidden opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                    <CardHeader className="pb-4">
                        <div className="flex justify-between items-center mb-2">
                            <div className="p-3 rounded-2xl bg-green-100 text-green-800 shadow-inner">
                                <Globe className="w-6 h-6" />
                            </div>
                            <Badge variant="outline" className="px-4 py-1 rounded-full text-[10px] font-black tracking-tighter uppercase italic">Phase 3: Development</Badge>
                        </div>
                        <CardTitle className="text-xl font-bold text-gray-900">GrabFood Gateway</CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-widest text-gray-400">Sinkronisasi Katalog & Stok</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-gray-100 rounded-2xl border border-dashed border-gray-300">
                            <p className="text-[10px] text-center text-gray-500 font-bold uppercase tracking-widest italic py-4">Modul ini sedang dalam tahap pengembangan API Partner.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Integration Logs / Activity - REAL DATA */}
            <Card className="border-none shadow-2xl overflow-hidden bg-white">
                <CardHeader className="border-b pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary" />
                                Log Integrasi Sistem (Real-Time)
                            </CardTitle>
                            <CardDescription>Jejak audit riil untuk komunikasi pembayaran dan jembatan eksternal.</CardDescription>
                        </div>
                        {logs.length > 0 && <Badge className="bg-primary text-white font-black">{logs.length} AKTIVITAS</Badge>}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoadingLogs ? (
                        <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
                    ) : logs.length === 0 ? (
                        <div className="p-20 text-center space-y-4">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                                <Settings className="text-gray-300 w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900 uppercase tracking-widest">Belum Ada Aktivitas Riil</p>
                                <p className="text-xs text-gray-400">Sistem siap menerima callback dari gateway pembayaran.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 tracking-widest border-b">
                                    <tr>
                                        <th className="px-6 py-4">Waktu</th>
                                        <th className="px-6 py-4">Sistem</th>
                                        <th className="px-6 py-4">Webhook ID / Referensi</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="px-6 py-4 text-[10px] font-bold font-mono text-gray-400">
                                                {new Date(log.created_at).toLocaleString('id-ID')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                    <span className="text-xs font-black text-gray-900 uppercase">XENDIT</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-gray-700 truncate w-48">{log.webhook_id}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge variant="outline" className={`font-black text-[10px] ${log.status === 'PAID' || log.status === 'SETTLED' ? 'text-green-600 bg-green-50 border-green-200' : 'text-orange-600 bg-orange-50 border-orange-200'}`}>
                                                    {log.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors ml-auto" />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Integration;
