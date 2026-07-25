import api from '../lib/api'

export const reportService = {
  getProfitLoss: async (): Promise<{ revenue: number; cogs: number; grossProfit: number; grossProfitMargin: number }> => {
    const response = await api.get('/reports/profit-loss')
    return response.data
  },
  
  getSalesSummary: async (): Promise<{
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  }> => {
    const response = await api.get('/reports/sales-summary')
    return response.data
  }
}