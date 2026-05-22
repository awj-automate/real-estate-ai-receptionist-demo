import { google } from "googleapis";

import { getGoogleAuth, parseAppointmentWindow, readToolArgs } from "@/lib/booking";

export const dynamic = "force-dynamic";

const errMsg = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

/**
 * Records the outcome of a call. Always logs the lead to the Google Sheet;
 * additionally creates a Google Calendar event when an appointment time is
 * provided (a qualified, booked lead). A disqualified lead — no appointment
 * time — is logged to the sheet only.
 *
 * Called by the Call Summary after every call, and usable as a Retell custom
 * function too (it accepts the `{ args }` webhook shape).
 */
export async function POST(req: Request) {
  const args = await readToolArgs(req);
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const v = args[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };

  const lead = {
    name: get("customer_name", "customerName"),
    phone: get("customer_phone", "customerPhone", "phone"),
    email: get("customer_email", "customerEmail", "email"),
    inquiryType: get("inquiry_type", "inquiryType"),
    property: get("property", "property_address", "propertyAddress"),
    timeline: get("timeline"),
    financing: get("financing", "pre_approval_status", "preApprovalStatus"),
    leadQuality: get("lead_quality", "leadQuality"),
    appointment: get(
      "appointment_time",
      "appointmentTime",
      "appointment",
      "appointment_window"
    ),
  };
  const willBook = lead.appointment.length > 0;
  const outcome = get("outcome") || (willBook ? "Booked" : "Not booked");

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetAuth = getGoogleAuth([
    "https://www.googleapis.com/auth/spreadsheets",
  ]);

  if (!sheetAuth || !spreadsheetId) {
    return Response.json(
      {
        ok: false,
        configured: false,
        result: "Booking isn't connected — set the GOOGLE_* env vars.",
      },
      { status: 503 }
    );
  }

  let loggedToSheet = false;
  let booked = false;
  let calendarUrl: string | undefined;
  let sheetError = "";
  let calendarError = "";

  // 1. Always log the lead to the CRM sheet.
  try {
    const sheets = google.sheets({ version: "v4", auth: sheetAuth });
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Bookings!A:L",
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [
          [
            new Date().toLocaleString("en-US", {
              timeZone: "America/New_York",
            }),
            lead.name,
            lead.phone,
            lead.email,
            lead.inquiryType,
            lead.property,
            lead.timeline,
            lead.financing,
            lead.leadQuality,
            lead.appointment,
            outcome,
            "Demo",
          ],
        ],
      },
    });
    loggedToSheet = true;
  } catch (err) {
    console.error("[agent/book-appointment] sheet", err);
    sheetError = errMsg(err);
  }

  // 2. Qualified + has a time → also create the calendar event.
  if (willBook) {
    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const calAuth = getGoogleAuth(["https://www.googleapis.com/auth/calendar"]);
    if (!calendarId || !calAuth) {
      calendarError = "GOOGLE_CALENDAR_ID is not set.";
    } else {
      try {
        const { start, end, timeZone } = parseAppointmentWindow(
          lead.appointment
        );
        const calendar = google.calendar({ version: "v3", auth: calAuth });
        const event = await calendar.events.insert({
          calendarId,
          requestBody: {
            summary: `Consultation — ${lead.name || "New lead"}`,
            location: lead.property || undefined,
            description: [
              `Inquiry: ${lead.inquiryType || "—"}`,
              `Looking for: ${lead.property || "—"}`,
              `Timeline: ${lead.timeline || "—"}`,
              `Financing: ${lead.financing || "—"}`,
              `Lead quality: ${lead.leadQuality || "—"}`,
              `Phone: ${lead.phone || "—"}`,
              `Email: ${lead.email || "—"}`,
              "",
              "Booked by the AI receptionist (DataStaq demo).",
            ].join("\n"),
            start: { dateTime: start, timeZone },
            end: { dateTime: end, timeZone },
          },
        });
        booked = true;
        calendarUrl = event.data.htmlLink ?? undefined;
      } catch (err) {
        console.error("[agent/book-appointment] calendar", err);
        calendarError = errMsg(err);
      }
    }
  }

  let result: string;
  if (!loggedToSheet) {
    result = `Couldn't write to the Google Sheet — ${
      sheetError || "unknown error"
    }`;
  } else if (willBook && !booked) {
    result = `Lead saved, but the calendar event failed — ${
      calendarError || "unknown error"
    }`;
  } else if (booked) {
    result = "Done — the consultation is on the calendar and the lead is saved.";
  } else {
    result = "The lead is saved to the CRM sheet.";
  }

  return Response.json({
    ok: loggedToSheet,
    configured: true,
    loggedToSheet,
    willBook,
    booked,
    calendarUrl,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    sheetError: sheetError || undefined,
    calendarError: calendarError || undefined,
    result,
  });
}
