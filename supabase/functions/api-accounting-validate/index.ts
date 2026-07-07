import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.101.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

function getSupabaseClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface MeterReading {
  dispenser1: {
    nozzle1: { start: number; end: number };
    nozzle2: { start: number; end: number };
  };
  dispenser2: {
    nozzle1: { start: number; end: number };
    nozzle2: { start: number; end: number };
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  calculations: {
    fuelSales: { '95': number; 'B7': number; 'B10': number; 'Diesel': number };
    fuelAmount: { '95': number; 'B7': number; 'B10': number; 'Diesel': number };
    totalFuelAmount: number;
    totalCash: number;
    difference: number;
  };
}

function calculateFromMeter(meter: MeterReading, prices: Record<string, number>): ValidationResult['calculations'] {
  const d1n1Sales = Math.max(0, Math.round((meter.dispenser1.nozzle1.end - meter.dispenser1.nozzle1.start) * 100) / 100);
  const d1n2Sales = Math.max(0, Math.round((meter.dispenser1.nozzle2.end - meter.dispenser1.nozzle2.start) * 100) / 100);
  const d2n1Sales = Math.max(0, Math.round((meter.dispenser2.nozzle1.end - meter.dispenser2.nozzle1.start) * 100) / 100);
  const d2n2Sales = Math.max(0, Math.round((meter.dispenser2.nozzle2.end - meter.dispenser2.nozzle2.start) * 100) / 100);

  const fuelSales = {
    '95': Math.round((d1n1Sales + d2n1Sales) * 100) / 100,
    'B7': d2n2Sales,
    'B10': 0,
    'Diesel': d1n2Sales,
  };

  const fuelAmount = {
    '95': Math.round(fuelSales['95'] * (prices['95'] || 0) * 100) / 100,
    'B7': Math.round(fuelSales['B7'] * (prices['B7'] || 0) * 100) / 100,
    'B10': 0,
    'Diesel': Math.round(fuelSales['Diesel'] * (prices['Diesel'] || 0) * 100) / 100,
  };

  const totalFuelAmount = Math.round(
    (fuelAmount['95'] + fuelAmount['B7'] + fuelAmount['B10'] + fuelAmount['Diesel']) * 100
  ) / 100;

  return {
    fuelSales,
    fuelAmount,
    totalFuelAmount,
    totalCash: 0, // Will be populated from request
    difference: 0,
  };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient(req);
    const body = await req.json();

    const {
      date,
      shiftId,
      employeeId,
      meterReading,
      cashAmount,
      actualCashCounted,
      items,
      fuelPrices,
    } = body;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!date) errors.push('กรุณาระบุวันที่');
    if (!shiftId) errors.push('กรุณาระบุกะ');
    if (!employeeId) errors.push('กรุณาระบุพนักงาน');
    if (!meterReading) errors.push('กรุณากรอกค่ามิเตอร์');

    // Validate meter readings
    if (meterReading) {
      const d1n1 = meterReading.dispenser1?.nozzle1;
      const d1n2 = meterReading.dispenser1?.nozzle2;
      const d2n1 = meterReading.dispenser2?.nozzle1;
      const d2n2 = meterReading.dispenser2?.nozzle2;

      if (d1n1 && d1n1.end < d1n1.start) errors.push('มิเตอร์ตู้ 1 หัวจ่าย 1: ค่าสิ้นสุดต้องมากกว่าค่าเริ่มต้น');
      if (d1n2 && d1n2.end < d1n2.start) errors.push('มิเตอร์ตู้ 1 หัวจ่าย 2: ค่าสิ้นสุดต้องมากกว่าค่าเริ่มต้น');
      if (d2n1 && d2n1.end < d2n1.start) errors.push('มิเตอร์ตู้ 2 หัวจ่าย 1: ค่าสิ้นสุดต้องมากกว่าค่าเริ่มต้น');
      if (d2n2 && d2n2.end < d2n2.start) errors.push('มิเตอร์ตู้ 2 หัวจ่าย 2: ค่าสิ้นสุดต้องมากกว่าค่าเริ่มต้น');
    }

    // Check for duplicate entries
    if (date && shiftId && employeeId) {
      const { data: existing } = await supabase
        .from('daily_accounting')
        .select('id')
        .eq('date', date)
        .eq('shiftid', shiftId)
        .eq('employeeid', employeeId)
        .maybeSingle();

      if (existing) {
        warnings.push('มีข้อมูลบัญชีรายวันสำหรับวัน/กะ/พนักงานนี้อยู่แล้ว การบันทึกจะเป็นการอัปเดต');
      }
    }

    // Calculate fuel sales and amounts
    let calculations: ValidationResult['calculations'] = {
      fuelSales: { '95': 0, 'B7': 0, 'B10': 0, 'Diesel': 0 },
      fuelAmount: { '95': 0, 'B7': 0, 'B10': 0, 'Diesel': 0 },
      totalFuelAmount: 0,
      totalCash: cashAmount || 0,
      difference: 0,
    };

    if (meterReading && fuelPrices) {
      calculations = calculateFromMeter(meterReading, fuelPrices);
      calculations.totalCash = cashAmount || 0;
      calculations.difference = Math.round(
        ((actualCashCounted || 0) + (items?.twoT || 0) + (items?.capital || 0) + (items?.transfer || 0) + (items?.others || 0) - calculations.totalFuelAmount) * 100
      ) / 100;

      // Check if difference is significant
      if (Math.abs(calculations.difference) > 500) {
        warnings.push(`ยอดต่างกัน ${calculations.difference.toLocaleString('th-TH')} บาท กรุณาตรวจสอบความถูกต้อง`);
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      calculations,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('api-accounting-validate error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to validate accounting data', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
