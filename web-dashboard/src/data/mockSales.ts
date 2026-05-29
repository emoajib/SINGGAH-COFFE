export interface Transaction {
    id: string;
    orderNumber: string;
    date: string;
    time: string;
    cashier: string;
    amount: number;
    paymentMethod: 'Cash' | 'QRIS' | 'Debit' | 'Credit';
    status: 'Completed' | 'Void' | 'Pending';
    items: string[];
}

export const mockTransactions: Transaction[] = [
    {
        id: "TRX-001",
        orderNumber: "#ORD-8821",
        date: "2024-01-30",
        time: "14:30",
        cashier: "Budi (Morning Shift)",
        amount: 54000,
        paymentMethod: 'QRIS',
        status: 'Completed',
        items: ["Kopi Susu Gula Aren (2)", "Croissant (1)"]
    },
    {
        id: "TRX-002",
        orderNumber: "#ORD-8822",
        date: "2024-01-30",
        time: "14:35",
        cashier: "Budi (Morning Shift)",
        amount: 28000,
        paymentMethod: 'Cash',
        status: 'Completed',
        items: ["Cappuccino (1)"]
    },
    {
        id: "TRX-003",
        orderNumber: "#ORD-8823",
        date: "2024-01-30",
        time: "14:42",
        cashier: "Budi (Morning Shift)",
        amount: 120000,
        paymentMethod: 'Debit',
        status: 'Completed',
        items: ["V60 (2)", "Pasta (1)", "Mineral Water (2)"]
    },
    {
        id: "TRX-004",
        orderNumber: "#ORD-8820",
        date: "2024-01-30",
        time: "14:15",
        cashier: "Budi (Morning Shift)",
        amount: 0,
        paymentMethod: 'Cash',
        status: 'Void',
        items: ["Wrong Order"]
    }
]
