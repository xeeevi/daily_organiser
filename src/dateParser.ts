/**
 * Parse due date and time from user input
 *
 * Supported formats:
 * - Date: YYYY-MM-DD or YYYYMMDD
 * - Time: HH:mm (24-hour format)
 *
 * Examples:
 * - "2025-10-15"
 * - "20251015"
 * - "2025-10-15 14:30"
 * - "20251015 14:30"
 */
export function parseDueDate(input: string): Date | null {
  const trimmed = input.trim();

  // Try to match: YYYY-MM-DD or YYYYMMDD, optionally followed by HH:mm
  const dateTimePattern = /^(\d{4})-?(\d{2})-?(\d{2})(?:\s+(\d{2}):(\d{2}))?$/;
  const match = trimmed.match(dateTimePattern);

  if (!match) {
    return null;
  }

  const [, year, month, day, hours, minutes] = match;

  // Validate ranges
  const y = parseInt(year);
  const m = parseInt(month);
  const d = parseInt(day);

  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return null;
  }

  // Create date object
  const date = new Date(y, m - 1, d); // month is 0-indexed in Date

  // Add time if provided
  if (hours && minutes) {
    const h = parseInt(hours);
    const min = parseInt(minutes);

    if (h < 0 || h > 23 || min < 0 || min > 59) {
      return null;
    }

    date.setHours(h, min, 0, 0);
  } else {
    // Default to end of day if no time specified
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

/**
 * Format a date for display
 */
export function formatDueDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  // Only show time if it's not the default end-of-day time
  if (hours === '23' && minutes === '59') {
    return `${year}-${month}-${day}`;
  }

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
