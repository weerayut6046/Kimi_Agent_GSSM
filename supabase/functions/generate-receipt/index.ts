import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { loadThaiFont, applyThaiFont } from '../_shared/fonts.ts';

interface ReceiptItem {
  name: string;
  quantity: number;
  unit: string;
  totalPrice: number;
}

interface ReceiptPayment {
  method: string;
  amount: number;
}

interface ReceiptData {
  saleNumber: string;
  date: string;
  time: string;
  customerName?: string;
  customerPhone?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payments: ReceiptPayment[];
  change: number;
}

function safeText(text: unknown): string {
  if (!text) return '-';
  return String(text);
}

function formatNum(n: unknown): string {
  if (n === undefined || n === null || (typeof n === 'number' && isNaN(n))) return '0.00';
  if (typeof n === 'number') return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return String(n);
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const sale: ReceiptData = await req.json();

    if (!sale.items || !Array.isArray(sale.items)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: missing items array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fontBase64 = await loadThaiFont();
    const doc = new jsPDF({ unit: 'mm', format: [80, 200], orientation: 'portrait' });
    applyThaiFont(doc, fontBase64);

    const pageWidth = 80;
    let y = 8;

    doc.setFontSize(14);
    doc.text('Gas Station', pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(10);
    doc.text('ใบเสร็จรับเงิน', pageWidth / 2, y, { align: 'center' });
    y += 6;

    doc.setFontSize(9);
    doc.text(`เลขที่: ${safeText(sale.saleNumber)}`, 4, y);
    y += 4;
    doc.text(`วันที่: ${safeText(sale.date)} ${safeText(sale.time)}`, 4, y);
    y += 4;
    if (sale.customerName) {
      doc.text(`ลูกค้า: ${safeText(sale.customerName)}`, 4, y);
      y += 4;
    }
    if (sale.customerPhone) {
      doc.text(`โทร: ${safeText(sale.customerPhone)}`, 4, y);
      y += 4;
    }

    // Separator
    doc.setLineWidth(0.3);
    doc.line(4, y, pageWidth - 4, y);
    y += 4;

    // Items header
    doc.setFontSize(9);
    doc.text('รายการ', 4, y);
    doc.text('จำนวน', pageWidth - 28, y, { align: 'center' });
    doc.text('ราคา', pageWidth - 6, y, { align: 'right' });
    y += 4;

    // Items
    sale.items.forEach((item) => {
      const name = safeText(item.name);
      const qty = `${formatNum(item.quantity)} ${safeText(item.unit)}`;
      const price = formatNum(item.totalPrice);

      const maxChars = 22;
      if (name.length > maxChars) {
        doc.text(name.substring(0, maxChars), 4, y);
        y += 3.5;
        doc.text(name.substring(maxChars), 4, y);
      } else {
        doc.text(name, 4, y);
      }
      doc.text(qty, pageWidth - 28, y, { align: 'center' });
      doc.text(price, pageWidth - 6, y, { align: 'right' });
      y += 4;
    });

    // Separator
    doc.line(4, y, pageWidth - 4, y);
    y += 4;

    // Totals
    doc.setFontSize(10);
    doc.text('รวมเงิน', 4, y);
    doc.text(formatNum(sale.subtotal), pageWidth - 6, y, { align: 'right' });
    y += 4;

    if (sale.discount > 0) {
      doc.setFontSize(9);
      doc.text('ส่วนลด', 4, y);
      doc.text(`-${formatNum(sale.discount)}`, pageWidth - 6, y, { align: 'right' });
      y += 4;
    }

    if (sale.tax > 0) {
      doc.setFontSize(9);
      doc.text('ภาษี', 4, y);
      doc.text(formatNum(sale.tax), pageWidth - 6, y, { align: 'right' });
      y += 4;
    }

    doc.setFontSize(11);
    doc.text('รวมทั้งสิ้น', 4, y);
    doc.text(formatNum(sale.total), pageWidth - 6, y, { align: 'right' });
    y += 5;

    // Payments
    doc.setFontSize(9);
    const methodLabels: Record<string, string> = {
      cash: 'เงินสด',
      credit_card: 'เครดิตการ์ด',
      debit_card: 'เดบิตการ์ด',
      qr_code: 'QR Code',
      e_wallet: 'E-Wallet',
      bank_transfer: 'โอนเงิน',
      credit: 'เครดิต',
    };

    sale.payments.forEach((p) => {
      const label = methodLabels[p.method] || p.method;
      doc.text(label, 4, y);
      doc.text(formatNum(p.amount), pageWidth - 6, y, { align: 'right' });
      y += 4;
    });

    if (sale.change > 0) {
      doc.text('ทอน', 4, y);
      doc.text(formatNum(sale.change), pageWidth - 6, y, { align: 'right' });
      y += 4;
    }

    // Separator
    doc.line(4, y, pageWidth - 4, y);
    y += 5;

    doc.setFontSize(9);
    doc.text('ขอบคุณที่ใช้บริการ', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text('Gas Station Shift Manager', pageWidth / 2, y, { align: 'center' });

    const pdfOutput = doc.output('arraybuffer');

    return new Response(pdfOutput, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${encodeURIComponent(sale.saleNumber || 'unknown')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('generate-receipt error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate receipt', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
