/**
 * Phone Number Normalization and Validation Utilities for Cake Junction
 * Standardized for Indian Mobile Numbers (+91) per TRAI Regulations
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalizedPhone?: string; // 10-digit standard format: '9876543210'
  e164Phone?: string;       // E.164 standard format: '+919876543210'
  displayPhone?: string;    // Formatted for UI: '+91 98765 43210'
  errorMessage?: string;
}

/**
 * Normalizes and validates Indian mobile phone numbers.
 * Handles inputs with:
 * - Leading '+91', '91', '0'
 * - Spaces, dashes, parentheses
 * - Checks for 10-digit length and valid Indian mobile prefixes (6, 7, 8, 9)
 * - Detects repetitive fake numbers (e.g., 0000000000, 1111111111)
 */
export function validateAndNormalizeIndianPhone(rawPhone: string): PhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      isValid: false,
      errorMessage: 'Mobile number is required.'
    };
  }

  // 1. Strip all non-digit characters
  let digits = rawPhone.replace(/\D/g, '');

  if (digits.length === 0) {
    return {
      isValid: false,
      errorMessage: 'Please enter a valid mobile number.'
    };
  }

  // 2. Handle country code prefix variations
  // If user entered +91 or 91 with 12 digits (e.g. 919876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } 
  // If user entered leading 0 with 11 digits (e.g. 09876543210)
  else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  // If user entered +91 and then 10 digits, or entered 10 digits directly
  else if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(-10);
  }

  // 3. Length check
  if (digits.length < 10) {
    return {
      isValid: false,
      errorMessage: `Incomplete mobile number (${digits.length}/10 digits). Please enter full 10 digits.`
    };
  }

  if (digits.length > 10) {
    // Take the last 10 digits if someone pasted an over-prefixed number
    digits = digits.slice(-10);
  }

  // 4. Validate Indian mobile prefixes (TRAI: Indian mobile numbers must start with 6, 7, 8, or 9)
  const firstDigit = digits.charAt(0);
  if (!['6', '7', '8', '9'].includes(firstDigit)) {
    return {
      isValid: false,
      errorMessage: 'Invalid Indian mobile number. Mobile numbers in India must begin with 6, 7, 8, or 9.'
    };
  }

  // 5. Check for obviously invalid repetitive numbers (e.g., 9999999999, 8888888888, 7777777777)
  const isRepetitive = /^(\d)\1{9}$/.test(digits);
  if (isRepetitive) {
    return {
      isValid: false,
      errorMessage: 'Please enter a genuine active mobile number.'
    };
  }

  // 6. Format outputs
  const e164 = `+91${digits}`;
  const display = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;

  return {
    isValid: true,
    normalizedPhone: digits,
    e164Phone: e164,
    displayPhone: display
  };
}

/**
 * Formats a raw phone input for live typing (e.g. "98765 43210")
 */
export function formatLivePhoneInput(rawInput: string): string {
  // Strip non-digits
  let digits = rawInput.replace(/\D/g, '');
  
  // If starts with 91 and > 10 digits, strip 91
  if (digits.length > 10 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Cap at 10 digits
  digits = digits.slice(0, 10);

  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}
