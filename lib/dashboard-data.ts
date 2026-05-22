/** Mock data powering the Mode 3 dashboard. All values are illustrative. */

export interface DashboardStat {
  label: string;
  value: number;
  /** Rendered after the counted value, e.g. "s" or "%". */
  suffix: string;
  decimals?: number;
}

export const DASHBOARD_STATS: DashboardStat[] = [
  { label: "Calls answered this month", value: 312, suffix: "" },
  { label: "Consultations booked", value: 47, suffix: "" },
  { label: "Avg. answer time", value: 18, suffix: "s" },
  { label: "Answer rate", value: 94, suffix: "%" },
];

export interface WorkflowStep {
  title: string;
  detail: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  { title: "Inbound call", detail: "Buyer or seller dials in, 24/7" },
  { title: "AI answers", detail: "Picked up in 18 seconds" },
  { title: "Buyer / seller triage", detail: "Identify the inquiry type" },
  { title: "Lead qualification", detail: "Timeline, financing, motivation" },
  { title: "Consultation booked", detail: "Hot leads same-day" },
  { title: "CRM update", detail: "Lead synced to Follow Up Boss" },
];

export type LeadQuality = "Hot" | "Warm" | "Cool";

export interface Lead {
  id: string;
  name: string;
  /** Short inquiry description, e.g. "Buyer · 3-bed, South Tampa". */
  summary: string;
  /** Booked consultation window, or a follow-up note. */
  window: string;
  /** Assigned agent, or "Unassigned". */
  agent: string;
  quality: LeadQuality;
}

/** Leads already on the board when the dashboard loads. */
export const SEED_LEADS: Lead[] = [
  {
    id: "LD-2841",
    name: "D. Alvarez",
    summary: "Seller · home valuation, Hyde Park",
    window: "Consult today, 11 AM",
    agent: "Jessica M.",
    quality: "Hot",
  },
  {
    id: "LD-2842",
    name: "S. Whitfield",
    summary: "Buyer · downtown condo",
    window: "Consult Thu, 2 PM",
    agent: "Jessica M.",
    quality: "Warm",
  },
  {
    id: "LD-2843",
    name: "K. Osei",
    summary: "Buyer · browsing, no timeline",
    window: "Nurture follow-up",
    agent: "Jessica M.",
    quality: "Cool",
  },
];

/** Leads the AI qualifies live — fed onto the board one at a time. */
export const INCOMING_LEADS: Lead[] = [
  {
    id: "LD-2844",
    name: "M. Reynolds",
    summary: "Buyer · 3-bed, South Tampa",
    window: "Consult today, 4 PM",
    agent: "Unassigned",
    quality: "Hot",
  },
  {
    id: "LD-2845",
    name: "P. Nguyen",
    summary: "Seller · relocating for work",
    window: "Consult tomorrow, 9 AM",
    agent: "Unassigned",
    quality: "Warm",
  },
];

export interface ActivityEvent {
  /** 12-hour timestamp string, e.g. "2:47 AM". */
  time: string;
  summary: string;
  /** True for events outside 8 AM–6 PM — highlights after-hours coverage. */
  afterHours: boolean;
}

/**
 * Seed feed for the scrolling activity panel. Timestamps deliberately span the
 * full 24-hour clock to emphasize after-hours answering.
 */
export const ACTIVITY_FEED: ActivityEvent[] = [
  {
    time: "3:12 AM",
    summary: "Inbound call answered · Seller, valuation request · Booked 10 AM",
    afterHours: true,
  },
  {
    time: "1:48 AM",
    summary: "Inbound call answered · Buyer, pre-approved · Booked today 4 PM",
    afterHours: true,
  },
  {
    time: "11:36 PM",
    summary: "Inbound call answered · Buyer browsing condos · Nurture set",
    afterHours: true,
  },
  {
    time: "10:09 PM",
    summary: "Inbound call answered · Seller relocating · Hot lead, booked AM",
    afterHours: true,
  },
  {
    time: "8:21 PM",
    summary: "Inbound call answered · Buyer, specific listing · Showing set",
    afterHours: true,
  },
  {
    time: "6:54 PM",
    summary: "Inbound call answered · Seller, downsizing · Consult Friday",
    afterHours: true,
  },
  {
    time: "2:30 PM",
    summary: "Inbound call answered · Buyer, first-time · Consult booked",
    afterHours: false,
  },
  {
    time: "11:15 AM",
    summary: "Inbound call answered · Seller, market question · Valuation set",
    afterHours: false,
  },
];

/**
 * Pool of events prepended to the live feed on a timer to show the board
 * "working" during the demo.
 */
export const LIVE_FEED_POOL: Omit<ActivityEvent, "time">[] = [
  {
    summary: "Inbound call answered · Buyer, cash offer ready · Transferred live",
    afterHours: true,
  },
  {
    summary: "Inbound call answered · Seller, listing this month · Booked AM",
    afterHours: true,
  },
  {
    summary: "Inbound call answered · Buyer relocating to Tampa · Consult set",
    afterHours: false,
  },
  {
    summary: "Inbound call answered · Seller, inherited property · Booked Fri",
    afterHours: true,
  },
  {
    summary: "Inbound call answered · Buyer, 4-bed search · Showing scheduled",
    afterHours: true,
  },
  {
    summary: "Inbound call answered · Seller, valuation request · Consult booked",
    afterHours: false,
  },
];
