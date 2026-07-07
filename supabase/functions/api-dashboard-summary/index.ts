import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.101.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// Initialize Supabase client with service role for server-side operations
function getSupabaseClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Get current date in Thailand timezone (UTC+7)
function getToday(): string {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 7);
  return now.toISOString().split('T')[0];
}

interface DashboardSummary {
  stats: {
    totalEmployees: number;
    activeEmployees: number;
    todayShifts: number;
    pendingLeaves: number;
    pendingSwaps: number;
    lateToday: number;
    absentToday: number;
  };
  myTodaySchedule: unknown | null;
  recentLeaves: unknown[];
  recentSwaps: unknown[];
  analytics: {
    fuelStockPrediction: unknown | null;
    productStockPrediction: unknown | null;
    salesTrend: unknown | null;
    attendanceRate: unknown | null;
  } | null;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient(req);
    const today = getToday();

    // Extract user ID from JWT token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    let userId: string | null = null;
    let profileId: string | null = null;

    if (token) {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
        // Get profile ID from users table
        const { data: userData } = await supabase
          .from('users')
          .select('profileid')
          .eq('authuid', userId)
          .single();
        profileId = userData?.profileid || null;
      }
    }

    // Fetch all required data in parallel
    const [
      { data: employees },
      { data: schedules },
      { data: leaveRequests },
      { data: swapRequests },
      { data: attendances },
      { data: fuelInventory },
      { data: products },
      { data: dailyAccounting },
    ] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('schedules').select('*').eq('date', today),
      supabase.from('leave_requests').select('*').eq('status', 'pending'),
      supabase.from('swap_requests').select('*').eq('status', 'pending'),
      supabase.from('attendances').select('*').eq('date', today),
      supabase.from('fuel_inventory').select('*').order('createdat', { ascending: false }).limit(10),
      supabase.from('products').select('*').order('createdat', { ascending: false }).limit(10),
      supabase.from('daily_accounting').select('*').order('date', { ascending: false }).limit(30),
    ]);

    const employeeList = employees || [];
    const scheduleList = schedules || [];
    const leaveList = leaveRequests || [];
    const swapList = swapRequests || [];
    const attendanceList = attendances || [];

    // Calculate stats
    const stats = {
      totalEmployees: employeeList.length,
      activeEmployees: employeeList.filter((e: Record<string, unknown>) => e.status === 'active').length,
      todayShifts: scheduleList.length,
      pendingLeaves: leaveList.length,
      pendingSwaps: swapList.length,
      lateToday: attendanceList.filter((a: Record<string, unknown>) => a.status === 'late').length,
      absentToday: attendanceList.filter((a: Record<string, unknown>) => a.status === 'absent').length,
    };

    // Get today's schedule for current user
    const myTodaySchedule = profileId
      ? scheduleList.find((s: Record<string, unknown>) => s.employeeid === profileId) || null
      : null;

    // Recent pending requests
    const recentLeaves = leaveList.slice(0, 5);
    const recentSwaps = swapList.slice(0, 5);

    // Simple analytics (can be expanded)
    const analytics = {
      fuelStockPrediction: fuelInventory && fuelInventory.length > 0 ? {
        currentStock: (fuelInventory as Record<string, unknown>[])[0],
        daysRemaining: 7, // Placeholder
      } : null,
      productStockPrediction: products && products.length > 0 ? {
        lowStockCount: (products as Record<string, unknown>[]).filter((p) => (p.quantity as number) < 10).length,
      } : null,
      salesTrend: dailyAccounting && dailyAccounting.length > 0 ? {
        last30Days: (dailyAccounting as Record<string, unknown>[]).map((d) => ({
          date: d.date,
          total: d.actualcashcounted || 0,
        })),
      } : null,
      attendanceRate: {
        present: attendanceList.filter((a: Record<string, unknown>) => a.status === 'present' || a.status === 'late').length,
        total: attendanceList.length,
      },
    };

    const summary: DashboardSummary = {
      stats,
      myTodaySchedule,
      recentLeaves,
      recentSwaps,
      analytics,
    };

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('api-dashboard-summary error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch dashboard summary', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
