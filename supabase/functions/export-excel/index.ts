import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as XLSX from 'npm:xlsx@0.18.5';
import { corsHeaders, handleCors } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { data, filename, sheetName = 'Sheet1' } = await req.json();

    if (!Array.isArray(data)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: data must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Write to buffer
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    return new Response(buf, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename || 'export')}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('export-excel error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate Excel file', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
