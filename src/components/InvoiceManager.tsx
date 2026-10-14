import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CustomerOrder, InvoiceRecord } from '../types';
import { formatIndianCurrency, buildWhatsAppLink } from '../utils/whatsapp';
import { 
  getOrderInvoicePdfDataUri, 
  downloadOrderInvoicePdf, 
  generateInvoiceNumber 
} from '../utils/pdfInvoiceGenerator';
import { 
  FileText, 
  Download, 
  Eye, 
  Search, 
  Filter, 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Printer, 
  Save, 
  X, 
  Sparkles, 
  MessageCircle, 
  ShieldCheck, 
  Hash, 
  RotateCcw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Receipt
} from 'lucide-react';

export const InvoiceManager: React.FC = () => {
  const { 
    orders, 
    settings, 
    currentUser, 
    updateInvoiceSettings, 
    downloadOrderInvoice, 
    assignInvoiceNumberToOrder,
    navigateTo, 
    showToast 
  } = useApp();

  // Settings State
  const [prefixInput, setPrefixInput] = useState(settings.invoicePrefix || 'INV');
  const [startingNumberInput, setStartingNumberInput] = useState<number>(settings.invoiceStartingNumber || 1001);
  const [currentSequenceInput, setCurrentSequenceInput] = useState<number>(settings.invoiceCurrentSequence || 1001);
  const [includeYearInput, setIncludeYearInput] = useState<boolean>(settings.includeYearInInvoice !== false);
  const [fssaiInput, setFssaiInput] = useState(settings.fssaiNumber || '12423008000452');
  const [gstinInput, setGstinInput] = useState(settings.gstinNumber || '');
  const [termsInput, setTermsInput] = useState(settings.invoiceTerms || 
    '1. Perishable confectionery crafted fresh to custom specification; payments non-refundable once production commences.\n2. In the event of transit delay caused by force majeure, Cake Junction will communicate promptly.\n3. All disputes subject to Chennai jurisdiction.');

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Table Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'deposit_verified' | 'pending_balance'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'invoiced' | 'uninvoiced'>('all');

  // PDF Preview Modal
  const [previewOrder, setPreviewOrder] = useState<CustomerOrder | null>(null);
  const [previewDataUri, setPreviewDataUri] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Custom Sequence Assignment Modal
  const [customAssignOrder, setCustomAssignOrder] = useState<CustomerOrder | null>(null);
  const [customInvoiceInput, setCustomInvoiceInput] = useState('');

  // Eligible orders (excluding cancelled/rejected unless specifically queried)
  const nonRejectedOrders = useMemo(() => {
    return orders.filter(o => o.orderStatus !== 'rejected');
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return nonRejectedOrders.filter(order => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesInv = order.invoiceNumber?.toLowerCase().includes(q);
        const matchesOrd = order.orderNumber.toLowerCase().includes(q);
        const matchesName = order.customerName.toLowerCase().includes(q);
        const matchesPhone = order.customerPhone.includes(q);
        const matchesCake = order.cakeName.toLowerCase().includes(q);
        if (!matchesInv && !matchesOrd && !matchesName && !matchesPhone && !matchesCake) {
          return false;
        }
      }

      // Invoiced vs Uninvoiced
      if (statusFilter === 'invoiced' && !order.invoiceNumber) return false;
      if (statusFilter === 'uninvoiced' && order.invoiceNumber) return false;

      // Payment Filter
      if (paymentFilter === 'paid') {
        const isPaid = order.paymentStatus === 'paid' || order.outstandingBalance === 0;
        if (!isPaid) return false;
      }
      if (paymentFilter === 'deposit_verified') {
        if (order.paymentStatus !== 'deposit_verified') return false;
      }
      if (paymentFilter === 'pending_balance') {
        if (order.outstandingBalance <= 0) return false;
      }

      return true;
    });
  }, [nonRejectedOrders, searchQuery, statusFilter, paymentFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let invoicedCount = 0;

    nonRejectedOrders.forEach(order => {
      totalInvoiced += order.totalAmount;
      const paid = order.verifiedPaidAmount || order.depositAmount || (order.paymentStatus === 'paid' ? order.totalAmount : 0);
      totalCollected += paid;
      totalOutstanding += (order.outstandingBalance !== undefined ? order.outstandingBalance : Math.max(0, order.totalAmount - paid));
      if (order.invoiceNumber) {
        invoicedCount++;
      }
    });

    return {
      totalInvoiced,
      totalCollected,
      totalOutstanding,
      totalOrders: nonRejectedOrders.length,
      invoicedCount,
      uninvoicedCount: nonRejectedOrders.length - invoicedCount,
    };
  }, [nonRejectedOrders]);

  // Handler to open preview modal
  const handleOpenPreview = (order: CustomerOrder) => {
    setPreviewLoading(true);
    setPreviewOrder(order);
    try {
      const uri = getOrderInvoicePdfDataUri(order, settings);
      setPreviewDataUri(uri);
    } catch (err: any) {
      showToast('Error rendering PDF preview: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewOrder(null);
    setPreviewDataUri(null);
  };

  // Handler to download PDF directly
  const handleDownloadInvoice = (order: CustomerOrder) => {
    try {
      downloadOrderInvoice(order.id);
    } catch (err: any) {
      showToast('Failed to download invoice: ' + err.message, 'error');
    }
  };

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);

    try {
      const cleanPrefix = prefixInput.trim().toUpperCase() || 'INV';
      const cleanStart = Number(startingNumberInput) || 1001;
      const cleanSeq = Number(currentSequenceInput) || cleanStart;

      updateInvoiceSettings({
        invoicePrefix: cleanPrefix,
        invoiceStartingNumber: cleanStart,
        invoiceCurrentSequence: cleanSeq,
        includeYearInInvoice: includeYearInput,
        fssaiNumber: fssaiInput.trim(),
        gstinNumber: gstinInput.trim(),
        invoiceTerms: termsInput.trim(),
      });

      setShowSettingsPanel(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Assign missing invoices in batch
  const handleBatchAssignInvoices = () => {
    const uninvoiced = nonRejectedOrders.filter(o => !o.invoiceNumber);
    if (uninvoiced.length === 0) {
      showToast('All orders already have invoices assigned.', 'info');
      return;
    }

    uninvoiced.forEach(order => {
      assignInvoiceNumberToOrder(order.id);
    });

    showToast(`Assigned invoice numbers to ${uninvoiced.length} orders!`, 'success');
  };

  // Custom single assign
  const handleOpenCustomAssign = (order: CustomerOrder) => {
    setCustomAssignOrder(order);
    setCustomInvoiceInput(order.invoiceNumber || generateInvoiceNumber(order, settings));
  };

  const handleConfirmCustomAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customAssignOrder) return;
    if (!customInvoiceInput.trim()) {
      showToast('Please enter a valid invoice sequence number', 'error');
      return;
    }

    assignInvoiceNumberToOrder(customAssignOrder.id, customInvoiceInput.trim().toUpperCase());
    setCustomAssignOrder(null);
  };

  // WhatsApp helper
  const handleSendInvoiceWhatsApp = (order: CustomerOrder) => {
    const invNum = order.invoiceNumber || generateInvoiceNumber(order, settings);
    const balanceText = order.outstandingBalance > 0 
      ? `Outstanding Balance Due: ${formatIndianCurrency(order.outstandingBalance)}` 
      : 'Status: Fully Paid & Settled';

    const msg = `Hello ${order.customerName},\n\nHere is your official A4 Tax Invoice reference from Cake Junction:\n• Invoice No: ${invNum}\n• Order Reference: ${order.orderNumber}\n• Cake: ${order.cakeName} (${order.weight})\n• Total Invoiced: ${formatIndianCurrency(order.totalAmount)}\n• ${balanceText}\n• Delivery/Fulfilment Date: ${order.fulfilmentDate}\n\nYou can view and download your full A4 PDF invoice directly from your customer tracking portal anytime!\n\nWarm regards,\nCake Junction Atelier Bakery`;

    const url = buildWhatsAppLink(order.customerPhone, msg);
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#E8D5C8]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-[#4B2E25]">
              <Receipt className="w-5 h-5 text-[#C5A15A]" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#C5A15A]">
              Financial Records & Billing
            </span>
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#4B2E25] mt-1">
            Invoice Manager & Sequence Control
          </h2>
          <p className="text-xs text-[#4B2E25]/75 mt-0.5">
            Track generated A4-sized PDF invoices, view real-time copies, and configure billing sequence numbers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowSettingsPanel(prev => !prev)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl border transition-colors shadow-2xs ${
              showSettingsPanel 
                ? 'bg-[#4B2E25] text-white border-[#4B2E25]' 
                : 'bg-white text-[#4B2E25] border-[#E8D5C8] hover:bg-[#FFF8EF]'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-[#C5A15A]" />
            <span>{showSettingsPanel ? 'Hide Sequence Settings' : 'Configure Sequence & Prefix'}</span>
          </button>

          {stats.uninvoicedCount > 0 && (
            <button
              onClick={handleBatchAssignInvoices}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-[#C5A15A] hover:bg-[#b5924b] rounded-xl transition-colors shadow-xs"
              title="Assign sequence numbers to all orders without an invoice"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Assign Invoices ({stats.uninvoicedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-[#E8D5C8] shadow-xs">
          <div className="flex items-center justify-between text-[#4B2E25]/60 text-xs mb-1">
            <span>Total Invoiced</span>
            <FileText className="w-4 h-4 text-[#C5A15A]" />
          </div>
          <div className="font-serif text-2xl font-bold text-[#4B2E25]">
            {formatIndianCurrency(stats.totalInvoiced)}
          </div>
          <div className="text-[11px] text-[#4B2E25]/60 mt-1">
            Across {stats.totalOrders} active customer orders
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-[#E8D5C8] shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs mb-1">
            <span>Total Collected</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif text-2xl font-bold text-emerald-900">
            {formatIndianCurrency(stats.totalCollected)}
          </div>
          <div className="text-[11px] text-emerald-700/80 mt-1">
            Verified UPI & advance deposits
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-[#E8D5C8] shadow-xs">
          <div className="flex items-center justify-between text-amber-800 text-xs mb-1">
            <span>Outstanding Balance</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-serif text-2xl font-bold text-amber-900">
            {formatIndianCurrency(stats.totalOutstanding)}
          </div>
          <div className="text-[11px] text-amber-700/80 mt-1">
            Due prior to handover / pickup
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-[#E8D5C8] shadow-xs">
          <div className="flex items-center justify-between text-[#4B2E25]/60 text-xs mb-1">
            <span>Current Sequence</span>
            <Hash className="w-4 h-4 text-[#C5A15A]" />
          </div>
          <div className="font-mono text-xl font-bold text-[#4B2E25]">
            {settings.invoicePrefix || 'INV'}-{settings.includeYearInInvoice !== false ? `${new Date().getFullYear()}-` : ''}{settings.invoiceCurrentSequence || 1001}
          </div>
          <div className="text-[11px] text-[#4B2E25]/60 mt-1">
            Next invoice number to be issued
          </div>
        </div>
      </div>

      {/* SEQUENCE CONFIGURATION & LEGAL SETTINGS DRAWER */}
      {showSettingsPanel && (
        <div className="p-6 sm:p-8 bg-white rounded-3xl border-2 border-[#C5A15A]/40 shadow-sm animate-fade-in space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E8D5C8]">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#C5A15A]" />
              <h3 className="font-serif text-lg font-bold text-[#4B2E25]">
                Invoice Sequence & Legal Details Configuration
              </h3>
            </div>
            <button
              onClick={() => setShowSettingsPanel(false)}
              className="text-[#4B2E25]/60 hover:text-[#4B2E25] p-1.5 rounded-lg hover:bg-[#FFF8EF]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Invoice Prefix */}
              <div>
                <label className="block text-xs font-semibold text-[#4B2E25] mb-1.5">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  value={prefixInput}
                  onChange={(e) => setPrefixInput(e.target.value.toUpperCase())}
                  placeholder="e.g. INV or CJ"
                  className="w-full px-4 py-2.5 bg-[#FFF8EF]/40 rounded-xl border border-[#E8D5C8] text-xs font-mono font-bold text-[#4B2E25] focus:ring-2 focus:ring-[#C5A15A]/30 focus:outline-none"
                  required
                />
                <p className="text-[11px] text-[#4B2E25]/60 mt-1">
                  Prefix tag displayed before sequence number.
                </p>
              </div>

              {/* Starting Sequence */}
              <div>
                <label className="block text-xs font-semibold text-[#4B2E25] mb-1.5">
                  Initial Starting Number
                </label>
                <input
                  type="number"
                  min={1}
                  value={startingNumberInput}
                  onChange={(e) => setStartingNumberInput(Number(e.target.value))}
                  placeholder="e.g. 1001"
                  className="w-full px-4 py-2.5 bg-[#FFF8EF]/40 rounded-xl border border-[#E8D5C8] text-xs font-mono font-bold text-[#4B2E25] focus:ring-2 focus:ring-[#C5A15A]/30 focus:outline-none"
                  required
                />
                <p className="text-[11px] text-[#4B2E25]/60 mt-1">
                  Base sequence starting point.
                </p>
              </div>

              {/* Next Sequence Number */}
              <div>
                <label className="block text-xs font-semibold text-[#4B2E25] mb-1.5">
                  Next Issued Sequence Counter
                </label>
                <input
                  type="number"
                  min={1}
                  value={currentSequenceInput}
                  onChange={(e) => setCurrentSequenceInput(Number(e.target.value))}
                  placeholder="e.g. 1003"
                  className="w-full px-4 py-2.5 bg-[#FFF8EF]/40 rounded-xl border border-[#E8D5C8] text-xs font-mono font-bold text-[#4B2E25] focus:ring-2 focus:ring-[#C5A15A]/30 focus:outline-none"
                  required
                />
                <p className="text-[11px] text-[#4B2E25]/60 mt-1">
                  Incremented automatically with each new invoice.
                </p>
              </div>
            </div>

            {/* Toggle Year */}
            <div className="flex items-center gap-3 p-4 bg-[#FFF8EF]/60 rounded-2xl border border-[#E8D5C8]/80">
              <input
                type="checkbox"
                id="includeYearCheck"
                checked={includeYearInput}
                onChange={(e) => setIncludeYearInput(e.target.checked)}
                className="w-4 h-4 text-[#4B2E25] rounded accent-[#4B2E25]"
              />
              <label htmlFor="includeYearCheck" className="text-xs text-[#4B2E25] cursor-pointer">
                <strong>Include Calendar Year in Invoice Reference</strong> (e.g. {prefixInput}-{new Date().getFullYear()}-{currentSequenceInput})
              </label>
            </div>

            {/* Legal Licenses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-[#4B2E25] mb-1.5">
                  FSSAI Food License Number
                </label>
                <input
                  type="text"
                  value={fssaiInput}
                  onChange={(e) => setFssaiInput(e.target.value)}
                  placeholder="e.g. 12423008000452"
                  className="w-full px-4 py-2.5 bg-[#FFF8EF]/40 rounded-xl border border-[#E8D5C8] text-xs font-mono text-[#4B2E25] focus:ring-2 focus:ring-[#C5A15A]/30 focus:outline-none"
                />
                <p className="text-[11px] text-[#4B2E25]/60 mt-1">
                  Mandatory FSSAI registration printed on food business receipts.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#4B2E25] mb-1.5">
                  GSTIN (GST Number)
                </label>
                <input
                  type="text"
                  value={gstinInput}
                  onChange={(e) => setGstinInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 33AAACG1234F1Z5 (optional if composition/unregistered)"
                  className="w-full px-4 py-2.5 bg-[#FFF8EF]/40 rounded-xl border border-[#E8D5C8] text-xs font-mono text-[#4B2E25] focus:ring-2 focus:ring-[#C5A15A]/30 focus:outline-none"
                />
                <p className="text-[11px] text-[#4B2E25]/60 mt-1">
                  State GST Identification number for tax invoices.
                </p>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div>
              <label className="block text-xs font-semibold text-[#4B2E25] mb-1.5">
                Invoice Terms, Care Instructions & Jurisdiction
              </label>
              <textarea
                rows={3}
                value={termsInput}
                onChange={(e) => setTermsInput(e.target.value)}
                placeholder="Bakery terms, cancellation caveats, and storage guidelines..."
                className="w-full px-4 py-2.5 bg-[#FFF8EF]/40 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] focus:ring-2 focus:ring-[#C5A15A]/30 focus:outline-none"
              />
              <p className="text-[11px] text-[#4B2E25]/60 mt-1">
                Printed on the bottom footer of each generated A4 PDF.
              </p>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E8D5C8]">
              <button
                type="button"
                onClick={() => setShowSettingsPanel(false)}
                className="px-5 py-2.5 text-xs font-semibold text-[#4B2E25]/75 hover:text-[#4B2E25] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingSettings}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs"
              >
                <Save className="w-3.5 h-3.5 text-[#C5A15A]" />
                <span>{isSavingSettings ? 'Saving...' : 'Save Sequence Settings'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-[#E8D5C8] shadow-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#4B2E25]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice number, order #, customer name, mobile..."
            className="w-full pl-10 pr-4 py-2 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] text-xs text-[#4B2E25] focus:outline-none focus:ring-2 focus:ring-[#C5A15A]/30"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#4B2E25]/50 hover:text-[#4B2E25]"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-white rounded-xl border border-[#E8D5C8] text-xs font-semibold text-[#4B2E25] focus:outline-none"
          >
            <option value="all">All Statuses ({nonRejectedOrders.length})</option>
            <option value="invoiced">Invoiced Only ({stats.invoicedCount})</option>
            <option value="uninvoiced">Uninvoiced Only ({stats.uninvoicedCount})</option>
          </select>

          {/* Payment Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="px-3 py-2 bg-white rounded-xl border border-[#E8D5C8] text-xs font-semibold text-[#4B2E25] focus:outline-none"
          >
            <option value="all">All Payment States</option>
            <option value="paid">Fully Paid</option>
            <option value="deposit_verified">Deposit Verified</option>
            <option value="pending_balance">Outstanding Balance</option>
          </select>
        </div>
      </div>

      {/* INVOICE LIST TABLE */}
      <div className="bg-white rounded-3xl border border-[#E8D5C8] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#4B2E25]">
            <thead className="bg-[#FFF8EF] border-b border-[#E8D5C8] text-[#4B2E25]/80 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Order Ref</th>
                <th className="py-3.5 px-4">Customer Details</th>
                <th className="py-3.5 px-4">Creation & Flavour</th>
                <th className="py-3.5 px-4 text-right">Invoiced Amount</th>
                <th className="py-3.5 px-4 text-right">Paid</th>
                <th className="py-3.5 px-4 text-right">Balance Due</th>
                <th className="py-3.5 px-4">Payment Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8D5C8]/70">
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => {
                  const paid = order.verifiedPaidAmount || order.depositAmount || (order.paymentStatus === 'paid' ? order.totalAmount : 0);
                  const balance = order.outstandingBalance !== undefined ? order.outstandingBalance : Math.max(0, order.totalAmount - paid);
                  const hasInvoice = !!order.invoiceNumber;

                  return (
                    <tr key={order.id} className="hover:bg-[#FFF8EF]/40 transition-colors">
                      {/* Invoice Number */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {hasInvoice ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[#4B2E25] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {order.invoiceNumber}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenCustomAssign(order)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors"
                            title="Assign sequential invoice number"
                          >
                            <Sparkles className="w-3 h-3 text-[#C5A15A]" />
                            <span>Assign #</span>
                          </button>
                        )}
                      </td>

                      {/* Order Ref */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          onClick={() => navigateTo('order-detail', { orderId: order.id })}
                          className="font-mono font-bold text-[#4B2E25] hover:text-[#C5A15A] underline decoration-dotted transition-colors"
                        >
                          {order.orderNumber}
                        </button>
                        <div className="text-[11px] text-[#4B2E25]/60">
                          {order.fulfilmentDate}
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#4B2E25]">
                          {order.customerName}
                        </div>
                        <div className="text-[11px] text-[#4B2E25]/70 font-mono">
                          {order.customerPhone}
                        </div>
                      </td>

                      {/* Cake & Flavour */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#4B2E25] line-clamp-1 max-w-[200px]">
                          {order.cakeName}
                        </div>
                        <div className="text-[11px] text-[#4B2E25]/60">
                          {order.flavour} · {order.weight}
                        </div>
                      </td>

                      {/* Invoiced Amount */}
                      <td className="py-3.5 px-4 text-right font-bold text-[#4B2E25] whitespace-nowrap">
                        {formatIndianCurrency(order.totalAmount)}
                      </td>

                      {/* Paid */}
                      <td className="py-3.5 px-4 text-right text-emerald-800 font-semibold whitespace-nowrap">
                        {formatIndianCurrency(paid)}
                      </td>

                      {/* Balance Due */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className={balance > 0 ? "font-bold text-amber-900" : "text-emerald-900 font-semibold"}>
                          {formatIndianCurrency(balance)}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border capitalize ${
                          order.paymentStatus === 'paid' || balance === 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : order.paymentStatus === 'deposit_verified'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {order.paymentStatus.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Preview PDF */}
                          <button
                            onClick={() => handleOpenPreview(order)}
                            className="p-1.5 text-[#4B2E25] bg-white hover:bg-[#FFF8EF] border border-[#E8D5C8] rounded-lg transition-colors shadow-2xs"
                            title="Preview A4 PDF in viewer"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#C5A15A]" />
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={() => handleDownloadInvoice(order)}
                            className="p-1.5 text-[#4B2E25] bg-white hover:bg-[#FFF8EF] border border-[#E8D5C8] rounded-lg transition-colors shadow-2xs"
                            title="Download A4 PDF invoice"
                          >
                            <Download className="w-3.5 h-3.5 text-[#4B2E25]" />
                          </button>

                          {/* WhatsApp Invoice share */}
                          <button
                            onClick={() => handleSendInvoiceWhatsApp(order)}
                            className="p-1.5 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors"
                            title="Send invoice summary via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-[#4B2E25]/60">
                    <Receipt className="w-8 h-8 text-[#C5A15A] mx-auto mb-2 opacity-50" />
                    <span>No invoices found matching current search and filters.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* INTERACTIVE A4 PDF PREVIEW MODAL */}
      {previewOrder && previewDataUri && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#E8D5C8] shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#E8D5C8] bg-[#FFF8EF]/50">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#C5A15A]" />
                <div>
                  <h3 className="font-serif text-base font-bold text-[#4B2E25]">
                    Invoice Preview · {previewOrder.invoiceNumber || generateInvoiceNumber(previewOrder, settings)}
                  </h3>
                  <p className="text-[11px] text-[#4B2E25]/70">
                    Order Ref: {previewOrder.orderNumber} · Customer: {previewOrder.customerName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadOrderInvoicePdf(previewOrder, settings)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-[#C5A15A]" />
                  <span>Download A4 PDF</span>
                </button>

                <button
                  onClick={handleClosePreview}
                  className="p-1.5 text-[#4B2E25]/70 hover:text-[#4B2E25] rounded-lg hover:bg-neutral-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Embedded PDF Viewer */}
            <div className="flex-1 overflow-auto p-4 bg-neutral-100 flex items-center justify-center">
              <iframe
                src={previewDataUri}
                title="A4 PDF Invoice Preview"
                className="w-full h-[620px] rounded-xl shadow-md border border-neutral-300 bg-white"
              />
            </div>

            {/* Modal Footer Quick Details */}
            <div className="p-4 border-t border-[#E8D5C8] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#4B2E25]">
              <div className="flex items-center gap-4">
                <span>Invoiced Amount: <strong>{formatIndianCurrency(previewOrder.totalAmount)}</strong></span>
                <span>Balance: <strong className={previewOrder.outstandingBalance > 0 ? "text-amber-900" : "text-emerald-900"}>{formatIndianCurrency(previewOrder.outstandingBalance)}</strong></span>
                <span>Fulfilment Date: <strong>{previewOrder.fulfilmentDate}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleClosePreview();
                    navigateTo('order-detail', { orderId: previewOrder.id });
                  }}
                  className="text-xs font-semibold text-[#4B2E25] hover:underline"
                >
                  View Order Full Details &rarr;
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* CUSTOM INVOICE NUMBER ASSIGNMENT MODAL */}
      {customAssignOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#E8D5C8] shadow-xl max-w-md w-full p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-[#E8D5C8] pb-3">
              <h3 className="font-serif text-base font-bold text-[#4B2E25]">
                Assign Invoice Sequence Reference
              </h3>
              <button
                onClick={() => setCustomAssignOrder(null)}
                className="text-[#4B2E25]/60 hover:text-[#4B2E25]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#4B2E25]/75">
              Assign or customize the official billing invoice reference for order <strong>{customAssignOrder.orderNumber}</strong> ({customAssignOrder.customerName}).
            </p>

            <form onSubmit={handleConfirmCustomAssign} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#4B2E25] mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={customInvoiceInput}
                  onChange={(e) => setCustomInvoiceInput(e.target.value.toUpperCase())}
                  className="w-full px-4 py-2.5 bg-[#FFF8EF]/50 rounded-xl border border-[#E8D5C8] font-mono text-sm font-bold text-[#4B2E25] focus:outline-none focus:ring-2 focus:ring-[#C5A15A]/30"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8D5C8]">
                <button
                  type="button"
                  onClick={() => setCustomAssignOrder(null)}
                  className="px-4 py-2 text-xs font-semibold text-[#4B2E25]/75 hover:text-[#4B2E25]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#4B2E25] hover:bg-[#38221B] rounded-xl transition-colors shadow-xs"
                >
                  Save & Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
