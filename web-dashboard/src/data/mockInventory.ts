export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    sku: string;
    currentStock: number;
    minStock: number;
    unit: string;
    supplier: string;
    lastRestock: string;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export const mockInventory: InventoryItem[] = [
    {
        id: "1",
        name: "Espresso Beans (Arabica)",
        category: "Ingredients",
        sku: "ING-001",
        currentStock: 5.5,
        minStock: 2,
        unit: "kg",
        supplier: "Java Roastery",
        lastRestock: "2024-01-25",
        status: 'In Stock'
    },
    {
        id: "2",
        name: "Full Cream Milk",
        category: "Ingredients",
        sku: "ING-002",
        currentStock: 12,
        minStock: 24,
        unit: "liter",
        supplier: "Greenfield",
        lastRestock: "2024-01-28",
        status: 'Low Stock'
    },
    {
        id: "3",
        name: "Palm Sugar (Gula Aren)",
        category: "Ingredients",
        sku: "ING-003",
        currentStock: 8,
        minStock: 5,
        unit: "liter",
        supplier: "Local Farm",
        lastRestock: "2024-01-15",
        status: 'In Stock'
    },
    {
        id: "4",
        name: "Paper Cup 12oz",
        category: "Packaging",
        sku: "PKG-001",
        currentStock: 150,
        minStock: 500,
        unit: "pcs",
        supplier: "Packindo",
        lastRestock: "2024-01-10",
        status: 'Low Stock'
    },
    {
        id: "5",
        name: "Chocolate Powder",
        category: "Ingredients",
        sku: "ING-004",
        currentStock: 0.5,
        minStock: 2,
        unit: "kg",
        supplier: "Cocoa Indo",
        lastRestock: "2023-12-30",
        status: 'Out of Stock'
    }
]
