import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"

interface SalesChartProps {
    data: { name: string, total: number }[]
}

export function SalesChart({ data }: SalesChartProps) {
    return (
        <Card className="col-span-1 md:col-span-3">
            <CardHeader>
                <CardTitle>Today's Sales Trend</CardTitle>
                <CardDescription>Real-time sales performance graph</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4B3621" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#4B3621" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `Rp${value / 1000}k`}
                            />
                            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-gray-200" />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                formatter={(value: number) => [`Rp ${value.toLocaleString()}`, 'Total Sales']}
                            />
                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#4B3621"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorTotal)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
