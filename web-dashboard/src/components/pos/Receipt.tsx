import { MenuItem } from "../../services/productService"

interface ReceiptProps {
    orderNumber: string
    items: { product: MenuItem, qty: number }[]
    subtotal: number
    tax: number
    service: number
    total: number
    paymentMethod: string
    cashierName: string
}

export default function Receipt({
    orderNumber,
    items,
    subtotal,
    tax,
    service,
    total,
    paymentMethod,
    cashierName
}: ReceiptProps) {
    const outletName = "Singgah Coffee"
    const outletAddress = "Jl. Example No. 123, Jakarta"
    const now = new Date().toLocaleString('id-ID')

    return (
        <div id="receipt-print" className="bg-white p-4 font-mono text-black">
            <div className="text-center mb-4">
                <h1 className="text-lg font-bold uppercase">{outletName}</h1>
                <p className="text-[10px]">{outletAddress}</p>
                <div className="border-b border-dashed border-black my-2"></div>
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
                            <span>{(item.product.price * item.qty).toLocaleString()}</span>
                        </div>
                        <div className="text-[9px] text-gray-600">
                            {item.qty} x {item.product.price.toLocaleString()}
                        </div>
                    </div>
                ))}
                <div className="border-b border-dashed border-black my-2"></div>
            </div>

            <div className="text-[10px] space-y-1">
                <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{subtotal.toLocaleString()}</span>
                </div>
                {service > 0 && (
                    <div className="flex justify-between">
                        <span>Service Charge:</span>
                        <span>{service.toLocaleString()}</span>
                    </div>
                )}
                {tax > 0 && (
                    <div className="flex justify-between">
                        <span>PB1 (Tax):</span>
                        <span>{tax.toLocaleString()}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-sm mt-2 border-t border-black pt-1">
                    <span>TOTAL:</span>
                    <span>Rp {total.toLocaleString()}</span>
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
        </div>
    )
}
