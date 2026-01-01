import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { InvoiceWithDetails, Tenant } from '../types';
import { formatCurrencyForPDF } from './currency';
import { formatDate } from './dateFormatter';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

// Constants
const PAGE_MARGIN = 15;
const DEFAULT_TOP_MARGIN = 70; // Default space for company letterhead (mm)
const DEFAULT_BOTTOM_MARGIN = 20; // Default space for footer (mm)
const LOGO_MAX_WIDTH = 40;
const LOGO_MAX_HEIGHT = 40;

/**
 * Convert number to words (English)
 */
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  function convertLessThanThousand(n: number): string {
    if (n === 0) return '';

    let result = '';

    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }

    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      return result.trim();
    }

    if (n > 0) {
      result += ones[n] + ' ';
    }

    return result.trim();
  }

  let wholePart = Math.floor(num);
  const decimalPart = Math.round((num - wholePart) * 100);

  let result = '';

  if (wholePart >= 1000000) {
    result += convertLessThanThousand(Math.floor(wholePart / 1000000)) + ' Million ';
    wholePart %= 1000000;
  }

  if (wholePart >= 1000) {
    result += convertLessThanThousand(Math.floor(wholePart / 1000)) + ' Thousand ';
    wholePart %= 1000;
  }

  if (wholePart > 0) {
    result += convertLessThanThousand(wholePart);
  }

  result = result.trim();

  if (decimalPart > 0) {
    result += ' and ' + decimalPart + '/100';
  } else {
    result += ' Only';
  }

  return result;
}

/**
 * Main function to generate invoice PDF
 * @param invoice - Invoice data with line items
 * @param tenant - Tenant data for branding
 * @param action - 'download' to save file, 'print' to open in new window
 * @param options - Optional configuration for margins
 */
export async function generateInvoicePDF(
  invoice: InvoiceWithDetails,
  tenant: Tenant,
  action: 'download' | 'print' = 'download',
  options?: {
    topMargin?: number; // in mm
    bottomMargin?: number; // in mm
  }
): Promise<void> {
  try {
    // Get margins from options or use defaults
    const topMargin = options?.topMargin ?? DEFAULT_TOP_MARGIN;
    const bottomMargin = options?.bottomMargin ?? DEFAULT_BOTTOM_MARGIN;

    // Create PDF instance
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Build PDF sections (no header - printed on company letterhead)
    let yPosition = topMargin;
    yPosition = addInvoiceInfo(doc, invoice, tenant, yPosition);
    yPosition = addLineItemsTable(doc, invoice, tenant, yPosition);
    yPosition = addTotalsSection(doc, invoice, tenant, yPosition);
    addNotesSection(doc, invoice, yPosition);

    // Add footer space info (optional - for debugging)
    // The bottom margin is reserved space that content should not exceed
    const pageHeight = doc.internal.pageSize.height;
    const maxContentY = pageHeight - bottomMargin;

    // Output based on action
    const filename = generateFileName(tenant, invoice);

    if (action === 'download') {
      doc.save(filename);
    } else {
      // Open in new window for printing
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

/**
 * Load logo image and convert to base64
 */
async function loadLogoImage(url: string): Promise<string | null> {
  try {
    // Add timeout for logo loading
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error('Failed to load logo');
    }

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Could not load logo:', error);
    return null;
  }
}

/**
 * Add header section with logo and company name
 */
function addHeader(
  doc: jsPDF,
  tenant: Tenant,
  logoBase64: string | null,
  yPos: number
): number {
  let currentY = yPos;

  // Add logo if available
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'PNG', PAGE_MARGIN, currentY, LOGO_MAX_WIDTH, LOGO_MAX_HEIGHT);
    } catch (error) {
      console.warn('Could not add logo to PDF:', error);
    }
  }

  // Company name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const companyNameX = logoBase64 ? PAGE_MARGIN + LOGO_MAX_WIDTH + 5 : PAGE_MARGIN;
  doc.text(tenant.company_name || 'Company Name', companyNameX, currentY + 8);

  return currentY + (logoBase64 ? LOGO_MAX_HEIGHT : 15) + 5;
}

/**
 * Add invoice information and customer details
 */
function addInvoiceInfo(
  doc: jsPDF,
  invoice: InvoiceWithDetails,
  tenant: Tenant,
  yPos: number
): number {
  let currentY = yPos;

  // Invoice title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`INVOICE ${invoice.invoice_number}`, PAGE_MARGIN, currentY);
  currentY += 10;

  // Two-column layout for customer and invoice details
  const pageWidth = doc.internal.pageSize.width;
  const midPage = pageWidth / 2;

  // Left column: Customer information
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', PAGE_MARGIN, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 5;

  const customerName = invoice.customer_name || 'N/A';
  doc.text(customerName, PAGE_MARGIN, currentY);
  currentY += 5;

  if (invoice.customer_address) {
    const addressLines = doc.splitTextToSize(invoice.customer_address, midPage - PAGE_MARGIN - 5);
    doc.text(addressLines, PAGE_MARGIN, currentY);
    currentY += addressLines.length * 5;
  }

  // Right column: Invoice details
  let rightY = yPos + 10;
  const rightX = midPage + 5;
  const labelX = rightX;
  const valueX = pageWidth - PAGE_MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Date:', labelX, rightY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoice.invoice_date), valueX, rightY, { align: 'right' });
  rightY += 5;

  if (invoice.reference_number) {
    doc.setFont('helvetica', 'bold');
    doc.text('Reference:', labelX, rightY);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.reference_number, valueX, rightY, { align: 'right' });
    rightY += 5;
  }

  return Math.max(currentY, rightY) + 5;
}

/**
 * Add line items table
 */
function addLineItemsTable(
  doc: jsPDF,
  invoice: InvoiceWithDetails,
  tenant: Tenant,
  yPos: number
): number {
  if (!invoice.line_items || invoice.line_items.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No line items', PAGE_MARGIN, yPos);
    return yPos + 10;
  }

  // Prepare table data (numbers only, no currency symbols)
  const tableData = invoice.line_items.map((item) => [
    item.line_number?.toString() || '-',
    item.description || '-',
    item.quantity?.toString() || '0',
    (item.unit_price || 0).toFixed(2),
    (item.subtotal || 0).toFixed(2),
  ]);

  // Get currency code for Amount column header only
  const currencyCode = tenant.currency || 'USD';

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Description', 'Qty', 'Unit Price', `Amount (${currencyCode})`]],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [66, 66, 66],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
  });

  return doc.lastAutoTable.finalY + 5;
}

/**
 * Add totals section
 */
function addTotalsSection(
  doc: jsPDF,
  invoice: InvoiceWithDetails,
  tenant: Tenant,
  yPos: number
): number {
  const pageWidth = doc.internal.pageSize.width;
  const labelX = pageWidth - PAGE_MARGIN - 60;
  const valueX = pageWidth - PAGE_MARGIN;
  let currentY = yPos + 5;

  doc.setFontSize(10);

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.text('Subtotal:', labelX, currentY);
  doc.text((invoice.subtotal || 0).toFixed(2), valueX, currentY, {
    align: 'right',
  });
  currentY += 6;

  // Discount (if any)
  if (invoice.discount_amount && invoice.discount_amount > 0) {
    doc.text('Discount:', labelX, currentY);
    doc.text(`-${(invoice.discount_amount || 0).toFixed(2)}`, valueX, currentY, {
      align: 'right',
    });
    currentY += 6;
  }

  // Tax
  doc.text(`${tenant.tax_label || 'Tax'}:`, labelX, currentY);
  doc.text((invoice.total_tax || 0).toFixed(2), valueX, currentY, {
    align: 'right',
  });
  currentY += 6;

  // Draw line
  doc.setLineWidth(0.5);
  doc.line(labelX, currentY, valueX, currentY);
  currentY += 6;

  // Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', labelX, currentY);
  doc.text((invoice.total_amount || 0).toFixed(2), valueX, currentY, {
    align: 'right',
  });
  currentY += 8;

  // Paid
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Paid:', labelX, currentY);
  doc.text((invoice.total_paid || 0).toFixed(2), valueX, currentY, {
    align: 'right',
  });
  currentY += 6;

  // Balance Due
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Balance Due:', labelX, currentY);
  doc.text((invoice.balance_due || 0).toFixed(2), valueX, currentY, {
    align: 'right',
  });
  currentY += 10;

  // In Words (Balance Due)
  const balanceInWords = numberToWords(invoice.balance_due || 0);
  const currencyName = tenant.currency === 'BDT' ? 'Taka' :
                       tenant.currency === 'USD' ? 'Dollars' :
                       tenant.currency === 'EUR' ? 'Euros' :
                       tenant.currency === 'GBP' ? 'Pounds' :
                       tenant.currency;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const inWordsText = `In Words: ${currencyName} ${balanceInWords}`;
  const maxWidth = pageWidth - PAGE_MARGIN * 2;
  const wrappedText = doc.splitTextToSize(inWordsText, maxWidth);
  doc.text(wrappedText, PAGE_MARGIN, currentY);
  currentY += wrappedText.length * 4;

  return currentY + 5;
}

/**
 * Add notes, terms, and footer
 */
function addNotesSection(doc: jsPDF, invoice: InvoiceWithDetails, yPos: number): number {
  const maxWidth = doc.internal.pageSize.width - PAGE_MARGIN * 2;
  let currentY = yPos + 5;

  doc.setFontSize(9);

  // Notes
  if (invoice.notes) {
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', PAGE_MARGIN, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    const notesLines = doc.splitTextToSize(invoice.notes, maxWidth);
    doc.text(notesLines, PAGE_MARGIN, currentY);
    currentY += notesLines.length * 4 + 5;
  }

  // Terms and Conditions
  if (invoice.terms_and_conditions) {
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', PAGE_MARGIN, currentY);
    currentY += 5;
    doc.setFont('helvetica', 'normal');
    const termsLines = doc.splitTextToSize(invoice.terms_and_conditions, maxWidth);
    doc.text(termsLines, PAGE_MARGIN, currentY);
    currentY += termsLines.length * 4 + 5;
  }

  // Footer
  if (invoice.footer_text) {
    doc.setFont('helvetica', 'italic');
    const footerLines = doc.splitTextToSize(invoice.footer_text, maxWidth);
    doc.text(footerLines, PAGE_MARGIN, currentY);
    currentY += footerLines.length * 4;
  }

  return currentY;
}

/**
 * Generate filename for the PDF
 */
function generateFileName(tenant: Tenant, invoice: InvoiceWithDetails): string {
  const companyName = (tenant.company_name || 'Company')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const invoiceNum = (invoice.invoice_number || 'INVOICE')
    .replace(/[^a-zA-Z0-9-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return `${companyName}_${invoiceNum}.pdf`;
}
