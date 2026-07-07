import type { DailyAccounting } from '@/types';
import type { Sale } from '@/types/pos';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ---------------------------------------------------------------------------
// Thai Font Helper
// ---------------------------------------------------------------------------

async function loadThaiFontBase64(): Promise<string | null> {
  try {
    const response = await fetch('/fonts/THSarabunNew.ttf');
    if (!response.ok) {
      console.warn('Failed to fetch Thai font:', response.status);
      return null;
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.warn('Failed to load Thai font:', error);
    return null;
  }
}

function applyThaiFont(doc: jsPDF, fontBase64: string | null): void {
  if (fontBase64) {
    try {
      doc.addFileToVFS('THSarabunNew.ttf', fontBase64);
      doc.addFont('THSarabunNew.ttf', 'THSarabunNew', 'normal');
      doc.setFont('THSarabunNew');
    } catch {
      doc.setFont('helvetica');
    }
  } else {
    doc.setFont('helvetica');
  }
}

function safeText(text: unknown): string {
  if (text === undefined || text === null) return '-';
  return String(text);
}

function formatNumber(n: unknown): string {
  if (n === undefined || n === null || (typeof n === 'number' && isNaN(n))) return '0.00';
  if (typeof n === 'number') return n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return String(n);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Excel Export (Client-side)
// ---------------------------------------------------------------------------

export async function exportToExcel(
  data: unknown[],
  filename: string,
  sheetName = 'Sheet1'
): Promise<void> {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    downloadBlob(blob, `${filename}.xlsx`);
    toast.success('Export Excel สำเร็จ');
  } catch (err) {
    toast.error('Export Excel ล้มเหลว');
    console.error(err);
  }
}

export async function exportTableToExcel(
  tableData: unknown[],
  headers: Record<string, string>,
  filename: string
): Promise<void> {
  try {
    const mapped = tableData.map((row: unknown) => {
      const r = row as Record<string, unknown>;
      const obj: Record<string, unknown> = {};
      Object.entries(headers).forEach(([key, label]) => {
        obj[label] = r[key];
      });
      return obj;
    });
    await exportToExcel(mapped, filename, 'Data');
  } catch (err) {
    toast.error('Export Excel ล้มเหลว');
    console.error(err);
  }
}

export async function exportDailyAccountingToExcel(
  accounts: DailyAccounting[],
  filename: string
): Promise<void> {
  const rows = accounts.map((a) => ({
    วันที่: a.date,
    กะ: a.shift?.name || '-',
    พนักงาน: a.employee?.fullName || '-',
    '95 (ลิตร)': a.fuelSales?.['95'] ?? 0,
    'B7 (ลิตร)': a.fuelSales?.['B7'] ?? 0,
    'B10 (ลิตร)': a.fuelSales?.['B10'] ?? 0,
    'Diesel (ลิตร)': a.fuelSales?.['Diesel'] ?? 0,
    'ยอดเงินตู้ (บาท)': a.cashAmount ?? 0,
    'เงินสดนับได้ (บาท)': a.actualCashCounted ?? 0,
    '2T (บาท)': a.items?.twoT ?? 0,
    'เงินทุน (บาท)': a.items?.capital ?? 0,
    'เงินโอน (บาท)': a.items?.transfer ?? 0,
    'อื่นๆ (บาท)': a.items?.others ?? 0,
    'ยอดรวม (บาท)':
      (a.actualCashCounted ?? 0) +
      (a.items?.twoT ?? 0) +
      (a.items?.capital ?? 0) +
      (a.items?.transfer ?? 0) +
      (a.items?.others ?? 0),
    'ขาด/เกิน (บาท)': a.difference ?? 0,
    หมายเหตุ: a.note || '',
  }));
  await exportToExcel(rows, filename, 'บัญชีรายวัน');
}

// ---------------------------------------------------------------------------
// PDF Export (Client-side)
// ---------------------------------------------------------------------------

export async function exportReportToPdf(
  title: string,
  data: unknown[],
  headers: string[],
  filename: string
): Promise<void> {
  try {
    const fontBase64 = await loadThaiFontBase64();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    applyThaiFont(doc, fontBase64);

    const now = new Date().toLocaleString('th-TH');
    const hasThaiFont = fontBase64 !== null;

    doc.setFontSize(16);
    doc.text('Gas Station Shift Manager', 14, 15);
    doc.setFontSize(12);
    doc.text(safeText(title), 14, 22);
    doc.setFontSize(10);
    doc.text(`วันที่พิมพ์: ${now}`, 14, 28);

    const body = data.map((row: unknown) =>
      headers.map((h: string) => {
        const val = (row as Record<string, unknown>)[h];
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

    doc.save(`${filename}.pdf`);
    toast.success('Export PDF สำเร็จ');
  } catch (err) {
    toast.error('Export PDF ล้มเหลว');
    console.error(err);
  }
}

export async function exportReceiptToPdf(
  sale: Sale,
  filename: string
): Promise<void> {
  try {
    const fontBase64 = await loadThaiFontBase64();
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

    doc.setLineWidth(0.3);
    doc.line(4, y, pageWidth - 4, y);
    y += 4;

    doc.setFontSize(9);
    doc.text('รายการ', 4, y);
    doc.text('จำนวน', pageWidth - 28, y, { align: 'center' });
    doc.text('ราคา', pageWidth - 6, y, { align: 'right' });
    y += 4;

    sale.items.forEach((item) => {
      const name = safeText(item.name);
      const qty = `${formatNumber(item.quantity)} ${safeText(item.unit)}`;
      const price = formatNumber(item.totalPrice);

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

    doc.line(4, y, pageWidth - 4, y);
    y += 4;

    doc.setFontSize(10);
    doc.text('รวมเงิน', 4, y);
    doc.text(formatNumber(sale.subtotal), pageWidth - 6, y, { align: 'right' });
    y += 4;

    if (sale.discount > 0) {
      doc.setFontSize(9);
      doc.text('ส่วนลด', 4, y);
      doc.text(`-${formatNumber(sale.discount)}`, pageWidth - 6, y, { align: 'right' });
      y += 4;
    }

    if (sale.tax > 0) {
      doc.setFontSize(9);
      doc.text('ภาษี', 4, y);
      doc.text(formatNumber(sale.tax), pageWidth - 6, y, { align: 'right' });
      y += 4;
    }

    doc.setFontSize(11);
    doc.text('รวมทั้งสิ้น', 4, y);
    doc.text(formatNumber(sale.total), pageWidth - 6, y, { align: 'right' });
    y += 5;

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
      doc.text(formatNumber(p.amount), pageWidth - 6, y, { align: 'right' });
      y += 4;
    });

    if (sale.change > 0) {
      doc.text('ทอน', 4, y);
      doc.text(formatNumber(sale.change), pageWidth - 6, y, { align: 'right' });
      y += 4;
    }

    doc.line(4, y, pageWidth - 4, y);
    y += 5;

    doc.setFontSize(9);
    doc.text('ขอบคุณที่ใช้บริการ', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text('Gas Station Shift Manager', pageWidth / 2, y, { align: 'center' });

    doc.save(`${filename}.pdf`);
    toast.success('พิมพ์ใบเสร็จสำเร็จ');
  } catch (err) {
    toast.error('พิมพ์ใบเสร็จล้มเหลว');
    console.error(err);
  }
}
