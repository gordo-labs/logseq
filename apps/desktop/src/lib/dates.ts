/**
 * Date utilities for Logseq journal pages
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Format date as Logseq journal title: "Feb 18th, 2026"
 */
export function formatJournalTitle(date: Date): string {
  const month = MONTHS[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  const suffix = getOrdinalSuffix(day);
  return `${month} ${day}${suffix}, ${year}`;
}

/**
 * Format date as ISO: "2026-02-18" (used for file names)
 */
export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's journal title in Logseq format
 */
export function getTodayJournalTitle(): string {
  return formatJournalTitle(new Date());
}

/**
 * Get today's journal file name (ISO format)
 */
export function getTodayJournalFileName(): string {
  return formatIsoDate(new Date());
}

/**
 * Parse a journal title back to a Date object
 * Handles both "Feb 18th, 2026" and "2026-02-18" formats
 */
export function parseJournalTitle(title: string): Date | null {
  // Try ISO format first: 2026-02-18
  const isoMatch = title.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }
  
  // Try Logseq format: Feb 18th, 2026
  const logseqMatch = title.match(/^(\w+)\s+(\d+)(?:st|nd|rd|th),\s*(\d{4})$/);
  if (logseqMatch) {
    const monthIdx = MONTHS.indexOf(logseqMatch[1]);
    if (monthIdx === -1) {
      const fullMonthIdx = FULL_MONTHS.findIndex(m => m.startsWith(logseqMatch[1]));
      if (fullMonthIdx === -1) return null;
      return new Date(parseInt(logseqMatch[3]), fullMonthIdx, parseInt(logseqMatch[2]));
    }
    return new Date(parseInt(logseqMatch[3]), monthIdx, parseInt(logseqMatch[2]));
  }
  
  return null;
}

/**
 * Check if a page title is a journal page
 */
export function isJournalTitle(title: string): boolean {
  return parseJournalTitle(title) !== null;
}

/**
 * Get the previous day's journal title
 */
export function getPreviousDay(title: string): string {
  const date = parseJournalTitle(title);
  if (!date) return title;
  date.setDate(date.getDate() - 1);
  return formatJournalTitle(date);
}

/**
 * Get the next day's journal title
 */
export function getNextDay(title: string): string {
  const date = parseJournalTitle(title);
  if (!date) return title;
  date.setDate(date.getDate() + 1);
  return formatJournalTitle(date);
}

/**
 * Get relative day description
 */
export function getRelativeDay(title: string): string | null {
  const date = parseJournalTitle(title);
  if (!date) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < -1 && diffDays >= -7) return `${-diffDays} days ago`;
  
  return null;
}
