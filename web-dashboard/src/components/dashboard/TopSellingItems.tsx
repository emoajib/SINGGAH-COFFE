import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

interface TopSellingItemsProps {
    items: { name: string, category: string, sales: number }[]
}

export function TopSellingItems({ items }: TopSellingItemsProps) {
    return (
        <Card className="col-span-1 md:col-span-2">
            <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
                <CardDescription>Most popular products today</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {(items || []).map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                                    {index + 1}
                                </div>
                                <div>
                                    <p className="font-medium leading-none">{item.name}</p>
                                    <p className="text-sm text-muted-foreground">{item.category}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold">{item.sales} sold</span>
                            </div>
                        </div>
                    ))}
                    {items.length === 0 && (
                        <p className="text-center text-gray-400 py-4 text-xs">No sales yet today</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
