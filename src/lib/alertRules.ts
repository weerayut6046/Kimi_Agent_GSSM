import type { Alert } from '@/types';
import { supabase } from '@/lib/supabase';
import { fuelInventoryStorage, productStorage } from '@/data/inventoryStorage';

export async function checkAllRules(): Promise<Omit<Alert, 'id' | 'createdAt'>[]> {
  const alerts: Omit<Alert, 'id' | 'createdAt'>[] = [];

  // Rule 1: สต็อกน้ำมันต่ำ
  try {
    const fuelTypes: Array<'95' | 'B7' | 'B10' | 'Diesel'> = ['95', 'B7', 'B10', 'Diesel'];
    for (const fuelType of fuelTypes) {
      const latest = await fuelInventoryStorage.getLatestByType(fuelType);
      if (latest && latest.closingStock < 1000) {
        alerts.push({
          type: 'low_fuel_stock',
          title: 'สต็อกน้ำมันต่ำ',
          message: `น้ำมัน ${fuelType} เหลือ ${latest.closingStock.toLocaleString()} ลิตร (ต่ำกว่า 1,000 ลิตร)`,
          severity: 'high',
          isRead: false,
          isResolved: false,
          relatedTable: 'fuel_inventory',
          relatedId: latest.id,
        });
      }
    }
  } catch (err) {
    console.error('Rule 1 (low fuel stock) error:', err);
  }

  // Rule 2: สินค้าใกล้หมด
  try {
    const products = await productStorage.getAll();
    for (const product of products) {
      if (product.currentStock < product.minStock) {
        alerts.push({
          type: 'low_product_stock',
          title: 'สินค้าใกล้หมด',
          message: `${product.name} เหลือ ${product.currentStock} ${product.unit} (ต่ำกว่าขั้นต่ำ ${product.minStock})`,
          severity: product.currentStock === 0 ? 'critical' : 'medium',
          isRead: false,
          isResolved: false,
          relatedTable: 'products',
          relatedId: product.id,
        });
      }
    }
  } catch (err) {
    console.error('Rule 2 (low product stock) error:', err);
  }

  // Rule 3: พนักงานขาดงานติดต่อกัน 3 วัน
  try {
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    const startDate = threeDaysAgo.toISOString().split('T')[0];

    // Get schedules in the last 3 days
    const { data: schedulesData } = await supabase
      .from('schedules')
      .select('id, date, employeeid')
      .gte('date', startDate);

    const scheduleIds = (schedulesData || []).map((s) => s.id);
    const scheduleDateMap: Record<string, string> = {};
    const scheduleEmployeeMap: Record<string, string> = {};
    for (const s of schedulesData || []) {
      scheduleDateMap[s.id] = s.date;
      scheduleEmployeeMap[s.id] = s.employeeid;
    }

    if (scheduleIds.length > 0) {
      const { data: attendances } = await supabase
        .from('attendances')
        .select('*')
        .in('scheduleid', scheduleIds);

      if (attendances) {
        // Group by employee and date
        const employeeDates: Record<string, Set<string>> = {};
        const employeeAbsentDates: Record<string, Set<string>> = {};

        for (const row of attendances) {
          const scheduleId = row.scheduleid as string;
          const empId = scheduleEmployeeMap[scheduleId];
          const date = scheduleDateMap[scheduleId];
          const status = row.status as string;

          if (!empId || !date) continue;

          if (!employeeDates[empId]) employeeDates[empId] = new Set();
          if (!employeeAbsentDates[empId]) employeeAbsentDates[empId] = new Set();

          employeeDates[empId].add(date);
          if (status === 'absent') {
            employeeAbsentDates[empId].add(date);
          }
        }

        // Check 3 consecutive days
        for (const [empId, dates] of Object.entries(employeeDates)) {
          const sortedDates = Array.from(dates).sort();
          if (sortedDates.length >= 3) {
            for (let i = 0; i <= sortedDates.length - 3; i++) {
              const d1 = new Date(sortedDates[i]);
              const d2 = new Date(sortedDates[i + 1]);
              const d3 = new Date(sortedDates[i + 2]);

              if (
                d2.getTime() - d1.getTime() === 86400000 &&
                d3.getTime() - d2.getTime() === 86400000
              ) {
                const absentDates = employeeAbsentDates[empId];
                if (
                  absentDates?.has(sortedDates[i]) &&
                  absentDates.has(sortedDates[i + 1]) &&
                  absentDates.has(sortedDates[i + 2])
                ) {
                  alerts.push({
                    type: 'consecutive_absence',
                    title: 'พนักงานขาดงานติดต่อกัน 3 วัน',
                    message: `พนักงานขาดงานติดต่อกัน 3 วัน (${sortedDates[i]} ถึง ${sortedDates[i + 2]})`,
                    severity: 'high',
                    isRead: false,
                    isResolved: false,
                    relatedTable: 'attendances',
                    relatedId: empId,
                  });
                  break; // Only alert once per employee
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Rule 3 (consecutive absence) error:', err);
  }

  // Rule 4: ยอดขายต่ำกว่าค่าเฉลี่ย 70%
  try {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weekAgo = sevenDaysAgo.toISOString().split('T')[0];

    const { data: todayAccounting } = await supabase
      .from('daily_accounting')
      .select('*')
      .eq('date', today);

    const { data: weekAccounting } = await supabase
      .from('daily_accounting')
      .select('*')
      .gte('date', weekAgo)
      .lt('date', today);

    if (todayAccounting && todayAccounting.length > 0 && weekAccounting) {
      const todayTotal = todayAccounting.reduce((sum, row) => {
        const total = Number(row.totalamount || row.totalAmount || 0);
        return sum + total;
      }, 0);

      const weekTotals = weekAccounting.map(
        (row) => Number(row.totalamount || row.totalAmount || 0)
      );
      const avgSales =
        weekTotals.length > 0
          ? weekTotals.reduce((a, b) => a + b, 0) / weekTotals.length
          : 0;

      if (avgSales > 0 && todayTotal < avgSales * 0.7) {
        alerts.push({
          type: 'low_sales',
          title: 'ยอดขายต่ำผิดปกติ',
          message: `ยอดขายวันนี้ ${todayTotal.toLocaleString()} บาท ต่ำกว่าค่าเฉลี่ย 7 วัน (${Math.round(avgSales).toLocaleString()} บาท)`,
          severity: 'medium',
          isRead: false,
          isResolved: false,
          relatedTable: 'daily_accounting',
          relatedId: today,
        });
      }
    }
  } catch (err) {
    console.error('Rule 4 (low sales) error:', err);
  }

  // Rule 5: เงินสดผิดส่ง > 500 บาท
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: todayAccounting } = await supabase
      .from('daily_accounting')
      .select('*')
      .eq('date', today);

    if (todayAccounting) {
      for (const row of todayAccounting) {
        const diff = Math.abs(Number(row.difference) || 0);
        if (diff > 500) {
          alerts.push({
            type: 'cash_discrepancy',
            title: 'เงินสดผิดส่งเกิน 500 บาท',
            message: `บัญชีวันที่ ${row.date} มีผลต่างเงินสด ${diff.toLocaleString()} บาท`,
            severity: diff > 1000 ? 'critical' : 'high',
            isRead: false,
            isResolved: false,
            relatedTable: 'daily_accounting',
            relatedId: row.id as string,
          });
        }
      }
    }
  } catch (err) {
    console.error('Rule 5 (cash discrepancy) error:', err);
  }

  return alerts;
}
