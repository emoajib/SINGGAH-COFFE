import React, { useState, useEffect } from "react"
import {
    Plus,
    CreditCard,
    Printer,
    CheckCircle2,
    Loader2,
    Monitor,
    X,
    Zap
} from "lucide-react"
import { Button } from "../components/ui/button"
import { Dialog } from "../components/ui/dialog"
import Receipt from "../components/pos/Receipt"
import { getImageUrl, formatNumber } from "../lib/utils"
import { useProducts } from '../hooks/useProducts'
import { useCreateOrder } from '../hooks/useOrders'
import { useSettings } from '../hooks/useSettings'

interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    stock: number;
    image_url?: string;
}

interface CartItem extends Product {
    quantity: number;
}

const PosTerminal: React.FC = () => {
    const [categories, setCategories] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastOrder, setLastOrder] = useState<any>(null);

    const productsQuery = useProducts();
    const products = (productsQuery.data ?? []) as unknown as Product[];
    const isLoadingProducts = productsQuery.isLoading;
    const { data: settingsArr } = useSettings();
    const createOrder = useCreateOrder();

    // Convert Setting[] to Record<string, string> for the expected shape
    useEffect(() => {
        if (settingsArr) {
            if (Array.isArray(settingsArr)) {
                const mapped = (settingsArr as Array<{ key: string; value: string }>).reduce(
                    (acc, s) => ({ ...acc, [s.key]: s.value }),
                    {} as Record<string, string>
                );
                setSettings(mapped);
            } else {
                setSettings(settingsArr);
            }
        }
    }, [settingsArr]);

    // Derive categories from products
    useEffect(() => {
        if (products.length > 0) {
            const cats = ['All', ...new Set(products.map(p => p.category))] as string[];
            setCategories(cats);
        }
    }, [products]);

    // Set loading to false when both data sources are ready
    useEffect(() => {
        if (!isLoadingProducts && settingsArr) {
            setLoading(false);
        }
    }, [isLoadingProducts, settingsArr]);

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const serviceRate = (parseFloat(settings?.service_charge) || 0) / 100;
    const taxRate = (parseFloat(settings?.tax_percentage) || 0) / 100;
    const serviceFee = subtotal * serviceRate;
    const tax = (subtotal + serviceFee) * taxRate;
    const total = subtotal + serviceFee + tax;

    const addToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: number) => {
        setCart(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId: number, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

    const handleCheckout = async (method: string) => {
        if (cart.length === 0) return;
        setLoading(true);
        try {
            const orderData = {
                items: cart.map(item => ({ product_id: item.id, quantity: item.quantity })),
                payment_method: method,
                customer_email: "customer@example.com" // Default or could be input
            };
            const data = await createOrder.mutateAsync(orderData) as any;

            // Backend returns { order: {...}, invoice_url: "..." }
            setLastOrder(data.order || data);
            setInvoiceUrl(data.invoice_url || null);
            setCart([]);
            setShowSuccess(true);

            // Auto open if it's QRIS and we have a URL
            if (method === 'QRIS' && data.invoice_url) {
                window.open(data.invoice_url, '_blank');
            }
        } catch (error: any) {
            alert('Checkout failed: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const filteredProducts = selectedCategory === 'All'
        ? products
        : products.filter(p => p.category === selectedCategory);

    if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    return (
        <div className="flex h-screen bg-gray-100/50 overflow-hidden font-sans">
            {/* Products Area */}
            <div className="flex-1 flex flex-col p-6 space-y-6 overflow-hidden">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Terminal Kasir</h1>
                        <p className="text-sm text-gray-400 font-medium">Singgah Coffee - Lingkungan POS Profesional</p>
                    </div>
                    <div className="flex bg-white p-1 rounded-2xl shadow-inner border">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-6 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${cat === 'All' ? (selectedCategory === 'All' ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-gray-600') : (selectedCategory === cat ? 'bg-primary text-white shadow-lg' : 'text-gray-400 hover:text-gray-600')}`}
                            >
                                {cat === 'All' ? 'Semua' : cat}
                            </button>
                        ))}
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="bg-white rounded-[2rem] border-2 border-transparent hover:border-primary/20 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden group shadow-xl"
                            >
                                <div className="h-40 relative">
                                    <img
                                        src={getImageUrl(product.image_url) || 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=400'}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        alt={product.name}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg">
                                        <div className="text-lg font-black text-primary">Rp {formatNumber(product.price)}</div>

                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="font-bold text-gray-900 leading-tight mb-1">{product.name}</h3>
                                    <p className="text-[10px] uppercase tracking-widest font-black text-primary/40 mb-3">{product.category}</p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-gray-400">STOCK: {product.stock}</span>
                                        <div className="p-2 bg-primary/5 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                                            <Plus size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Cart Section */}
            <div className="w-[420px] glass-panel border-l-0 shadow-[-20px_0_50px_rgba(0,0,0,0.05)] flex flex-col relative z-20">
                <div className="p-8 flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-black text-gray-900">Pesanan</h2>
                        <span className="bg-primary/10 text-primary px-4 py-1 rounded-full text-xs font-black">{cart.length} PRODUK</span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-300 opacity-50 space-y-4">
                                <Monitor size={64} strokeWidth={1} />
                                <p className="text-sm font-bold uppercase tracking-widest">Keranjang Kosong</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.id} className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 flex gap-4 group hover:shadow-lg transition-all">
                                    <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md">
                                        <img src={getImageUrl(item.image_url) || 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=100'} className="w-full h-full object-cover" alt={item.name} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-sm text-gray-900 leading-tight">{item.name}</h4>
                                            <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500"><X size={16} /></button>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center bg-gray-50 rounded-lg p-1">
                                                <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md shadow-sm">-</button>
                                                <span className="w-8 text-center text-xs font-bold">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-white rounded-md shadow-sm">+</button>
                                            </div>
                                            <span className="text-xs font-black text-gray-900">Rp {formatNumber(item.price * item.quantity)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-8 space-y-3 pt-6 border-t border-gray-100">
                        <div className="flex justify-between text-sm text-gray-400 font-medium"><span>Subtotal</span><span className="text-gray-900">Rp {formatNumber(subtotal)}</span></div>
                        <div className="flex justify-between text-sm text-gray-400 font-medium"><span>Layanan ({(serviceRate * 100).toFixed(0)}%)</span><span className="text-gray-900">Rp {formatNumber(serviceFee)}</span></div>
                        <div className="flex justify-between text-sm text-gray-400 font-medium"><span>Pajak ({(taxRate * 100).toFixed(0)}%)</span><span className="text-gray-900">Rp {formatNumber(tax)}</span></div>
                        <div className="flex justify-between pt-4 border-t-2 border-dashed border-gray-100 items-baseline">
                            <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Total Bayar</span>
                            <span className="text-3xl font-black text-primary">Rp {formatNumber(total)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <button
                            onClick={() => handleCheckout('Cash')}
                            disabled={cart.length === 0}
                            className="bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all disabled:opacity-30 shadow-xl shadow-gray-200"
                        >
                            Tunai
                        </button>
                        <button
                            onClick={() => handleCheckout('QRIS')}
                            disabled={cart.length === 0}
                            className="bg-primary text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-30 shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            <CreditCard size={18} /> QRIS
                        </button>
                    </div>
                </div>
            </div>
            {/* Success & Print Modal */}
            <Dialog
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                title="Transaksi Berhasil"
                footer={
                    <div className="grid grid-cols-2 gap-3 w-full no-print">
                        <Button variant="outline" onClick={handlePrint} className="gap-2">
                            <Printer className="w-4 h-4" /> Cetak Struk
                        </Button>
                        <Button onClick={() => setShowSuccess(false)}>
                            Pesanan Baru
                        </Button>
                    </div>
                }
            >
                <div className="text-center p-4">
                    {lastOrder?.payment_status === 'Unpaid' ? (
                        <div className="animate-pulse mb-4">
                            <CreditCard className="w-16 h-16 text-primary mx-auto" />
                        </div>
                    ) : (
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    )}
                    <h2 className="text-2xl font-bold text-gray-900">
                        {lastOrder?.payment_status === 'Unpaid' ? 'Pesanan Menunggu Pembayaran' : 'Transaksi Selesai!'}
                    </h2>
                    <p className="text-gray-500 mb-6 font-medium">
                        {lastOrder?.payment_status === 'Unpaid'
                            ? 'Silakan tunjukkan QRIS ke pelanggan untuk discan.'
                            : 'Pesanan telah diproses dengan berhasil.'}
                    </p>

                    {invoiceUrl && lastOrder?.payment_status === 'Unpaid' && (
                        <Button
                            className="w-full gradient-primary text-white font-bold mb-4"
                            onClick={() => window.open(invoiceUrl, '_blank')}
                        >
                            <Zap className="w-4 h-4 mr-2" /> Buka QRIS Sekarang
                        </Button>
                    )}
                </div>

                {/* Hidden Receipt for Printing */}
                <div className="hidden">
                    {lastOrder && <Receipt {...lastOrder} />}
                </div>
            </Dialog>

            {/* Floating Receipt for Print View (Only visible when printing) */}
            <div className="sr-only whitespace-pre">
                {lastOrder && <Receipt {...lastOrder} />}
            </div>
        </div>
    )
}

export default PosTerminal
