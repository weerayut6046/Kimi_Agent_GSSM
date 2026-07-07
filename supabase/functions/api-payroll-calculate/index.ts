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

// Thai personal income tax calculation (progressive)
function calculateThaiTax(income: number): number {
  const brackets = [
    { limit: 150000, rate: 0 },
    { limit: 300000, rate: 0.05 },
    { limit: 500000, rate: 0.10 },
    { limit: 750000, rate: 0.15 },
    { limit: 1000000, rate: 0.20 },
    { limit: 2000000, rate: 0.25 },
    { limit: 5000000, rate: 0.30 },
    { limit: Infinity, rate: 0.35 },
  ];

  let tax = 0;
  let previousLimit = 0;

  for (const bracket of brackets) {
    if (income > previousLimit) {
      const taxableAtBracket = Math.min(income, bracket.limit) - previousLimit;
      tax += taxableAtBracket * bracket.rate;
      previousLimit = bracket.limit;
    } else {
      break;
    }
  }

  return Math.max(0, Math.round(tax));
}

interface PayrollCalculationRequest {
  employeeId: string;
  periodId: string;
  startDate: string;
  endDate: string;
  hourlyRate?: number;
  shiftRate?: number;
  deductions?: { type: string; amount: number }[];
  allowances?: { type: string; amount: number }[];
}

interface PayrollCalculationResult {
  employeeId: string;
  periodId: string;
  baseSalary: number;
  overtimePay: number;
  allowances: number;
  deductions: number;
  tax: number;
  netSalary: number;
  details: {
    totalShifts: number;
    totalHours: number;
    lateDays: number;
    absentDays: number;
    leaveDays: number;
  };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient(req);
    const body: PayrollCalculationRequest = await req.json();

    const { employeeId, startDate, endDate, hourlyRate = 50, shiftRate = 350, deductions = [], allowances = [] } = body;

    // Fetch employee data
    const { data: employee } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (!employee) {
      return new Response(
        JSON.stringify({ error: 'Employee not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch schedules in period
    const { data: schedules } = await supabase
      .from('schedules')
      .select('*')
      .eq('employeeid', employeeId)
      .gte('date', startDate)
      .lte('date', endDate);

    // Fetch attendances in period
    const { data: attendances } = await supabase
      .from('attendances')
      .select('*')
      .eq('employeeid', employeeId)
      .gte('date', startDate)
      .lte('date', endDate);

    // Fetch leave requests in period (approved)
    const { data: leaves } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('employeeid', employeeId)
      .eq('status', 'approved')
      .gte('startdate', startDate)
      .lte('enddate', endDate);

    const scheduleList = schedules || [];
    const attendanceList = attendances || [];
    const leaveList = leaves || [];

    // Calculate stats
    const totalShifts = scheduleList.length;
    const totalHours = totalShifts * 8; // Assuming 8 hours per shift
    const lateDays = attendanceList.filter((a: Record<string, unknown>) => a.status === 'late').length;
    const absentDays = attendanceList.filter((a: Record<string, unknown>) => a.status === 'absent').length;
    const leaveDays = leaveList.reduce((sum: number, l: Record<string, unknown>) => {
      const start = new Date(l.startdate as string);
      const end = new Date(l.enddate as string);
      return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }, 0);

    // Calculate salary
    const baseSalary = totalShifts * shiftRate;
    const overtimePay = 0; // TODO: Implement OT calculation
    const totalAllowances = allowances.reduce((sum, a) => sum + a.amount, 0);
    const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0) + (absentDays * shiftRate);
    const grossSalary = baseSalary + overtimePay + totalAllowances;
    const tax = calculateThaiTax(grossSalary);
    const netSalary = grossSalary - tax - totalDeductions;

    const result: PayrollCalculationResult = {
      employeeId,
      periodId: body.periodId,
      baseSalary,
      overtimePay,
      allowances: totalAllowances,
      deductions: totalDeductions,
      tax,
      netSalary,
      details: {
        totalShifts,
        totalHours,
        lateDays,
        absentDays,
        leaveDays,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('api-payroll-calculate error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to calculate payroll', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
