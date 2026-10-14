import { jsPDF } from 'jspdf';
import { CustomerOrder, ShopSettings, InvoiceRecord } from '../types';

/**
 * Generates formatted invoice sequence number based on bakery settings
 * Example: INV-2026-1001 or CJ-1050
 */
export function generateInvoiceNumber(
  order: CustomerOrder,
  settings: ShopSettings,
  overrideSeq?: number
): string {
  if (order.invoiceNumber) {
    return order.invoiceNumber;
  }

  const prefix = (settings.invoicePrefix || 'INV').trim().toUpperCase();
  const seqNum = overrideSeq ?? (order.invoiceSequence || settings.invoiceCurrentSequence || settings.invoiceStartingNumber || 1001);
  const includeYear = settings.includeYearInInvoice !== false;

  const orderYear = order.createdAt 
    ? new Date(order.createdAt).getFullYear() 
    : new Date().getFullYear();

  if (includeYear) {
    return `${prefix}-${orderYear}-${seqNum}`;
  }
  return `${prefix}-${seqNum}`;
}

/**
 * Helper to format Indian currency for PDF without symbol encoding issues
 * Uses "Rs." or "INR" to ensure clean font rendering across all PDF engines
 */
function formatPdfCurrency(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = rounded.toLocaleString('en-IN');
  return `INR ${formatted}`;
}

/**
 * Creates an A4-sized PDF invoice document for a CustomerOrder
 * Standard ISO 216 A4 size: 210mm x 297mm
 */
export function generateOrderInvoiceDoc(
  order: CustomerOrder,
  settings: ShopSettings,
  customInvoiceNum?: string
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210 x 297 mm
  });

  const invoiceNumber = customInvoiceNum || generateInvoiceNumber(order, settings);
  const invoiceDate = order.invoiceGeneratedAt 
    ? new Date(order.invoiceGeneratedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const orderDate = order.createdAt 
    ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : invoiceDate;

  // Colors
  const primaryBrown: [number, number, number] = [75, 46, 37];      // #4B2E25
  const goldAccent: [number, number, number] = [197, 161, 90];      // #C5A15A
  const darkText: [number, number, number] = [40, 30, 28];
  const mutedText: [number, number, number] = [110, 100, 95];
  const lightBg: [number, number, number] = [255, 248, 239];        // #FFF8EF
  const borderCol: [number, number, number] = [232, 213, 200];      // #E8D5C8

  // Margins
  const marginX = 14;
  const pageWidth = 210;
  const contentWidth = pageWidth - (marginX * 2); // 182mm
  let currentY = 14;

  // 1. TOP HEADER BRANDING BANNER
  doc.setFillColor(...primaryBrown);
  doc.roundedRect(marginX, currentY, contentWidth, 26, 3, 3, 'F');

  // Bakery Title & Tagline
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(settings.shopName || 'Cake Junction', marginX + 8, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(245, 235, 220);
  doc.text(settings.tagline || 'Artisan Cake Studio & Handcrafted Patisserie', marginX + 8, currentY + 18);

  // Top Right Invoice Tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...goldAccent);
  doc.text('TAX INVOICE', marginX + contentWidth - 8, currentY + 11, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`ORIGINAL FOR RECIPIENT`, marginX + contentWidth - 8, currentY + 18, { align: 'right' });

  currentY += 31;

  // 2. META GRID: BAKERY DETAILS (LEFT) & INVOICE DETAILS (RIGHT)
  const metaBoxHeight = 36;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderCol);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, currentY, contentWidth, metaBoxHeight, 2, 2, 'FD');

  // Left side - Bakery Contact
  doc.setTextColor(...primaryBrown);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('ISSUED BY:', marginX + 5, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkText);
  let leftY = currentY + 11;
  const addressLine = settings.address 
    ? `${settings.address}, ${settings.city || ''} ${settings.postalCode ? `- ${settings.postalCode}` : ''}`
    : 'Bakery Atelier, Chennai, India';
  doc.text(addressLine.slice(0, 55), marginX + 5, leftY);

  leftY += 4.5;
  doc.text(`Phone: ${settings.phone || '+91 98765 43210'} | WhatsApp: ${settings.whatsappNumber || settings.phone || '+91 98765 43210'}`, marginX + 5, leftY);

  leftY += 4.5;
  doc.text(`Email: ${settings.email || 'orders@cakejunction.com'}`, marginX + 5, leftY);

  leftY += 4.5;
  const fssai = settings.fssaiNumber ? `FSSAI Lic: ${settings.fssaiNumber}` : 'FSSAI Lic: 12423008000452 (Artisanal Confectionery)';
  const gstin = settings.gstinNumber ? ` | GSTIN: ${settings.gstinNumber}` : '';
  doc.setFont('helvetica', 'bold');
  doc.text(`${fssai}${gstin}`, marginX + 5, leftY);

  // Vertical divider
  const midX = marginX + 98;
  doc.setDrawColor(...borderCol);
  doc.line(midX, currentY + 3, midX, currentY + metaBoxHeight - 3);

  // Right side - Invoice Meta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryBrown);
  doc.text('INVOICE & ORDER DETAILS:', midX + 5, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkText);
  let rightY = currentY + 11;

  doc.text(`Invoice Number:`, midX + 5, rightY);
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceNumber, midX + 42, rightY);

  rightY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice Date:`, midX + 5, rightY);
  doc.text(invoiceDate, midX + 42, rightY);

  rightY += 4.5;
  doc.text(`Order Reference:`, midX + 5, rightY);
  doc.setFont('helvetica', 'bold');
  doc.text(order.orderNumber, midX + 42, rightY);

  rightY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Order Placed:`, midX + 5, rightY);
  doc.text(orderDate, midX + 42, rightY);

  rightY += 4.5;
  doc.text(`Fulfilment Date:`, midX + 5, rightY);
  doc.setFont('helvetica', 'bold');
  const slotText = order.fulfilmentTimeSlot ? ` (${order.fulfilmentTimeSlot})` : '';
  doc.text(`${order.fulfilmentDate}${slotText}`.slice(0, 38), midX + 42, rightY);

  currentY += metaBoxHeight + 5;

  // 3. CUSTOMER & FULFILMENT DETAILS BLOCK
  const custBoxHeight = 28;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderCol);
  doc.roundedRect(marginX, currentY, contentWidth, custBoxHeight, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryBrown);
  doc.text('BILLED & DELIVERED TO:', marginX + 5, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...darkText);
  let custY = currentY + 11;

  doc.setFont('helvetica', 'bold');
  doc.text(`${order.customerName}`, marginX + 5, custY);
  doc.setFont('helvetica', 'normal');
  doc.text(`  |  Phone: ${order.customerPhone}${order.customerEmail ? `  |  Email: ${order.customerEmail}` : ''}`, marginX + 5 + doc.getTextWidth(order.customerName), custY);

  custY += 4.5;
  const fulfilmentModeText = order.deliveryOrPickup === 'delivery' 
    ? 'Doorstep Temperature-Controlled Van Delivery' 
    : 'Self Collection at Atelier Bakery';
  doc.setFont('helvetica', 'bold');
  doc.text(`Fulfilment Mode: `, marginX + 5, custY);
  doc.setFont('helvetica', 'normal');
  doc.text(fulfilmentModeText, marginX + 33, custY);

  custY += 4.5;
  if (order.deliveryOrPickup === 'delivery') {
    const fullAddr = order.deliveryAddress || 
      (order.addressDetails ? `${order.addressDetails.flatOrHouse || ''} ${order.addressDetails.streetAndLocality || ''}, ${order.addressDetails.area || ''}, ${order.addressDetails.city || ''} ${order.addressDetails.postalCode || ''}` : 'Customer delivery address');
    doc.text(`Delivery Address: ${fullAddr.trim()}`.slice(0, 100), marginX + 5, custY);
  } else {
    doc.text(`Pickup Point: ${settings.address || 'Cake Junction Atelier Bakery'}, Chennai`, marginX + 5, custY);
  }

  currentY += custBoxHeight + 6;

  // 4. ITEMIZATION TABLE
  // Table Header
  const tableHeaderY = currentY;
  const tableHeaderHeight = 8;
  doc.setFillColor(...primaryBrown);
  doc.rect(marginX, tableHeaderY, contentWidth, tableHeaderHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  const colX = {
    num: marginX + 4,
    desc: marginX + 14,
    specs: marginX + 90,
    qty: marginX + 128,
    rate: marginX + 145,
    amt: marginX + contentWidth - 4
  };

  doc.text('#', colX.num, tableHeaderY + 5.5);
  doc.text('DESCRIPTION & ARTISAN SPECIFICATIONS', colX.desc, tableHeaderY + 5.5);
  doc.text('WEIGHT / SPECS', colX.specs, tableHeaderY + 5.5);
  doc.text('QTY', colX.qty, tableHeaderY + 5.5, { align: 'center' });
  doc.text('RATE', colX.rate, tableHeaderY + 5.5, { align: 'right' });
  doc.text('AMOUNT', colX.amt, tableHeaderY + 5.5, { align: 'right' });

  currentY += tableHeaderHeight;

  // Table Row 1: The Main Cake
  const cakeUnitPrice = order.unitPrice || (order.totalAmount - (order.deliveryFee || 0));
  const cakeQuantity = order.quantity || 1;
  const cakeTotal = cakeUnitPrice * cakeQuantity;

  let rowHeight = 22;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderCol);
  doc.rect(marginX, currentY, contentWidth, rowHeight, 'D');

  doc.setTextColor(...darkText);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('1', colX.num, currentY + 6);

  // Cake Name & Sub-details
  doc.setFont('helvetica', 'bold');
  doc.text(order.cakeName || 'Handcrafted Celebration Cake', colX.desc, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedText);

  let cakeSubY = currentY + 10.5;
  const dietBadge = order.isEggless ? '100% Eggless Vegetarian' : 'Classic Egg Confection';
  doc.text(`Flavour: ${order.flavour}  |  ${dietBadge}`, colX.desc, cakeSubY);

  if (order.cakeMessage) {
    cakeSubY += 4;
    doc.text(`Piped Inscription: "${order.cakeMessage}"`, colX.desc, cakeSubY);
  }
  if (order.occasion) {
    cakeSubY += 4;
    doc.text(`Occasion: ${order.occasion}${order.colourTheme ? `  |  Theme: ${order.colourTheme}` : ''}`, colX.desc, cakeSubY);
  }

  // Weight & Specs
  doc.setTextColor(...darkText);
  doc.setFontSize(8);
  doc.text(order.weight || '1.0 kg', colX.specs, currentY + 6);

  // Qty
  doc.text(`${cakeQuantity}`, colX.qty, currentY + 6, { align: 'center' });

  // Rate & Amount
  doc.text(formatPdfCurrency(cakeUnitPrice), colX.rate, currentY + 6, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(formatPdfCurrency(cakeTotal), colX.amt, currentY + 6, { align: 'right' });

  currentY += rowHeight;

  // Extras / Addons rows if present
  let itemIndex = 2;
  if (order.extras && order.extras.length > 0) {
    order.extras.forEach(extra => {
      const extraHeight = 8;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(...borderCol);
      doc.rect(marginX, currentY, contentWidth, extraHeight, 'D');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...darkText);
      doc.text(`${itemIndex++}`, colX.num, currentY + 5.5);
      doc.text(extra.name, colX.desc, currentY + 5.5);
      doc.text('Addon', colX.specs, currentY + 5.5);
      doc.text('1', colX.qty, currentY + 5.5, { align: 'center' });
      doc.text(formatPdfCurrency(extra.price), colX.rate, currentY + 5.5, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(formatPdfCurrency(extra.price), colX.amt, currentY + 5.5, { align: 'right' });

      currentY += extraHeight;
    });
  }

  // Delivery Fee row if applicable
  if (order.deliveryFee && order.deliveryFee > 0) {
    const deliveryRowHeight = 8;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...borderCol);
    doc.rect(marginX, currentY, contentWidth, deliveryRowHeight, 'D');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...darkText);
    doc.text(`${itemIndex++}`, colX.num, currentY + 5.5);
    doc.text('Chilled Temperature-Controlled Delivery', colX.desc, currentY + 5.5);
    doc.text('Direct Chilled Van', colX.specs, currentY + 5.5);
    doc.text('1', colX.qty, currentY + 5.5, { align: 'center' });
    doc.text(formatPdfCurrency(order.deliveryFee), colX.rate, currentY + 5.5, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatPdfCurrency(order.deliveryFee), colX.amt, currentY + 5.5, { align: 'right' });

    currentY += deliveryRowHeight;
  }

  currentY += 4;

  // 5. SUMMARY & TOTALS BLOCK (RIGHT) + PAYMENT & STORAGE INSTRUCTIONS (LEFT)
  const summaryBoxY = currentY;
  const leftBoxWidth = 100;
  const rightBoxWidth = contentWidth - leftBoxWidth - 4; // 78mm
  const rightBoxX = marginX + leftBoxWidth + 4;

  // Left Side: Payment Status & Care Guidelines
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderCol);
  doc.roundedRect(marginX, summaryBoxY, leftBoxWidth, 48, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryBrown);
  doc.text('PAYMENT & RECONCILIATION:', marginX + 4, summaryBoxY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkText);

  let payInfoY = summaryBoxY + 11;
  const payStatusLabel = order.paymentStatus.replace(/_/g, ' ').toUpperCase();
  doc.text(`Payment Status:`, marginX + 4, payInfoY);
  doc.setFont('helvetica', 'bold');
  if (order.paymentStatus === 'paid' || order.outstandingBalance === 0) {
    doc.setTextColor(24, 120, 60); // green
  } else if (order.paymentStatus === 'deposit_verified') {
    doc.setTextColor(180, 100, 20); // amber
  } else {
    doc.setTextColor(180, 40, 30); // red
  }
  doc.text(payStatusLabel, marginX + 35, payInfoY);

  payInfoY += 4.5;
  doc.setTextColor(...darkText);
  doc.setFont('helvetica', 'normal');
  doc.text(`Mode / Method:`, marginX + 4, payInfoY);
  doc.text(settings.paymentMode === 'manual_upi' ? 'Direct UPI QR Transfer' : 'Bakery Payment', marginX + 35, payInfoY);

  if (settings.upiId) {
    payInfoY += 4.5;
    doc.text(`Bakery UPI ID:`, marginX + 4, payInfoY);
    doc.setFont('helvetica', 'bold');
    doc.text(settings.upiId, marginX + 35, payInfoY);
  }

  // Storage Guidelines
  payInfoY += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...primaryBrown);
  doc.text('CARE & STORAGE INSTRUCTIONS:', marginX + 4, payInfoY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...darkText);
  payInfoY += 4.5;
  doc.text('• Store refrigerated at 4°C - 6°C in provided moisture-safe box.', marginX + 4, payInfoY);
  payInfoY += 3.8;
  doc.text('• Bring to room temperature 20-30 mins before slicing for optimal texture.', marginX + 4, payInfoY);
  payInfoY += 3.8;
  doc.text('• Best enjoyed within 48 hours of celebration.', marginX + 4, payInfoY);

  // Right Side: Financial Calculation
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...borderCol);
  doc.roundedRect(rightBoxX, summaryBoxY, rightBoxWidth, 48, 2, 2, 'FD');

  let finY = summaryBoxY + 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...darkText);

  // Subtotal
  const subtotal = order.totalAmount - (order.deliveryFee || 0);
  doc.text('Item Subtotal:', rightBoxX + 4, finY);
  doc.text(formatPdfCurrency(subtotal), rightBoxX + rightBoxWidth - 4, finY, { align: 'right' });

  // Delivery
  finY += 5;
  doc.text('Delivery & Packaging:', rightBoxX + 4, finY);
  doc.text(formatPdfCurrency(order.deliveryFee || 0), rightBoxX + rightBoxWidth - 4, finY, { align: 'right' });

  // Divider
  finY += 3;
  doc.setDrawColor(...borderCol);
  doc.line(rightBoxX + 4, finY, rightBoxX + rightBoxWidth - 4, finY);

  // Grand Total
  finY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryBrown);
  doc.text('Total Invoice Amount:', rightBoxX + 4, finY);
  doc.text(formatPdfCurrency(order.totalAmount), rightBoxX + rightBoxWidth - 4, finY, { align: 'right' });

  // Paid Amount
  finY += 5;
  const paid = order.verifiedPaidAmount || order.depositAmount || (order.paymentStatus === 'paid' ? order.totalAmount : 0);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(24, 120, 60);
  doc.text('Paid / Verified Deposit:', rightBoxX + 4, finY);
  doc.text(`- ${formatPdfCurrency(paid)}`, rightBoxX + rightBoxWidth - 4, finY, { align: 'right' });

  // Outstanding Balance
  finY += 5;
  doc.setFont('helvetica', 'bold');
  const balance = order.outstandingBalance !== undefined ? order.outstandingBalance : Math.max(0, order.totalAmount - paid);
  if (balance > 0) {
    doc.setTextColor(190, 40, 20);
  } else {
    doc.setTextColor(24, 120, 60);
  }
  doc.text('Outstanding Balance:', rightBoxX + 4, finY);
  doc.text(formatPdfCurrency(balance), rightBoxX + rightBoxWidth - 4, finY, { align: 'right' });

  // Balance status note
  finY += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(...mutedText);
  if (balance === 0) {
    doc.text('Account Settled in Full', rightBoxX + rightBoxWidth - 4, finY, { align: 'right' });
  } else {
    doc.text('Payable before handover / pickup', rightBoxX + rightBoxWidth - 4, finY, { align: 'right' });
  }

  currentY = summaryBoxY + 52;

  // 6. BAKERY SEAL, SIGNATURE & TERMS
  const footerBoxHeight = 30;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderCol);
  doc.roundedRect(marginX, currentY, contentWidth, footerBoxHeight, 2, 2, 'FD');

  // Terms & Conditions (Left)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...primaryBrown);
  doc.text('TERMS & CONDITIONS:', marginX + 4, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(...darkText);
  let termsY = currentY + 10;
  const termsText = settings.invoiceTerms || 
    '1. Perishable confectionery crafted fresh to custom specification; payments non-refundable once production commences.\n2. In the event of transit delay caused by force majeure, Cake Junction will communicate promptly.\n3. All disputes subject to Chennai jurisdiction.';
  
  const splitTerms = doc.splitTextToSize(termsText, 110);
  doc.text(splitTerms, marginX + 4, termsY);

  // Authorized Signatory & Digital Seal (Right)
  const sigX = marginX + contentWidth - 55;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...primaryBrown);
  doc.text(`For ${settings.shopName || 'Cake Junction'}`, sigX + 27, currentY + 5.5, { align: 'center' });

  // Digital Seal Badge
  doc.setDrawColor(...goldAccent);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(sigX + 2, currentY + 8, 50, 14, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...goldAccent);
  doc.text('DIGITALLY AUTHORIZED', sigX + 27, currentY + 13, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...darkText);
  doc.text(settings.bakerName || 'Chef Ananya R.', sigX + 27, currentY + 17, { align: 'center' });
  doc.text('Head Pâtissier & Confectioner', sigX + 27, currentY + 20.5, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(...mutedText);
  doc.text('Computer-generated electronic invoice. No physical signature required.', sigX + 27, currentY + 26.5, { align: 'center' });

  // Page Bottom Watermark / Greeting
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...mutedText);
  doc.text(
    `Thank you for choosing ${settings.shopName || 'Cake Junction'} for your celebration!`,
    pageWidth / 2,
    290,
    { align: 'center' }
  );

  return doc;
}

/**
 * Downloads the A4 PDF invoice directly to the customer's / owner's browser
 */
export function downloadOrderInvoicePdf(
  order: CustomerOrder,
  settings: ShopSettings,
  customInvoiceNum?: string
): string {
  const invoiceNumber = customInvoiceNum || generateInvoiceNumber(order, settings);
  const doc = generateOrderInvoiceDoc(order, settings, invoiceNumber);
  const filename = `Invoice-${invoiceNumber}.pdf`;
  doc.save(filename);
  return invoiceNumber;
}

/**
 * Returns a Blob of the generated A4 PDF invoice
 */
export function getOrderInvoicePdfBlob(
  order: CustomerOrder,
  settings: ShopSettings,
  customInvoiceNum?: string
): Blob {
  const doc = generateOrderInvoiceDoc(order, settings, customInvoiceNum);
  return doc.output('blob');
}

/**
 * Returns a Data URI string (base64) of the generated A4 PDF invoice
 */
export function getOrderInvoicePdfDataUri(
  order: CustomerOrder,
  settings: ShopSettings,
  customInvoiceNum?: string
): string {
  const doc = generateOrderInvoiceDoc(order, settings, customInvoiceNum);
  return doc.output('datauristring');
}

/**
 * Generates an InvoiceRecord snapshot for database and state tracking
 */
export function createInvoiceRecordFromOrder(
  order: CustomerOrder,
  settings: ShopSettings,
  generatedBy = 'System'
): InvoiceRecord {
  const invoiceNumber = generateInvoiceNumber(order, settings);
  const cakeUnitPrice = order.unitPrice || (order.totalAmount - (order.deliveryFee || 0));
  const cakeQuantity = order.quantity || 1;

  const items = [
    {
      description: order.cakeName,
      specs: `${order.flavour} · ${order.weight}${order.isEggless ? ' · Eggless' : ''}`,
      quantity: cakeQuantity,
      unitPrice: cakeUnitPrice,
      amount: cakeUnitPrice * cakeQuantity,
    },
    ...(order.extras || []).map(extra => ({
      description: extra.name,
      specs: 'Custom Addon',
      quantity: 1,
      unitPrice: extra.price,
      amount: extra.price,
    })),
    ...(order.deliveryFee && order.deliveryFee > 0 ? [{
      description: 'Chilled Temperature-Controlled Delivery',
      specs: 'Specialist Bakery Van',
      quantity: 1,
      unitPrice: order.deliveryFee,
      amount: order.deliveryFee,
    }] : [])
  ];

  const paid = order.verifiedPaidAmount || order.depositAmount || (order.paymentStatus === 'paid' ? order.totalAmount : 0);
  const outstanding = order.outstandingBalance !== undefined ? order.outstandingBalance : Math.max(0, order.totalAmount - paid);

  return {
    id: `inv-${order.id}`,
    invoiceNumber,
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerEmail: order.customerEmail,
    totalAmount: order.totalAmount,
    paidAmount: paid,
    outstandingBalance: outstanding,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    fulfilmentStage: order.fulfilmentStage,
    generatedAt: order.invoiceGeneratedAt || new Date().toISOString(),
    generatedBy,
    items,
  };
}

/**
 * Generates and prints a clean, printable PDF version of the invoice summary.
 * Triggers the browser print dialog with the clean A4 PDF document without web UI chrome.
 */
export function printOrderSummaryPdf(
  order: CustomerOrder,
  settings: ShopSettings,
  customInvoiceNum?: string
): void {
  try {
    const invoiceNumber = customInvoiceNum || generateInvoiceNumber(order, settings);
    const doc = generateOrderInvoiceDoc(order, settings, invoiceNumber);
    doc.autoPrint();
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    printIframe.src = blobUrl;

    printIframe.onload = () => {
      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch {
          window.open(blobUrl, '_blank');
        }
      }, 250);
    };

    document.body.appendChild(printIframe);
  } catch (err) {
    console.error('Failed to trigger PDF print:', err);
    window.print();
  }
}
