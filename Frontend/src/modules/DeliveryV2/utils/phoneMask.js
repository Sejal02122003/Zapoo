/**
 * Utility to mask phone numbers for customer privacy in Delivery Partner app.
 * Examples:
 *   "9876543210"    => "+91 98*****3210"
 *   "+919876543210" => "+91 98*****3210"
 */
export const maskPhoneNumber = (phone) => {
  if (!phone) return '';
  const str = String(phone).trim();
  const digits = str.replace(/\D/g, '');

  if (digits.length >= 10) {
    const last4 = digits.slice(-4);
    const first2 = digits.slice(-10, -8);
    return `+91 ${first2}*****${last4}`;
  }
  
  if (digits.length > 4) {
    return `${digits.slice(0, 2)}*****${digits.slice(-2)}`;
  }

  return str;
};
