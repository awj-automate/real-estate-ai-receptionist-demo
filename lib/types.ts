/** Shared types for the real estate AI receptionist demo. */

/** Which screen the demo is showing. */
export type DemoMode = "home" | "live" | "sample" | "dashboard";

/** Lifecycle of a call screen (used by Mode 1 and Mode 2). */
export type CallView =
  | "idle"
  | "requesting-mic"
  | "connecting"
  | "active"
  | "summary"
  | "error";

/** A single utterance in a live or sample transcript. */
export interface TranscriptUtterance {
  role: "agent" | "user";
  content: string;
}

/** Structured data extracted from a completed lead-qualification call. */
export interface CallSummary {
  customerName: string;
  /** Buyer / Seller / Both. */
  inquiryType: string;
  /** Property of interest, search criteria, or the address being sold. */
  property: string;
  /** How soon they want to move / list. */
  timeline: string;
  /** Pre-approval, cash, or current mortgage status. */
  financing: string;
  /** Hot / Warm / Cool. */
  leadQuality: string;
  phone: string;
  email: string;
  /** The booked consultation window. */
  appointment: string;
}

/** Source of a summary — real extraction vs. graceful fallback. */
export type SummarySource = "openai" | "fallback" | "sample";
