import React from "react";
import { formatDistanceToNow } from "date-fns";

/**
 * Parses a date string or Date object returned by the database.
 * Since the database server is located in India (IST, UTC+05:30),
 * un-offsetted DATETIME strings (e.g. "2026-08-01 16:43:00" or ISO strings)
 * represent Indian Standard Time.
 * This function parses the date as IST and converts it to a standard JS Date (UTC),
 * which can then be accurately compared to the user's active browser time Date.now().
 */
export function parseDbDate(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;

  const str = String(val).trim();
  if (!str) return null;

  // Extract YYYY, MM, DD, HH, mm, ss from string
  const match = str.match(/^(\d{4})[^\d](\d{2})[^\d](\d{2})(?:[^\d](\d{2})[^\d](\d{2})(?:[^\d](\d{2}))?)?/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const min = match[5] ? parseInt(match[5], 10) : 0;
    const sec = match[6] ? parseInt(match[6], 10) : 0;

    // Indian Standard Time (IST) offset is UTC+5:30 (5.5 hours = 19,800,000 ms)
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const utcMs = Date.UTC(year, month, day, hour, min, sec) - istOffsetMs;
    return new Date(utcMs);
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats LAST FOLLOW-UP for display relative to the user's current local time.
 */
export function fmtFollowUpDate(val: string | Date | null | undefined): React.ReactNode {
  if (!val) return "—";
  const d = parseDbDate(val);
  if (!d) return "—";

  const diffMs = Date.now() - d.getTime();

  // If slightly in the future (within 2 minutes) due to minor clock drift, display "just now"
  if (diffMs < 0 && diffMs > -120_000) {
    return <span className="text-muted">just now</span>;
  }

  const hours = diffMs / 3_600_000;
  return hours > 4
    ? <span className="text-amber font-semibold">{formatDistanceToNow(d, { addSuffix: true })}</span>
    : <span className="text-muted">{formatDistanceToNow(d, { addSuffix: true })}</span>;
}
