import { supabase } from '@/lib/supabase';
import { fuelInventoryStorage, productStorage } from '@/data/inventoryStorage';
import type { EmployeeProfile } from '@/types';

// ============================================
// Stock Prediction
// ============================================

export interface StockPrediction {
  itemType: 'fuel' | 'product';
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  avgConsumptionPerDay: number;
  daysUntilEmpty: number;
  status: 'critical' | 'warning' | 'normal';
}

/**
 * คาดการณ์สต็อกน้ำมันจะหมดในกี่วัน
 * ใช้ยอดขายเฉลี่ย 7 วันล่าสุด / closingStock ปัจจุบัน
 */
export async function predictFuelStock(): Promise<StockPrediction[]> {
  const predictions: StockPrediction[] = [];
  const fuelTypes: Array<'95' | 'B7' | 'B10' | 'Diesel'> = ['95', 'B7', 'B10', 'Diesel'];

  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const weekAgo = sevenDaysAgo.toISOString().split('T')[0];

  for (const fuelType of fuelTypes) {
    try {
      const latest = await fuelInventoryStorage.getLatestByType(fuelType);
      if (!latest) continue;

      // Get daily accounting for the last 7 days to calculate average sales
      const { data: accountingData } = await supabase
        .from('daily_accounting')
        .select('*')
        .gte('date', weekAgo)
        .lte('date', today);

      let totalSales = 0;
      let daysWithData = 0;

      for (const row of accountingData || []) {
        const fuelSales = row.fuelsales || row.fuel_sales || {};
        const sales = Number(fuelSales[fuelType] || 0);
        if (sales > 0) {
          totalSales += sales;
          daysWithData++;
        }
      }

      const avgConsumption = daysWithData > 0 ? totalSales / daysWithData : 0;
      const daysUntilEmpty = avgConsumption > 0 ? Math.round(latest.closingStock / avgConsumption) : 999;

      let status: StockPrediction['status'] = 'normal';
      if (daysUntilEmpty <= 3 || latest.closingStock < 500) status = 'critical';
      else if (daysUntilEmpty <= 7 || latest.closingStock < 1000) status = 'warning';

      predictions.push({
        itemType: 'fuel',
        id: latest.id,
        name: `น้ำมัน ${fuelType}`,
        currentStock: latest.closingStock,
        unit: 'ลิตร',
        avgConsumptionPerDay: Math.round(avgConsumption * 100) / 100,
        daysUntilEmpty,
        status,
      });
    } catch (err) {
      console.error(`Error predicting fuel stock for ${fuelType}:`, err);
    }
  }

  return predictions.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);
}

/**
 * คาดการณ์สินค้าจะหมดในกี่วัน
 * ใช้ยอดขายเฉลี่ย 14 วันล่าสุดจาก sales/items
 */
export async function predictProductStock(): Promise<StockPrediction[]> {
  const predictions: StockPrediction[] = [];

  try {
    const products = await productStorage.getAll();
    const today = new Date().toISOString().split('T')[0];
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const twoWeeksAgo = fourteenDaysAgo.toISOString().split('T')[0];

    for (const product of products) {
      if (!product.isActive) continue;

      // Get sales data for this product in the last 14 days from sales.items jsonb
      const { data: salesData } = await supabase
        .from('sales')
        .select('date, items')
        .gte('date', twoWeeksAgo)
        .lte('date', today)
        .eq('status', 'completed');

      let totalSold = 0;
      const daysWithSales = new Set<string>();

      for (const sale of salesData || []) {
        const items = (sale.items || []) as Array<{ product_id?: string; type?: string; quantity?: number }>;
        for (const item of items) {
          if (item.product_id === product.id && item.type === 'product') {
            totalSold += Number(item.quantity || 0);
            daysWithSales.add(String(sale.date));
          }
        }
      }

      const avgConsumption = daysWithSales.size > 0 ? totalSold / daysWithSales.size : 0;
      const daysUntilEmpty = avgConsumption > 0 ? Math.round(product.currentStock / avgConsumption) : 999;

      let status: StockPrediction['status'] = 'normal';
      if (daysUntilEmpty <= 3 || product.currentStock === 0) status = 'critical';
      else if (daysUntilEmpty <= 7 || product.currentStock <= product.minStock) status = 'warning';

      predictions.push({
        itemType: 'product',
        id: product.id,
        name: product.name,
        currentStock: product.currentStock,
        unit: product.unit,
        avgConsumptionPerDay: Math.round(avgConsumption * 100) / 100,
        daysUntilEmpty,
        status,
      });
    }
  } catch (err) {
    console.error('Error predicting product stock:', err);
  }

  return predictions.sort((a, b) => a.daysUntilEmpty - b.daysUntilEmpty);
}

// ============================================
// Sales Analytics
// ============================================

export interface DailySalesData {
  date: string;
  label: string;
  totalAmount: number;
  fuelAmount: number;
  productAmount: number;
}

export interface FuelTypeData {
  name: string;
  value: number;
  liters: number;
}

/**
 * ดึงข้อมูลยอดขายรายวัน
 * @param days - จำนวนวันย้อนหลัง (default: 7)
 * @param startDate - วันเริ่มต้น (optional, ถ้ามีจะใช้แทน days)
 * @param endDate - วันสิ้นสุด (optional)
 */
export async function getDailySalesTrend(
  days: number = 7,
  startDate?: string,
  endDate?: string
): Promise<DailySalesData[]> {
  const result: DailySalesData[] = [];

  try {
    const today = new Date();
    const start = startDate ? new Date(startDate) : new Date(today);
    if (!startDate) start.setDate(today.getDate() - days + 1);
    const end = endDate ? new Date(endDate) : today;

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const { data: accountingData } = await supabase
      .from('daily_accounting')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr)
      .order('date', { ascending: true });

    // Group by date
    const dateMap: Record<string, { total: number; fuel: number; product: number }> = {};

    for (const row of accountingData || []) {
      const date = row.date as string;
      if (!dateMap[date]) dateMap[date] = { total: 0, fuel: 0, product: 0 };
      dateMap[date].total += Number(row.totalamount || row.totalAmount || 0);
      dateMap[date].fuel += Number(row.totalfuelamount || row.totalFuelAmount || 0);
    }

    // Get product sales from POS
    const { data: salesData } = await supabase
      .from('sales')
      .select('date, total, items')
      .gte('date', startStr)
      .lte('date', endStr)
      .eq('status', 'completed');

    for (const sale of salesData || []) {
      const date = sale.date as string;
      if (!dateMap[date]) dateMap[date] = { total: 0, fuel: 0, product: 0 };
      // Product sales are included in total, we need to separate them
      const items = sale.items as Array<{ type: string; totalPrice: number }>;
      if (items) {
        const productTotal = items
          .filter((i) => i.type === 'product')
          .reduce((sum, i) => sum + Number(i.totalPrice || 0), 0);
        dateMap[date].product += productTotal;
      }
    }

    // Calculate actual days in range
    const actualDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Fill in missing dates
    for (let i = 0; i < actualDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayData = dateMap[dateStr] || { total: 0, fuel: 0, product: 0 };

      result.push({
        date: dateStr,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        totalAmount: Math.round(dayData.total),
        fuelAmount: Math.round(dayData.fuel),
        productAmount: Math.round(dayData.product),
      });
    }
  } catch (err) {
    console.error('Error getting daily sales trend:', err);
  }

  return result;
}

/**
 * เปรียบเทียบยอดขายแต่ละประเภทน้ำมัน
 * @param days - จำนวนวันย้อนหลัง (default: 7)
 * @param startDate - วันเริ่มต้น (optional, ถ้ามีจะใช้แทน days)
 * @param endDate - วันสิ้นสุด (optional)
 */
export async function getFuelTypeComparison(
  days: number = 7,
  startDate?: string,
  endDate?: string
): Promise<FuelTypeData[]> {
  const fuelTypes: Array<'95' | 'B7' | 'B10' | 'Diesel'> = ['95', 'B7', 'B10', 'Diesel'];
  const result: FuelTypeData[] = [];

  try {
    const today = new Date();
    const start = startDate ? new Date(startDate) : new Date(today);
    if (!startDate) start.setDate(today.getDate() - days + 1);
    const end = endDate ? new Date(endDate) : today;

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const { data: accountingData } = await supabase
      .from('daily_accounting')
      .select('*')
      .gte('date', startStr)
      .lte('date', endStr);

    for (const fuelType of fuelTypes) {
      let totalLiters = 0;
      let totalAmount = 0;

      for (const row of accountingData || []) {
        const fuelSales = row.fuelsales || row.fuel_sales || {};
        const fuelAmounts = row.fuelamount || row.fuel_amount || {};
        totalLiters += Number(fuelSales[fuelType] || 0);
        totalAmount += Number(fuelAmounts[fuelType] || 0);
      }

      result.push({
        name: `น้ำมัน ${fuelType}`,
        value: Math.round(totalAmount),
        liters: Math.round(totalLiters * 100) / 100,
      });
    }
  } catch (err) {
    console.error('Error getting fuel type comparison:', err);
  }

  return result;
}

// ============================================
// Attendance Analytics
// ============================================

export interface AttendanceRateData {
  month: string;
  label: string;
  presentRate: number;
  lateRate: number;
  absentRate: number;
}

export interface TopEmployee {
  employee: EmployeeProfile;
  onTimeCount: number;
  lateCount: number;
  absentCount: number;
  totalScheduled: number;
  onTimeRate: number;
}

/**
 * อัตราการมาทำงานรายเดือน
 * @param months - จำนวนเดือนย้อนหลัง (default: 6)
 * @param endDate - วันสิ้นสุด (optional, default: วันนี้)
 */
export async function getAttendanceRate(
  months: number = 6,
  endDate?: string
): Promise<AttendanceRateData[]> {
  const result: AttendanceRateData[] = [];

  try {
    const today = endDate ? new Date(endDate) : new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const startDate = `${monthStr}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      // Get schedules in this month
      const { data: schedules } = await supabase
        .from('schedules')
        .select('id')
        .gte('date', startDate)
        .lte('date', endDate);

      const scheduleIds = (schedules || []).map((s) => s.id);

      if (scheduleIds.length === 0) {
        result.push({
          month: monthStr,
          label: `${month}/${year}`,
          presentRate: 0,
          lateRate: 0,
          absentRate: 0,
        });
        continue;
      }

      const { data: attendances } = await supabase
        .from('attendances')
        .select('status')
        .in('scheduleid', scheduleIds);

      const total = attendances?.length || 0;
      if (total === 0) {
        result.push({
          month: monthStr,
          label: `${month}/${year}`,
          presentRate: 0,
          lateRate: 0,
          absentRate: 0,
        });
        continue;
      }

      const present = attendances?.filter((a) => a.status === 'normal').length || 0;
      const late = attendances?.filter((a) => a.status === 'late').length || 0;
      const absent = attendances?.filter((a) => a.status === 'absent').length || 0;

      result.push({
        month: monthStr,
        label: `${month}/${year}`,
        presentRate: Math.round((present / total) * 100),
        lateRate: Math.round((late / total) * 100),
        absentRate: Math.round((absent / total) * 100),
      });
    }
  } catch (err) {
    console.error('Error getting attendance rate:', err);
  }

  return result;
}

/**
 * Top พนักงานมาตรงเวลามากที่สุด
 * @param limit - จำนวนคน (default: 5)
 * @param year - ปี (optional, default: ปีปัจจุบัน)
 * @param month - เดือน (optional, default: เดือนปัจจุบัน)
 */
export async function getTopEmployees(
  limit: number = 5,
  year?: number,
  month?: number
): Promise<TopEmployee[]> {
  const result: TopEmployee[] = [];

  try {
    const today = new Date();
    const targetYear = year ?? today.getFullYear();
    const targetMonth = month ?? today.getMonth() + 1;
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

    // Get all employees
    const { data: profiles } = await supabase.from('profiles').select('*').eq('status', 'active');

    for (const profile of profiles || []) {
      const empId = profile.id as string;

      // Get schedules for this employee
      const { data: schedules } = await supabase
        .from('schedules')
        .select('id')
        .eq('employeeid', empId)
        .gte('date', startDate)
        .lte('date', endDate);

      const scheduleIds = (schedules || []).map((s) => s.id);
      const totalScheduled = scheduleIds.length;

      if (totalScheduled === 0) continue;

      const { data: attendances } = await supabase
        .from('attendances')
        .select('status')
        .in('scheduleid', scheduleIds);

      const onTimeCount = attendances?.filter((a) => a.status === 'normal').length || 0;
      const lateCount = attendances?.filter((a) => a.status === 'late').length || 0;
      const absentCount = attendances?.filter((a) => a.status === 'absent').length || 0;
      const totalWithData = attendances?.length || 0;

      const onTimeRate = totalWithData > 0 ? Math.round((onTimeCount / totalWithData) * 100) : 0;

      result.push({
        employee: {
          id: profile.id as string,
          userId: profile.userid as string || '',
          firstName: profile.firstname as string,
          lastName: profile.lastname as string,
          fullName: profile.fullname as string || `${profile.firstname || ''} ${profile.lastname || ''}`.trim(),
          phone: profile.phone as string || '',
          avatar: profile.avatar as string || '',
          positionId: profile.positionid as string || '',
          position: { id: '', name: profile.position_name as string || '', description: '' },
          skills: [],
          stationId: profile.stationid as string || '',
          status: (profile.status as 'active' | 'inactive') || 'active',
          hireDate: profile.hiredate as string || '',
        },
        onTimeCount,
        lateCount,
        absentCount,
        totalScheduled,
        onTimeRate,
      });
    }

    return result
      .sort((a, b) => b.onTimeRate - a.onTimeRate || b.onTimeCount - a.onTimeCount)
      .slice(0, limit);
  } catch (err) {
    console.error('Error getting top employees:', err);
  }

  return result;
}

// ============================================
// Quick Stats
// ============================================

export interface DashboardAnalytics {
  salesChangePercent: number;
  avgDailySales: number;
  bestSellingFuel: string;
  attendanceRateToday: number;
}

// Helper functions for date range calculations
function sevenDaysAgoStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

/**
 * สถิติสรุปสำหรับ Dashboard
 */
export async function getDashboardAnalytics(): Promise<DashboardAnalytics> {
  const result: DashboardAnalytics = {
    salesChangePercent: 0,
    avgDailySales: 0,
    bestSellingFuel: '-',
    attendanceRateToday: 0,
  };

  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = sevenDaysAgoStr();

    // Sales change: compare the most recent day with data vs the previous day with data
    const lookbackDays = 30;
    const lookbackStart = new Date();
    lookbackStart.setDate(lookbackStart.getDate() - lookbackDays);
    const lookbackStartStr = lookbackStart.toISOString().split('T')[0];

    // POS sales totals by date
    const { data: posSalesRange } = await supabase
      .from('sales')
      .select('date, total')
      .eq('status', 'completed')
      .gte('date', lookbackStartStr)
      .lte('date', today);

    const posByDate: Record<string, number> = {};
    for (const sale of posSalesRange || []) {
      const date = sale.date as string;
      posByDate[date] = (posByDate[date] || 0) + Number(sale.total || 0);
    }

    // Daily accounting totals by date
    const { data: accountingRange } = await supabase
      .from('daily_accounting')
      .select('date, totalamount')
      .eq('isdeleted', false)
      .gte('date', lookbackStartStr)
      .lte('date', today);

    const accountingByDate: Record<string, number> = {};
    for (const row of accountingRange || []) {
      const date = row.date as string;
      accountingByDate[date] = (accountingByDate[date] || 0) + Number(row.totalamount || 0);
    }

    // Combine: prefer POS if available, otherwise daily_accounting
    const allDates = new Set([...Object.keys(posByDate), ...Object.keys(accountingByDate)]);
    const dailyTotals = Array.from(allDates)
      .map((date) => {
        const posTotal = posByDate[date] || 0;
        const accountingTotal = accountingByDate[date] || 0;
        return {
          date,
          total: posTotal > 0 ? posTotal : accountingTotal,
        };
      })
      .filter((d) => d.total > 0)
      .sort((a, b) => (a.date > b.date ? -1 : 1));

    if (dailyTotals.length >= 2) {
      const latest = dailyTotals[0];
      const previous = dailyTotals[1];
      result.salesChangePercent = Math.round(((latest.total - previous.total) / previous.total) * 100);
    }

    // Average daily sales: last 7 days (use POS sales first, fallback to daily_accounting)
    const { data: weekPosSales } = await supabase
      .from('sales')
      .select('total')
      .eq('status', 'completed')
      .gte('date', weekAgo)
      .lte('date', today);

    const weekPosTotal = (weekPosSales || []).reduce((sum, r) => sum + Number(r.total || 0), 0);

    if (weekPosSales && weekPosSales.length > 0) {
      result.avgDailySales = Math.round(weekPosTotal / 7);
    } else {
      const { data: weekSales } = await supabase
        .from('daily_accounting')
        .select('totalamount')
        .eq('isdeleted', false)
        .gte('date', weekAgo)
        .lte('date', today);

      const weekTotal = (weekSales || []).reduce((sum, r) => sum + Number(r.totalamount || 0), 0);
      const daysCount = weekSales && weekSales.length > 0 ? weekSales.length : 1;
      result.avgDailySales = Math.round(weekTotal / daysCount);
    }

    // Best selling fuel: last 7 days (from daily_accounting fuel sales)
    const { data: weekAccounting } = await supabase
      .from('daily_accounting')
      .select('*')
      .eq('isdeleted', false)
      .gte('date', weekAgo)
      .lte('date', today);

    const fuelTotals: Record<string, number> = { '95': 0, 'B7': 0, 'B10': 0, 'Diesel': 0 };
    for (const row of weekAccounting || []) {
      const fuelSales = row.fuelsales || row.fuel_sales || {};
      for (const [key, value] of Object.entries(fuelSales)) {
        fuelTotals[key] = (fuelTotals[key] || 0) + Number(value || 0);
      }
    }

    const bestFuel = Object.entries(fuelTotals).sort((a, b) => b[1] - a[1])[0];
    if (bestFuel && bestFuel[1] > 0) {
      result.bestSellingFuel = `น้ำมัน ${bestFuel[0]}`;
    }

    // Attendance rate: today
    const { data: todaySchedules } = await supabase
      .from('schedules')
      .select('id')
      .eq('date', today);

    const scheduleIds = (todaySchedules || []).map((s) => s.id);
    if (scheduleIds.length > 0) {
      const { data: todayAttendances } = await supabase
        .from('attendances')
        .select('status')
        .in('scheduleid', scheduleIds);

      const total = todayAttendances?.length || 0;
      const present = todayAttendances?.filter((a: { status: string }) => a.status === 'normal' || a.status === 'late').length || 0;
      result.attendanceRateToday = total > 0 ? Math.round((present / total) * 100) : 0;
    }
  } catch (err) {
    console.error('Error getting dashboard analytics:', err);
  }

  return result;
}
