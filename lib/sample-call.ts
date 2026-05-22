import type { CallSummary } from "@/lib/types";

import script from "./sample-call-script.json";

/**
 * Scripted inbound buyer call for Mode 2 — a hot lead calling about a listing,
 * qualified and booked into a consultation.
 *
 * The line text lives in sample-call-script.json (single source of truth, also
 * read by scripts/generate-sample-audio.mjs). Each line has its own voiced
 * audio clip in public/audio/lines/, and Mode 2 plays them in sequence.
 */
export const SAMPLE_CALL = script as { role: "agent" | "user"; content: string }[];

/** Path to the voiced clip for a given line index (0-based). */
export function lineAudioSrc(index: number): string {
  return `/audio/lines/line-${String(index + 1).padStart(2, "0")}.mp3`;
}

/**
 * Pre-extracted summary for the sample call. Mode 2 uses this directly (the
 * transcript is fixed) so the Call Summary view is instant and reliable on a
 * sales call. Mode 1 extracts the equivalent live via /api/summarize.
 */
export const SAMPLE_CALL_SUMMARY: CallSummary = {
  customerName: "Mike Reynolds",
  inquiryType: "Buyer",
  property:
    "3-bed with a yard in South Tampa — including the Bayshore Blvd listing",
  timeline: "~30 days — lease ends end of next month",
  financing: "Pre-approved (~2 weeks ago)",
  leadQuality: "Hot",
  phone: "(813) 555-0142",
  email: "mike.reynolds@gmail.com",
  appointment: "Today, 4:00 PM — consultation with Jessica Martinez",
};
