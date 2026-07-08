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

async function ensureBucket(supabase: SupabaseClient): Promise<void> {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`ไม่สามารถตรวจสอบ bucket ได้: ${listError.message}`);
  }

  const bucketExists = buckets?.some((b) => b.id === 'backups');
  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket('backups', {
      public: false,
      fileSizeLimit: 52428800,
      allowedMimeTypes: ['application/sql', 'application/gzip', 'application/x-gzip', 'text/plain'],
    });
    if (createError) {
      throw new Error(`ไม่สามารถสร้าง bucket ได้: ${createError.message}`);
    }
  }
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
  notifiedCount?: number;
  notifyError?: string;
}

async function notifyAdminsAndManagers(
  supabase: SupabaseClient,
  filename: string,
  triggeredBy?: string
): Promise<{ count: number; error?: string }> {
  try {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'manager']);

    if (error) {
      console.error('Could not fetch admins/managers for notification:', error);
      return { count: 0, error: error.message };
    }

    if (!admins || admins.length === 0) {
      console.error('No admins/managers found for notification');
      return { count: 0, error: 'No admins/managers found' };
    }

    const thaiTime = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    const title = 'สำรองข้อมูลสำเร็จ';
    const message = `สำรองข้อมูล ${filename} เสร็จสมบูรณ์ เมื่อ ${thaiTime}${
      triggeredBy ? ` โดย ${triggeredBy}` : ' (อัตโนมัติ)'
    }`;

    const notifications = admins.map((u) => ({
      id: crypto.randomUUID(),
      userid: u.id,
      title,
      message,
      type: 'success',
      read: false,
      createdat: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase.from('notifications').insert(notifications);
    if (insertError) {
      console.error('Notification insert error:', insertError);
      return { count: 0, error: insertError.message };
    }

    return { count: notifications.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Notify admins/managers error:', err);
    return { count: 0, error: message };
  }
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
    let triggeredBy: string | undefined;

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

      triggeredBy = userData.email as string;
    }

    const sqlDump = await generateSqlDump(supabase);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `logical-backup-${timestamp}.sql`;

    await ensureBucket(supabase);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('backups')
      .upload(filename, new TextEncoder().encode(sqlDump), {
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

    // Bucket is private; generate a short-lived signed URL for immediate download
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('backups')
      .createSignedUrl(filename, 60 * 60);

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
    }

    const { count: notifiedCount, error: notifyError } = await notifyAdminsAndManagers(
      supabase,
      filename,
      triggeredBy
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `สำรองข้อมูลสำเร็จ (${TABLES.length} ตาราง)`,
        filename,
        path: uploadData.path,
        size: sqlDump.length,
        url: signedUrlData?.signedUrl,
        notifiedCount,
        notifyError,
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
