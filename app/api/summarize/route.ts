import OpenAI from "openai";

import type { CallSummary } from "@/lib/types";

export const dynamic = "force-dynamic";

const EMPTY_SUMMARY: CallSummary = {
  customerName: "",
  inquiryType: "",
  property: "",
  timeline: "",
  financing: "",
  leadQuality: "",
  phone: "",
  email: "",
  appointment: "",
};

/**
 * Extracts structured fields from a finished call transcript using GPT-4o.
 *
 * Degrades gracefully: with no transcript or no OPENAI_API_KEY it returns an
 * empty summary and `source: "fallback"` so the UI still renders.
 */
export async function POST(req: Request) {
  let transcript = "";
  try {
    const body = await req.json();
    if (typeof body?.transcript === "string") transcript = body.transcript;
  } catch {
    // Malformed body — treated as empty transcript below.
  }

  if (!transcript.trim()) {
    return Response.json({ summary: EMPTY_SUMMARY, source: "fallback" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ summary: EMPTY_SUMMARY, source: "fallback" });
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0,
      messages: [
        {
          role: "user",
          content: `Extract structured data from this real estate AI lead-qualification call transcript. Return JSON with these fields:
- customerName
- inquiryType: "Buyer", "Seller", or "Both"
- property: the property of interest, search criteria, or the address being sold
- timeline: how soon they want to move or list
- financing: pre-approval status, cash, or current mortgage status
- leadQuality: "Hot", "Warm", or "Cool" — based on timeline urgency and readiness
- phone
- email
- appointment: the booked consultation time

Use an empty string for any field not mentioned in the call.

Transcript:
${transcript}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const str = (v: unknown) => (v == null ? "" : String(v));

    const summary: CallSummary = {
      customerName: str(parsed.customerName),
      inquiryType: str(parsed.inquiryType),
      property: str(parsed.property),
      timeline: str(parsed.timeline),
      financing: str(parsed.financing),
      leadQuality: str(parsed.leadQuality),
      phone: str(parsed.phone),
      email: str(parsed.email),
      appointment: str(parsed.appointment),
    };

    return Response.json({ summary, source: "openai" });
  } catch (err) {
    console.error("[summarize] extraction failed:", err);
    return Response.json({ summary: EMPTY_SUMMARY, source: "fallback" });
  }
}
