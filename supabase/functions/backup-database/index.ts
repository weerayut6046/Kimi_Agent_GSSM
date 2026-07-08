import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.101.0';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

// Tables to backup (in dependency order for safe restore)
const TABLES = [
  'positions',
  'skills',
  'stations',
  'profiles',
  'users',
  'profile_skills',
  'shifts',
  'schedules',
  'leave_requests',
  'swap_requests',
  'attendances',
  'daily_accounting',
  'fuel_prices',
  'fuel_inventory',
  'suppliers',
  'products',
  'fuel_deliveries',
  'product_transactions',
  'sales',
  'payroll_periods',
  'payroll_records',
  'notifications',
];

function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function escapeSqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') return escapeSqlValue(JSON.stringify(value));
  return "'" + String(value).replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

async function generateSqlDump(supabase: SupabaseClient): Promise<string> {
  const lines: string[] = [];
  lines.push('-- Gas Station Shift Manager - Logical Backup');
  lines.push(`-- Generated at: ${new Date().toISOString()}`);
  lines.push('-- NOTE: This backup contains data only (INSERT statements).');
  lines.push('-- Schema must already exist before restoring.');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  for (const tableName of TABLES) {
    try {
      const { data: rows, error } = await supabase.from(tableName).select('*');

      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
        lines.push(`-- Error fetching ${tableName}: ${error.message}`);
        continue;
      }

      if (!rows || rows.length === 0) {
        lines.push(`-- Table ${tableName} is empty`);
        continue;
      }

      lines.push(`-- Table: ${tableName} (${rows.length} rows)`);
      lines.push(`TRUNCATE TABLE ${tableName} CASCADE;`);

      const columns = Object.keys(rows[0] as Record<string, unknown>);
      const columnList = columns.map(col => `"${col}"`).join(', ');

      // Insert in batches of 100 to avoid huge statements
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const valueRows = batch.map((row: Record<string, unknown>) => {
          const values = columns.map(col => escapeSqlValue(row[col]));
          return `(${values.join(', ')})`;
        });

        lines.push(`INSERT INTO ${tableName} (${columnList}) VALUES`);
        lines.push(valueRows.join(',\n') + ';');
        lines.push('');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Exception fetching ${tableName}:`, err);
      lines.push(`-- Exception fetching ${tableName}: ${message}`);
    }
  }

  lines.push('COMMIT;');
  lines.push('');

  return lines.join('\n');
}

interface BackupResponse {
  success: boolean;
  message?: string;
  error?: string;
  filename?: string;
  path?: string;
  size?: number;
  url?: string;
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const supabase = getSupabaseClient();

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const backupSecret = req.headers.get('x-backup-secret');
    const expectedSecret = Deno.env.get('BACKUP_SECRET_KEY');

    // Allow cron jobs with secret key
    const isCronJob = backupSecret && expectedSecret && backupSecret === expectedSecret;

    if (!isCronJob) {
      if (!token) {
        return new Response(
          JSON.stringify({ success: false, error: 'กรุณาเข้าสู่ระบบ' } as BackupResponse),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token ไม่ถูกต้องหรือหมดอายุ' } as BackupResponse),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, email')
        .eq('authuid', user.id)
        .single();

      if (userError || !userData) {
        return new Response(
          JSON.stringify({ success: false, error: 'ไม่พบข้อมูลผู้ใช้' } as BackupResponse),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const allowedRoles = ['admin', 'manager'];
      if (!allowedRoles.includes(userData.role as string)) {
        return new Response(
          JSON.stringify({ success: false, error: 'เฉพาะผู้ดูแลระบบหรือผู้จัดการเท่านั้น' } as BackupResponse),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const sqlDump = await generateSqlDump(supabase);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `logical-backup-${timestamp}.sql`;
    const path = `backups/${filename}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('backups')
      .upload(path, new TextEncoder().encode(sqlDump), {
        contentType: 'application/sql',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ success: false, error: `อัปโหลดไฟล์ล้มเหลว: ${uploadError.message}` } as BackupResponse),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: publicUrl } = supabase.storage.from('backups').getPublicUrl(path);

    return new Response(
      JSON.stringify({
        success: true,
        message: `สำรองข้อมูลสำเร็จ (${TABLES.length} ตาราง)`,
        filename,
        path: uploadData.path,
        size: sqlDump.length,
        url: publicUrl.publicUrl,
      } as BackupResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('backup-database error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage } as BackupResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
