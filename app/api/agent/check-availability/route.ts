import { google } from "googleapis";

import {
  candidateSlots,
  getGoogleAuth,
  parseAppointmentWindow,
  readToolArgs,
  zonedToUtc,
} from "@/lib/booking";

export const dynamic = "force-dynamic";

/** Retell custom function — the agent calls this mid-call to check the calendar. */
const overlaps = (s1: Date, e1: Date, s2: Date, e2: Date) =>
  s1 < e2 && s2 < e1;

export async function POST(req: Request) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const auth = getGoogleAuth(["https://www.googleapis.com/auth/calendar"]);

  // Fail open — if the calendar isn't connected, don't block the conversation.
  if (!auth || !calendarId) {
    return Response.json({
      result:
        "The calendar isn't connected, so go ahead and tentatively confirm the time the caller wants.",
      available: true,
      configured: false,
    });
  }

  const args = await readToolArgs(req);
  const requestedTime = String(
    args.requested_time ?? args.requestedTime ?? args.time ?? ""
  ).trim();

  try {
    const { start, end, timeZone } = parseAppointmentWindow(requestedTime);
    const slotStart = zonedToUtc(start, timeZone);
    const slotEnd = zonedToUtc(end, timeZone);

    const calendar = google.calendar({ version: "v3", auth });
    const fb = await calendar.freebusy.query({
      requestBody: {
        timeMin: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        timeMax: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        items: [{ id: calendarId }],
      },
    });
    const busy = (fb.data.calendars?.[calendarId]?.busy ?? []).map((b) => ({
      start: new Date(String(b.start)),
      end: new Date(String(b.end)),
    }));

    const requestedFree = !busy.some((b) =>
      overlaps(slotStart, slotEnd, b.start, b.end)
    );

    if (requestedFree) {
      return Response.json({
        result: "That time is open — go ahead and confirm the consultation.",
        available: true,
        configured: true,
      });
    }

    const open = candidateSlots()
      .filter((c) => !busy.some((b) => overlaps(c.start, c.end, b.start, b.end)))
      .slice(0, 3);
    const altText = open.length
      ? open.map((s) => s.label).join(", or ")
      : "later this week";

    return Response.json({
      result: `That time is already booked. Offer the caller these open times instead: ${altText}.`,
      available: false,
      alternatives: open.map((s) => s.label),
      configured: true,
    });
  } catch (err) {
    console.error("[agent/check-availability]", err);
    return Response.json({
      result:
        "I couldn't reach the calendar just now — go ahead and tentatively confirm the time.",
      available: true,
      configured: true,
    });
  }
}
