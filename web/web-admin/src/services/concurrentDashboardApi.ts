import { adminRequest } from './adminRequest';
export interface VariantSales { variantId: string; productId: string; name: string; variantName: string | null; sku: string | null; quantitySold: number }
export interface VariantStock { variantId: string; productId: string; name: string; sku: string; stock: number }
export interface DailyRevenuePoint { date: string; revenue: number; orders: number }
export interface ConcurrentDashboard {
  date: string; revenueToday: number | null; orderCountByStatus: Record<string, number> | null;
  top5Variants: VariantSales[] | null; lowStockVariants: VariantStock[] | null;
  revenueTrend?: DailyRevenuePoint[] | null;
  revenueTrendWeek?: DailyRevenuePoint[] | null;
  revenueTrendMonth?: DailyRevenuePoint[] | null;
  partial: boolean; failedParts: string[]; elapsedMs: number; demo: boolean; mode: 'parallel' | 'sequential';
}
export interface TopCustomer { id: string; name: string; email: string | null; orders: number; revenue: number; lastPaidAt: string | null }
export interface CustomerInsights {
  totalCustomers: number; newLast7Days: number; newLast30Days: number; newPrevious30Days: number;
  buyers: number; avgRevenuePerBuyer: number; topCustomers: TopCustomer[];
}
export const getCustomerInsights = () => adminRequest<CustomerInsights>('/dashboard/customers');
export const getConcurrentDashboard = (date: string, mode: 'parallel' | 'sequential' = 'parallel') =>
  adminRequest<ConcurrentDashboard>(`/admin/dashboard?${new URLSearchParams({ date, mode })}`);
