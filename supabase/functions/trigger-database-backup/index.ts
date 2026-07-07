import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.101.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// Initialize Supabase client with service role for server-side operations
function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

interface GitHubDispatchResponse {
  success: boolean;
  message?: string;
  error?: string;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();

    // Extract user token from Authorization header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'กรุณาเข้าสู่ระบบ' } as GitHubDispatchResponse),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token ไม่ถูกต้องหรือหมดอายุ' } as GitHubDispatchResponse),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user role from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role, email')
      .eq('authuid', user.id)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ success: false, error: 'ไม่พบข้อมูลผู้ใช้' } as GitHubDispatchResponse),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedRoles = ['admin', 'manager'];
    if (!allowedRoles.includes(userData.role as string)) {
      return new Response(
        JSON.stringify({ success: false, error: 'เฉพาะผู้ดูแลระบบหรือผู้จัดการเท่านั้นที่สามารถสำรองข้อมูลได้' } as GitHubDispatchResponse),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get GitHub configuration from environment variables
    const githubPat = Deno.env.get('GITHUB_PAT');
    const repoOwner = Deno.env.get('GITHUB_REPO_OWNER');
    const repoName = Deno.env.get('GITHUB_REPO_NAME');

    if (!githubPat || !repoOwner || !repoName) {
      console.error('Missing GitHub configuration');
      return new Response(
        JSON.stringify({ success: false, error: 'ระบบยังไม่ได้ตั้งค่า GitHub backup' } as GitHubDispatchResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Trigger GitHub Actions workflow via repository_dispatch
    const dispatchUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/dispatches`;
    const dispatchBody = {
      event_type: 'database-backup',
      client_payload: {
        triggered_by: userData.email || user.email || 'unknown',
        source: 'web',
        triggered_at: new Date().toISOString(),
      },
    };

    const githubResponse = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubPat}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dispatchBody),
    });

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      console.error('GitHub dispatch failed:', githubResponse.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `GitHub API ตอบกลับด้วย HTTP ${githubResponse.status}: ${errorText}`,
        } as GitHubDispatchResponse),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'ส่งคำสั่งสำรองข้อมูลไปยัง GitHub Actions สำเร็จ กรุณาตรวจสอบสถานะในหน้า Actions',
      } as GitHubDispatchResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('trigger-database-backup error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage } as GitHubDispatchResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
