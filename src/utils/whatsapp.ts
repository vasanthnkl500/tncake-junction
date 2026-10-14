/**
 * WhatsApp click-to-chat utility
 * Normalizes numbers according to international format (strips non-digits and leading zeros for +91)
 */
export function buildWhatsAppLink(
  rawPhone: string | undefined,
  message: string
): string | null {
  if (!rawPhone || !rawPhone.trim()) {
    return null;
  }

  // Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, '');

  if (!digits) {
    return null;
  }

  // If number starts with 0 and is 11 digits, strip leading 0 and prepend 91 (India)
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '91' + digits.substring(1);
  } else if (digits.length === 10) {
    // Standard 10 digit Indian mobile number -> prepend 91
    digits = '91' + digits;
  }

  const encodedMsg = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${encodedMsg}`;
}

export function formatIndianCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}
