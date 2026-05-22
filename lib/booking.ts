import { google } from "googleapis";

/** America/New_York — the demo market's timezone (Tampa, FL). */
export const TZ = "America/New_York";

/**
 * Builds a Google service-account JWT for the given scopes, or returns null
 * when the service-account env vars aren't set. One service account is shared
 * by the Sheets and Calendar integrations.
 */
export function getGoogleAuth(scopes: string[]) {
  const email = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  if (!email || !rawKey) return null;
  // .env stores the key with literal "\n" — restore real newlines.
  const key = rawKey.replace(/\\n/g, "\n");
  return new google.auth.JWT({ email, key, scopes });
}

/**
 * Reads tool arguments from a Retell custom-function webhook (`{ name, args,
 * call }`) or a direct POST body (the app calls these routes too).
 */
export async function readToolArgs(
  req: Request
): Promise<Record<string, unknown>> {
  try {
    const body = (await req.json()) as Record<string, unknown> | null;
    if (body && typeof body === "object") {
      if (body.args && typeof body.args === "object") {
        return body.args as Record<string, unknown>;
      }
      return body;
    }
  } catch {
    /* missing or invalid body */
  }
  return {};
}

export interface BookingTimes {
  /** Naive local datetime, e.g. "2026-05-22T16:00:00". */
  start: string;
  end: string;
  timeZone: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Y-M-D for "today" + offsetDays, evaluated in the booking timezone. */
function dateInTz(offsetDays: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const base = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
  base.setUTCDate(base.getUTCDate() + offsetDays);
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(
    base.getUTCDate()
  )}`;
}

/** Current hour (0–23) in the booking timezone. */
function nowHourInTz(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
}

/**
 * Converts a naive wall-clock datetime ("2026-05-22T16:00:00") in `tz` to the
 * real UTC instant — without a timezone library. Handles DST because
 * toLocaleString reports the actual offset for that date.
 */
export function zonedToUtc(naive: string, tz: string): Date {
  const asUtc = new Date(`${naive}Z`);
  const tzWall = new Date(asUtc.toLocaleString("en-US", { timeZone: tz }));
  const utcWall = new Date(asUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(asUtc.getTime() + (utcWall.getTime() - tzWall.getTime()));
}

/**
 * Parses a free-text appointment window ("Today, 4:00 PM") into a start/end
 * the Calendar API can use. Falls back to tomorrow 9–11 AM.
 */
export function parseAppointmentWindow(text: string): BookingTimes {
  const t = (text || "").toLowerCase();
  const date = t.includes("today") ? dateInTz(0) : dateInTz(1);

  const tokens = Array.from(
    t.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/g)
  )
    .map((m) => ({
      hour: Number(m[1]),
      min: m[2] ? Number(m[2]) : 0,
      mer: m[3] ? (m[3][0] === "p" ? "pm" : "am") : null,
    }))
    .filter((x) => x.hour >= 1 && x.hour <= 12);

  let sh: number;
  let sm = 0;
  let eh: number;
  let em = 0;

  if (tokens.length > 0) {
    const globalMer = tokens.find((x) => x.mer)?.mer ?? null;
    const to24 = (h: number, mer: string | null) => {
      const m = mer ?? globalMer;
      if (m === "pm" && h < 12) return h + 12;
      if (m === "am" && h === 12) return 0;
      if (!m && h <= 7) return h + 12; // bare 1–7 → afternoon (business hours)
      return h;
    };
    sh = to24(tokens[0].hour, tokens[0].mer);
    sm = tokens[0].min;
    if (tokens.length > 1) {
      eh = to24(tokens[1].hour, tokens[1].mer);
      em = tokens[1].min;
    } else {
      eh = sh + 1;
      em = sm;
    }
  } else if (t.includes("morning")) {
    sh = 9;
    eh = 11;
  } else if (t.includes("afternoon")) {
    sh = 13;
    eh = 16;
  } else if (t.includes("evening")) {
    sh = 17;
    eh = 19;
  } else {
    sh = 9;
    eh = 11;
  }

  if (eh * 60 + em <= sh * 60 + sm) {
    eh = Math.min(23, sh + 1);
    em = sm;
  }

  return {
    start: `${date}T${pad(sh)}:${pad(sm)}:00`,
    end: `${date}T${pad(eh)}:${pad(em)}:00`,
    timeZone: TZ,
  };
}

export interface CandidateSlot {
  /** Friendly label, e.g. "tomorrow at 10 AM". */
  label: string;
  start: Date;
  end: Date;
}

/**
 * Business-hour 1-hour slots across today (remaining) and tomorrow — used to
 * suggest alternatives when a requested time is unavailable.
 */
export function candidateSlots(): CandidateSlot[] {
  const hours = [9, 11, 13, 15];
  const nowHour = nowHourInTz();
  const slots: CandidateSlot[] = [];

  for (const offset of [0, 1]) {
    const date = dateInTz(offset);
    const dayWord = offset === 0 ? "today" : "tomorrow";
    for (const h of hours) {
      if (offset === 0 && h <= nowHour + 1) continue; // skip past/too-soon today
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const ampm = h < 12 ? "AM" : "PM";
      slots.push({
        label: `${dayWord} at ${h12} ${ampm}`,
        start: zonedToUtc(`${date}T${pad(h)}:00:00`, TZ),
        end: zonedToUtc(`${date}T${pad(h + 1)}:00:00`, TZ),
      });
    }
  }
  return slots;
}
