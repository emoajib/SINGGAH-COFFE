import { MenuItem } from "../../services/productService"
import { formatCurrency } from "../../lib/utils"
import { useSettings } from "../../hooks/useSettings"

interface ReceiptProps {
    orderNumber: string
    items: { product: MenuItem, qty: number }[]
    subtotal: number
    tax: number
    service: number
    total: number
    paymentMethod: string
    cashierName: string
    queueNumber?: number
    customerName?: string
    loyaltyToken?: string
    customerPhone?: string
}

export default function Receipt({
    orderNumber,
    items,
    subtotal,
    tax,
    service,
    total,
    paymentMethod,
    cashierName,
    queueNumber,
    customerName,
    loyaltyToken,
    customerPhone
}: ReceiptProps) {
    const { data: settings } = useSettings()
    const outletName = settings?.outlet_name || "Singgah Coffee"
    const outletAddress = settings?.outlet_address || "Jl. Example No. 123, Jakarta"
    const outletLogoUrl = settings?.outlet_logo_url || ""
    const now = new Date().toLocaleString('id-ID')

    return (
        <div id="receipt-print" className="bg-white p-4 font-mono text-black">
            <div className="text-center mb-4">
                {outletLogoUrl && (
                    <div className="w-16 h-16 mx-auto mb-2 rounded-lg overflow-hidden">
                        <img
                            src={outletLogoUrl}
                            alt="Logo"
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
                <h1 className="text-lg font-bold uppercase">{outletName}</h1>
                <p className="text-[10px]">{outletAddress}</p>
                <div className="border-b border-dashed border-black my-2"></div>

                {/* Vetted by AI: Nomor Antrian & Nama Pemesan di Struk */}
                {queueNumber !== undefined && queueNumber > 0 && (
                    <div className="my-2 p-1.5 border-2 border-dashed border-black rounded">
                        <span className="text-[9px] font-bold block uppercase tracking-wider">Nomor Antrian</span>
                        <span className="text-2xl font-black block">#{queueNumber}</span>
                        {customerName && (
                            <span className="text-[10px] font-bold block mt-0.5">Nama: {customerName}</span>
                        )}
                    </div>
                )}
            </div>

            <div className="text-[10px] mb-4">
                <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{now}</span>
                </div>
                <div className="flex justify-between">
                    <span>Order:</span>
                    <span>{orderNumber}</span>
                </div>
                <div className="flex justify-between">
                    <span>Cashier:</span>
                    <span>{cashierName}</span>
                </div>
                <div className="border-b border-dashed border-black my-2"></div>
            </div>

            <div className="text-[10px] space-y-1 mb-4">
                {items.map((item, idx) => (
                    <div key={idx}>
                        <div className="flex justify-between">
                            <span className="font-bold">{item.product.name}</span>
                            <span>{formatCurrency(item.product.price * item.qty)}</span>
                        </div>
                        <div className="text-[9px] text-gray-600">
                            {item.qty} x {formatCurrency(item.product.price)}
                        </div>
                    </div>
                ))}
                <div className="border-b border-dashed border-black my-2"></div>
            </div>

            <div className="text-[10px] space-y-1">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                </div>
                {service > 0 && (
                    <div className="flex justify-between">
                        <span>Service Charge:</span>
                        <span>{formatCurrency(service)}</span>
                    </div>
                )}
                {tax > 0 && (
                    <div className="flex justify-between">
                        <span>PB1 (Tax):</span>
                        <span>{formatCurrency(tax)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-sm mt-2 border-t border-black pt-1">
                    <span>TOTAL:</span>
                    <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between mt-1">
                    <span>Payment:</span>
                    <span className="uppercase">{paymentMethod}</span>
                </div>
                <div className="border-b border-dashed border-black my-4"></div>
            </div>

            <div className="text-center text-[10px] italic">
                <p>Thank you for visiting!</p>
                <p>Singgah & Enjoy your coffee.</p>
            </div>

            {loyaltyToken && (
                <div className="mt-3 pt-2 border-t border-dashed border-black text-center text-[9px] not-italic">
                    <p className="font-bold uppercase tracking-wider">Kartu Stempel & Ulasan</p>
                    {customerPhone && <p className="text-[8px] text-gray-700">Pelanggan: {customerPhone}</p>}
                    <p className="text-[8px] mt-0.5">Kumpulkan stempel & dapatkan reward!</p>
                    <p className="text-[8px] font-mono font-bold mt-1 break-all">
                        {window.location.origin}/loyalty/{loyaltyToken}
                    </p>
                </div>
            )}
        </div>
    )
}
