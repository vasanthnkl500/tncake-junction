import { describe, it, expect } from 'vitest';
import { buildWhatsAppLink, formatIndianCurrency } from '../utils/whatsapp';

describe('WhatsApp and Currency Formatting Verification', () => {
  it('correctly formats 10-digit Indian numbers into international wa.me links', () => {
    const link = buildWhatsAppLink('9876543210', 'Test cake enquiry');
    expect(link).toBe('https://wa.me/919876543210?text=Test%20cake%20enquiry');
  });

  it('correctly formats +91 8825648728 into wa.me/918825648728', () => {
    const link = buildWhatsAppLink('+91 8825648728', 'I would like to order a cake');
    expect(link).toBe('https://wa.me/918825648728?text=I%20would%20like%20to%20order%20a%20cake');
  });

  it('handles domestic numbers with leading zero', () => {
    const link = buildWhatsAppLink('08825648728', 'Hello Bakery');
    expect(link).toBe('https://wa.me/918825648728?text=Hello%20Bakery');
  });

  it('returns null if no phone number is provided', () => {
    const link = buildWhatsAppLink('', 'Hello');
    expect(link).toBeNull();
  });

  it('formats exact Indian currency amounts in ₹ without floating point inaccuracies', () => {
    expect(formatIndianCurrency(1600)).toContain('1,600');
    expect(formatIndianCurrency(25000)).toContain('25,000');
  });
});
