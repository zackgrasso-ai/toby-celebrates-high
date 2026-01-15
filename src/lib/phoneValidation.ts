// Phone number validation and formatting for Dutch numbers
// Supports formats like: +31 6 12345678, 0612345678, +31612345678, etc.

export const validatePhoneNumber = (phone: string): boolean => {
  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  
  // Check if it's a valid Dutch mobile number
  // Dutch mobile numbers: +31 6 followed by 8 digits, or 06 followed by 8 digits
  const dutchMobileRegex = /^(\+31|0031|31)?6\d{8}$/;
  
  return dutchMobileRegex.test(cleaned);
};

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");
  
  // If it starts with +31, keep it
  if (cleaned.startsWith("+31")) {
    cleaned = cleaned.replace("+31", "");
    if (cleaned.startsWith("6")) {
      // Format as +31 6 XXXX XXXX
      const digits = cleaned.substring(1);
      if (digits.length <= 8) {
        return `+31 6 ${digits}`;
      }
    }
  }
  
  // If it starts with 0031, convert to +31
  if (cleaned.startsWith("0031")) {
    cleaned = cleaned.replace("0031", "");
  }
  
  // If it starts with 31 (without +), add +
  if (cleaned.startsWith("31") && !cleaned.startsWith("316")) {
    cleaned = cleaned.substring(2);
  }
  
  // If it starts with 06, remove the 0
  if (cleaned.startsWith("06")) {
    cleaned = cleaned.substring(1);
  }
  
  // If it starts with 6, format as +31 6 XXXX XXXX
  if (cleaned.startsWith("6")) {
    const digits = cleaned.substring(1);
    if (digits.length <= 8) {
      return `+31 6 ${digits}`;
    }
  }
  
  // If it already starts with +31 6, return as is (with spaces)
  if (phone.includes("+31 6")) {
    return phone;
  }
  
  // Return cleaned version
  return cleaned;
};

export const getPhoneErrorMessage = (phone: string): string | null => {
  if (!phone.trim()) {
    return "Phone number is required";
  }
  
  if (!validatePhoneNumber(phone)) {
    return "Please enter a valid Dutch mobile number (e.g., +31 6 12345678)";
  }
  
  return null;
};
