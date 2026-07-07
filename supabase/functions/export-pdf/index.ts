import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { jsPDF } from 'npm:jspdf@2.5.1';
import autoTable from 'npm:jspdf-autotable@3.8.2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { loadThaiFont, applyThaiFont } from '../_shared/fonts.ts';

function safeText(text: unknown): string {
  if (text === undefined || text === null) return '-';
  return String(text);
}

function formatNumber(n: unknown): string {
  if (n === undefined || n === null || (typeof n === 'number' && isNaN(n))) return '0.00';
  if (typeof n === 'number') return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return String(n);
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const { title, data, headers, filename } = await req.json();

    if (!Array.isArray(data) || !Array.isArray(headers)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: data and headers must be arrays' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load Thai font
    const fontBase64 = await loadThaiFont();

    // Create PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    applyThaiFont(doc, fontBase64);

    const now = new Date().toLocaleString('th-TH');
    const hasThaiFont = fontBase64 !== null;

    // Header
    doc.setFontSize(16);
    doc.text('Gas Station Shift Manager', 14, 15);
    doc.setFontSize(12);
    doc.text(safeText(title), 14, 22);
    doc.setFontSize(10);
    doc.text(`วันที่พิมพ์: ${now}`, 14, 28);

    // Table body
    const body = data.map((row: Record<string, unknown>) =>
      headers.map((h: string) => {
        const val = row[h];
        if (val === undefined || val === null) return '-';
        if (typeof val === 'number') return val.toLocaleString('th-TH');
        return String(val);
      })
    );

    autoTable(doc, {
      startY: 32,
      head: [headers.map((h: string) => safeText(h))],
      body,
      styles: {
        font: hasThaiFont ? 'THSarabunNew' : 'helvetica',
        fontSize: 11,
      },
      headStyles: { fillColor: [59, 130, 246] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 32 },
    });

    const pdfOutput = doc.output('arraybuffer');

    return new Response(pdfOutput, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename || 'report')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('export-pdf error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate PDF', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
