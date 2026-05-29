export interface MenuItem {
    id: string;
    name: string;
    category: string;
    price: number;
    cost: number;
    stock: number;
    sku?: string;
    image?: string;
    image_url?: string;
    description?: string;
}

export const mockMenu: MenuItem[] = [
    {
        id: "1",
        name: "Kopi Susu Gula Aren",
        category: "Coffee",
        price: 25000,
        cost: 12000,
        stock: 100,
        description: "Espresso with palm sugar and fresh milk"
    },
    {
        id: "2",
        name: "Cappuccino",
        category: "Coffee",
        price: 28000,
        cost: 14000,
        stock: 50,
        description: "Espresso with steamed milk and foam"
    },
    {
        id: "3",
        name: "Caffé Latte",
        category: "Coffee",
        price: 28000,
        cost: 14000,
        stock: 45,
    },
    {
        id: "4",
        name: "Americano",
        category: "Coffee",
        price: 22000,
        cost: 8000,
        stock: 200,
    },
    {
        id: "5",
        name: "Croissant Butter",
        category: "Food",
        price: 18000,
        cost: 9000,
        stock: 12,
    },
    {
        id: "6",
        name: "Pain Au Chocolat",
        category: "Food",
        price: 22000,
        cost: 11000,
        stock: 8,
    },
    {
        id: "7",
        name: "V60",
        category: "Manual Brew",
        price: 35000,
        cost: 15000,
        stock: 100,
        description: "Pour over coffee"
    },
]
