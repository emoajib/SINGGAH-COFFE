import React, { useState } from "react"
import {
    RefreshCw,
    CheckCircle,
    Settings,
    Zap,
    ShieldCheck,
    Globe,
    Smartphone,
    CreditCard,
    ArrowRight
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Input } from "../components/ui/input"

const Integration: React.FC = () => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [configs] = useState({
        xendit_key: 'xnd_production_************************',
        gofood_active: true,
        grabfood_active: true
    });

    const handleSync = () => {
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 2000);
    };

    return (
        <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight font-display text-primary uppercase">Omnichannel Hub</h1>
                    <p className="text-gray-500 font-medium italic">Gateway integrasi logistik dan pembayaran terpadu.</p>
                </div>
                <Button
                    className="glass-panel border-primary/20 bg-white/50 text-primary font-bold hover:bg-primary hover:text-white transition-all shadow-xl"
                    onClick={handleSync}
                    disabled={isSyncing}
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sinkronisasi Ekosistem...' : 'Paksa Sinkron Global'}
                </Button>
            </div>

            {/* Integration Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">

                {/* QRIS / Xendit */}
                <Card className="border-none shadow-2xl glass-panel relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                    <CardHeader className="pb-4 relative z-10">
                        <div className="flex justify-between items-center mb-2">
                            <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-inner">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <Badge variant="success" className="px-4 py-1 rounded-full border-none gradient-success text-white shadow-sm">Operasional</Badge>
                        </div>
                        <CardTitle className="text-xl font-bold text-gray-900">Node Pembayaran QRIS</CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-widest text-gray-400">Didukung oleh Produksi Xendit</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                        <div className="space-y-4 p-4 bg-gray-900/5 rounded-2xl border border-white/40 shadow-inner">
                            <div className="flex items-center gap-3 text-sm">
                                <ShieldCheck className="w-4 h-4 text-green-600" />
                                <span className="font-bold text-gray-700">PCI-DSS Level 1 Aman</span>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Secret API Key</label>
                                <Input
                                    type="password"
                                    value={configs.xendit_key}
                                    className="h-10 bg-white/80 border-none shadow-sm rounded-xl font-mono text-xs"
                                    readOnly
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 rounded-xl bg-white/40 border border-white/40">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Uptime</p>
                                <p className="text-lg font-black text-primary">99.9%</p>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-white/40 border border-white/40">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Latensi</p>
                                <p className="text-lg font-black text-primary">120ms</p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-white/30 backdrop-blur-sm p-6 flex justify-between gap-3 border-t border-white/20">
                        <Button variant="ghost" className="font-bold text-xs text-gray-500">Lihat Log</Button>
                        <Button className="gradient-primary text-white font-bold px-6 rounded-xl shadow-lg shadow-primary/20">Konfigurasi Ulang</Button>
                    </CardFooter>
                </Card>

                {/* GoFood Integration */}
                <Card className="border-none shadow-2xl glass-panel relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                    <CardHeader className="pb-4 relative z-10">
                        <div className="flex justify-between items-center mb-2">
                            <div className="p-3 rounded-2xl bg-green-100 text-green-600 shadow-inner">
                                <Smartphone className="w-6 h-6" />
                            </div>
                            <Badge variant="success" className="px-4 py-1 rounded-full border-none bg-green-500 text-white shadow-sm">Sinkron Aktif</Badge>
                        </div>
                        <CardTitle className="text-xl font-bold text-gray-900">Ekosistem GoFood</CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-widest text-gray-400">Jembatan API Merchant Langsung</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/40">
                                <div className="flex items-center gap-3">
                                    <Globe className="w-5 h-5 text-gray-400" />
                                    <span className="text-sm font-bold text-gray-700">Otomatisasi Menu</span>
                                </div>
                                <Zap className="w-4 h-4 text-orange-500 fill-orange-500" />
                            </div>
                            <div className="p-4 bg-gray-50/50 rounded-2xl border flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Aktifitas Terakhir</span>
                                <span className="text-xs font-black text-gray-900">3 Detik Lalu</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-white/30 backdrop-blur-sm p-6 flex justify-between gap-3 border-t border-white/20">
                        <Button variant="outline" className="flex-1 font-bold text-xs rounded-xl border-green-200 text-green-700 hover:bg-green-50">Sinkron Manual</Button>
                        <Button variant="ghost" className="font-bold text-xs text-gray-400 rounded-xl"><Settings className="w-4 h-4" /></Button>
                    </CardFooter>
                </Card>

                {/* GrabFood Integration */}
                <Card className="border-none shadow-2xl glass-panel relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-600/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                    <CardHeader className="pb-4 relative z-10">
                        <div className="flex justify-between items-center mb-2">
                            <div className="p-3 rounded-2xl bg-green-100 text-green-800 shadow-inner">
                                <Globe className="w-6 h-6" />
                            </div>
                            <Badge variant="success" className="px-4 py-1 rounded-full border-none bg-green-700 text-white shadow-sm">Terhubung</Badge>
                        </div>
                        <CardTitle className="text-xl font-bold text-gray-900">Gerbang GrabFood</CardTitle>
                        <CardDescription className="text-xs font-medium uppercase tracking-widest text-gray-400">Platform Merchant v2.1</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/40">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <span className="text-sm font-bold text-gray-700">Penjaga Stok Aktif</span>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50/50 rounded-2xl border flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-tight">Pesanan Tertunda</span>
                                <span className="text-xs font-black text-primary">0 Pesanan</span>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="bg-white/30 backdrop-blur-sm p-6 flex justify-between gap-3 border-t border-white/20">
                        <Button variant="outline" className="flex-1 font-bold text-xs rounded-xl border-green-200 text-green-800 hover:bg-green-50">Sinkron Katalog</Button>
                        <Button variant="ghost" className="font-bold text-xs text-gray-400 rounded-xl"><Settings className="w-4 h-4" /></Button>
                    </CardFooter>
                </Card>
            </div>

            {/* Integration Logs / Activity */}
            <Card className="border-none shadow-2xl glass-panel overflow-hidden">
                <CardHeader className="bg-white/30 border-b border-white/20 pb-4">
                    <CardTitle className="text-xl font-bold text-gray-900">Log Integrasi Sistem</CardTitle>
                    <CardDescription>Jejak audit visual untuk semua komunikasi jembatan eksternal.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-6 space-y-4">
                        {[
                            { time: '14:22:01', system: 'XENDIT', event: 'Callback Pembayaran Diverifikasi', id: 'INV-2024-002', status: 'SUKSES' },
                            { time: '14:15:45', system: 'GOFOOD', event: 'Pembaruan Menu Terkirim', id: 'CAT-9922', status: 'SELESAI' },
                            { time: '14:10:12', system: 'GRABFOOD', event: 'Sinkronisasi Potong Stok', id: 'ING-COFFEE-01', status: 'SUKSES' },
                        ].map((log, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-white/40 rounded-2xl border border-white/10 group hover:bg-white/60 transition-all cursor-default">
                                <div className="flex items-center gap-4">
                                    <div className="text-[10px] font-black text-gray-400 font-mono">{log.time}</div>
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                    <div>
                                        <p className="text-xs font-black text-primary uppercase tracking-tighter">{log.system}</p>
                                        <p className="text-sm font-bold text-gray-900">{log.event}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">ID Ref</p>
                                        <p className="text-xs font-black text-gray-900">{log.id}</p>
                                    </div>
                                    <Badge variant="outline" className="font-black text-[10px] border-primary/20 text-primary bg-primary/5">{log.status}</Badge>
                                    <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Integration;
