export function onlyDigits(v: string): string {
  return String(v ?? "").replace(/\D+/g, "");
}

/**
 * Brazilian phone formatting (DDD + 8/9 digits)
 *
 * Examples:
 *  - 11987654321 -> (11) 98765-4321
 *  - 1132654321  -> (11) 3265-4321
 */
export function formatBRPhone(input: string): string {
  const d = onlyDigits(input);
  if (!d) return "";

  // Keep at most 11 digits (DDD + 9)
  const digits = d.slice(0, 11);

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  // While typing, we progressively format.
  if (digits.length <= 2) return `(${ddd}`;
  if (rest.length <= 4) return `(${ddd}) ${rest}`;

  const isMobile = rest.length >= 9; // 9-digit subscriber number
  const firstLen = isMobile ? 5 : 4;
  const part1 = rest.slice(0, firstLen);
  const part2 = rest.slice(firstLen, firstLen + 4);

  if (!part2) return `(${ddd}) ${part1}`;
  return `(${ddd}) ${part1}-${part2}`;
}

/**
 * For API/database storage: digits only, limited to 11.
 * Returns null if empty.
 */
export function normalizeBRPhoneForStorage(input: string): string | null {
  const d = onlyDigits(input).slice(0, 11);
  return d ? d : null;
}

export function isValidBRPhoneDigits(digits: string): boolean {
  return /^[0-9]{10,11}$/.test(digits);
}
