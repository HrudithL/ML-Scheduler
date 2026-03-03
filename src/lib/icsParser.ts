/**
 * ICS (iCalendar) parser for importing course schedules.
 *
 * Detects recurring VEVENT entries, maps BYDAY rules to day codes,
 * and marks courses whose times span 12:00 AM → 12:00 AM as virtual.
 */

export interface ParsedCourse {
  name: string;
  days: string[];
  start_time_str: string | null; // "HH:mm" or null for virtual
  end_time_str: string | null;
  is_virtual: boolean;
  /** Raw location string from the ICS, if present */
  location: string | null;
}

// BYDAY abbreviations → our internal day codes
const ICS_DAY_MAP: Record<string, string> = {
  MO: "mon",
  TU: "tue",
  WE: "wed",
  TH: "thu",
  FR: "fri",
  SA: "sat",
  SU: "sun",
};

/**
 * Extracts the time portion from an ICS datetime string.
 * Accepts formats like "20260302T093000" or "20260302T093000Z".
 * Returns "HH:mm" or null if no time component.
 */
function extractTime(dtValue: string): string | null {
  // Remove any TZID prefix (e.g., DTSTART;TZID=America/Chicago:20260302T093000)
  const raw = dtValue.includes(":") ? dtValue.split(":").pop()! : dtValue;

  const match = raw.match(/T(\d{2})(\d{2})/);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

/**
 * Check if start/end times represent a full-day (12 AM to 12 AM) event → virtual course.
 */
function isFullDay(startTime: string | null, endTime: string | null): boolean {
  return startTime === "00:00" && endTime === "00:00";
}

/**
 * Unfold ICS content lines (RFC 5545 §3.1: lines starting with a space or tab
 * are continuations of the previous line).
 */
function unfoldLines(raw: string): string[] {
  return raw
    .replace(/\r\n[ \t]/g, "") // CRLF folding
    .replace(/\r/g, "") // normalise remaining CR
    .split("\n");
}

/**
 * Deduplicate parsed courses that share the same name by merging their days.
 * ICS files often have one VEVENT per occurrence rather than a single recurring event.
 */
function deduplicateCourses(courses: ParsedCourse[]): ParsedCourse[] {
  const map = new Map<string, ParsedCourse>();

  for (const c of courses) {
    const key = c.name;
    const existing = map.get(key);
    if (existing) {
      // Merge days
      const daySet = new Set([...existing.days, ...c.days]);
      existing.days = [...daySet];
      // Keep times from whichever has them; prefer non-virtual
      if (existing.is_virtual && !c.is_virtual) {
        existing.start_time_str = c.start_time_str;
        existing.end_time_str = c.end_time_str;
        existing.is_virtual = false;
      }
    } else {
      map.set(key, { ...c, days: [...c.days] });
    }
  }

  return Array.from(map.values());
}

/**
 * Determine the day-of-week code for a given ICS date string
 * (e.g. "20260302T093000") using the JS Date object.
 */
function dayCodeFromDt(dtValue: string): string | null {
  const raw = dtValue.includes(":") ? dtValue.split(":").pop()! : dtValue;
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const jsDay = d.getDay(); // 0=Sun
  const map = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return map[jsDay];
}

/**
 * Parse an ICS string and return a list of courses.
 */
export function parseICS(icsContent: string): ParsedCourse[] {
  const lines = unfoldLines(icsContent);
  const courses: ParsedCourse[] = [];

  let inEvent = false;
  let summary = "";
  let dtStart = "";
  let dtEnd = "";
  let rruleLine = "";
  let location = "";

  const flushEvent = () => {
    if (!summary) return;

    const startTime = extractTime(dtStart);
    const endTime = extractTime(dtEnd);
    const virtual = isFullDay(startTime, endTime);

    // Determine days from RRULE BYDAY or fall back to DTSTART
    let days: string[] = [];
    if (rruleLine) {
      const byDayMatch = rruleLine.match(/BYDAY=([^;]+)/);
      if (byDayMatch) {
        days = byDayMatch[1]
          .split(",")
          .map((d) => d.replace(/\d/g, "").trim()) // strip ordinal prefixes like "1MO"
          .map((d) => ICS_DAY_MAP[d])
          .filter(Boolean);
      }
    }

    // If no BYDAY rule, derive day from DTSTART
    if (days.length === 0 && dtStart) {
      const dc = dayCodeFromDt(dtStart);
      if (dc) days = [dc];
    }

    courses.push({
      name: summary.trim(),
      days,
      start_time_str: virtual ? null : startTime,
      end_time_str: virtual ? null : endTime,
      is_virtual: virtual,
      location: location || null,
    });
  };

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      summary = "";
      dtStart = "";
      dtEnd = "";
      rruleLine = "";
      location = "";
      continue;
    }

    if (line === "END:VEVENT") {
      flushEvent();
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    if (line.startsWith("SUMMARY:")) {
      summary = line.substring("SUMMARY:".length);
    } else if (line.startsWith("DTSTART")) {
      // Could be DTSTART:value or DTSTART;TZID=...:value
      dtStart = line.substring(line.indexOf(":") === -1 ? "DTSTART".length : 0);
      // Keep full string so extractTime / dayCodeFromDt can parse
      dtStart = line;
    } else if (line.startsWith("DTEND")) {
      dtEnd = line;
    } else if (line.startsWith("RRULE:")) {
      rruleLine = line.substring("RRULE:".length);
    } else if (line.startsWith("LOCATION:")) {
      location = line.substring("LOCATION:".length);
    }
  }

  return deduplicateCourses(courses);
}
