/**
 * Date Formatter Utility
 * Formats dates according to user's preferred format
 */

// Supported date formats
export const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2025)', example: '31/12/2025' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2025)', example: '12/31/2025' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-12-31)', example: '2025-12-31' },
  { value: 'DD-MMM-YYYY', label: 'DD-MMM-YYYY (31-Dec-2025)', example: '31-Dec-2025' },
  { value: 'MMM DD, YYYY', label: 'MMM DD, YYYY (Dec 31, 2025)', example: 'Dec 31, 2025' },
  { value: 'MMMM DD, YYYY', label: 'MMMM DD, YYYY (December 31, 2025)', example: 'December 31, 2025' },
];

// Month names
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Format a date according to the specified format
 * @param date - Date string or Date object
 * @param format - Date format string (e.g., 'DD/MM/YYYY')
 * @returns Formatted date string
 */
export function formatDate(date: string | Date | null | undefined, format: string = 'DD/MM/YYYY'): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) return '-';

  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1; // JavaScript months are 0-indexed
  const year = dateObj.getFullYear();

  const dayPadded = day.toString().padStart(2, '0');
  const monthPadded = month.toString().padStart(2, '0');
  const monthNameShort = MONTH_NAMES_SHORT[dateObj.getMonth()];
  const monthNameLong = MONTH_NAMES_LONG[dateObj.getMonth()];

  // Format according to the specified format
  switch (format) {
    case 'DD/MM/YYYY':
      return `${dayPadded}/${monthPadded}/${year}`;

    case 'MM/DD/YYYY':
      return `${monthPadded}/${dayPadded}/${year}`;

    case 'YYYY-MM-DD':
      return `${year}-${monthPadded}-${dayPadded}`;

    case 'DD-MMM-YYYY':
      return `${dayPadded}-${monthNameShort}-${year}`;

    case 'MMM DD, YYYY':
      return `${monthNameShort} ${dayPadded}, ${year}`;

    case 'MMMM DD, YYYY':
      return `${monthNameLong} ${dayPadded}, ${year}`;

    default:
      // Default to DD/MM/YYYY if unknown format
      return `${dayPadded}/${monthPadded}/${year}`;
  }
}

/**
 * Format a date with time according to the specified format
 * @param date - Date string or Date object
 * @param format - Date format string
 * @param includeSeconds - Whether to include seconds in time
 * @returns Formatted date-time string
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  format: string = 'DD/MM/YYYY',
  includeSeconds: boolean = false
): string {
  if (!date) return '-';

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) return '-';

  const datePart = formatDate(dateObj, format);
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  const seconds = dateObj.getSeconds().toString().padStart(2, '0');

  const timePart = includeSeconds
    ? `${hours}:${minutes}:${seconds}`
    : `${hours}:${minutes}`;

  return `${datePart} ${timePart}`;
}

/**
 * Get date range description (e.g., for fiscal year)
 * @param startDate - Start date
 * @param endDate - End date
 * @param format - Date format
 * @returns Formatted date range string
 */
export function formatDateRange(
  startDate: string | Date,
  endDate: string | Date,
  format: string = 'DD/MM/YYYY'
): string {
  return `${formatDate(startDate, format)} - ${formatDate(endDate, format)}`;
}
