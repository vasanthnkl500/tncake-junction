import { ShopSettings, ShopAvailabilitySettings } from '../types';

/**
 * ShopSettings Database Schema Definition & Validation
 * Manages persistence schema for shop availability, operational policies, and storefront settings.
 */

export const DEFAULT_CLOSURE_MESSAGE = 
  "Cake Junction is currently closed for new orders. Our bakers are busy handcrafting pending celebrations. Please check our scheduled reopening or message us on WhatsApp for advance enquiries.";

export const INITIAL_SHOP_AVAILABILITY: ShopAvailabilitySettings = {
  is_open: true,
  isOpen: true,
  closureMessage: DEFAULT_CLOSURE_MESSAGE,
  reopeningTimestamp: null,
};

/**
 * Validates and normalizes ShopSettings data loaded from database / local storage.
 * Ensures backward compatibility with existing databases while enforcing the ShopSettings schema.
 */
export function normalizeShopSettingsSchema(raw: Partial<ShopSettings> | null | undefined, defaults: ShopSettings): ShopSettings {
  if (!raw) return { ...defaults };

  const isOpen = raw.is_open !== undefined 
    ? Boolean(raw.is_open) 
    : (raw.isOpen !== undefined ? Boolean(raw.isOpen) : defaults.is_open ?? true);

  return {
    ...defaults,
    ...raw,
    // Database schema fields for availability
    is_open: isOpen,
    isOpen: isOpen,
    closureMessage: raw.closureMessage?.trim() || defaults.closureMessage || DEFAULT_CLOSURE_MESSAGE,
    reopeningTimestamp: raw.reopeningTimestamp || null,
    // Invoice and sequence management defaults
    invoicePrefix: raw.invoicePrefix || defaults.invoicePrefix || 'INV',
    invoiceStartingNumber: raw.invoiceStartingNumber || defaults.invoiceStartingNumber || 1001,
    invoiceCurrentSequence: raw.invoiceCurrentSequence || defaults.invoiceCurrentSequence || 1001,
    includeYearInInvoice: raw.includeYearInInvoice !== undefined ? raw.includeYearInInvoice : (defaults.includeYearInInvoice ?? true),
    fssaiNumber: raw.fssaiNumber || defaults.fssaiNumber || '12423008000452',
    gstinNumber: raw.gstinNumber !== undefined ? raw.gstinNumber : (defaults.gstinNumber || '33AAACG1234F1Z5'),
    invoiceTerms: raw.invoiceTerms || defaults.invoiceTerms,
  };
}

/**
 * Verifies whether the shop is open and able to receive new orders.
 * Returns operational status and error message if rejected.
 */
export function verifyShopOrderAcceptance(settings: {
  is_open?: boolean;
  isOpen?: boolean;
  closureMessage?: string;
  reopeningTimestamp?: string | null;
}): { allowed: boolean; reason?: string } {
  const isOpen = settings.is_open !== false && settings.isOpen !== false;

  if (isOpen) {
    return { allowed: true };
  }

  let reason = settings.closureMessage?.trim() || DEFAULT_CLOSURE_MESSAGE;
  if (settings.reopeningTimestamp) {
    try {
      const reopenDate = new Date(settings.reopeningTimestamp);
      if (!isNaN(reopenDate.getTime())) {
        const formatted = reopenDate.toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });
        reason += ` Reopening scheduled for: ${formatted}.`;
      }
    } catch {
      // ignore date formatting errors
    }
  }

  return {
    allowed: false,
    reason: `Order Rejected: ${reason}`
  };
}
