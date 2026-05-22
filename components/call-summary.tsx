"use client";

import { motion } from "framer-motion";
import {
  ArrowLeftRight,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CircleCheck,
  CircleCheckBig,
  ExternalLink,
  Flame,
  House,
  Landmark,
  LoaderCircle,
  Mail,
  Phone,
  RotateCcw,
  TriangleAlert,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { CallSummary as CallSummaryData } from "@/lib/types";

interface CallSummaryProps {
  summary: CallSummaryData | null;
  loading: boolean;
  onRestart: () => void;
  onHome: () => void;
  restartLabel: string;
}

const SUCCESS = "#22A559";

type BookingState = "idle" | "saving" | "done" | "error" | "unconfigured";

interface BookingResult {
  loggedToSheet: boolean;
  booked: boolean;
  sheetUrl?: string;
  calendarUrl?: string;
}

/** Treats blank / unknown values as "not captured". */
function display(value: string | undefined | null): {
  text: string;
  captured: boolean;
} {
  const v = (value ?? "").trim();
  if (!v || /^(n\/?a|unknown|none|not provided)$/i.test(v)) {
    return { text: "Not captured", captured: false };
  }
  return { text: v, captured: true };
}

/** Badge styling for the Hot / Warm / Cool lead score. */
function qualityStyle(quality: string): string {
  const q = quality.toLowerCase();
  if (q.includes("hot")) return "border-red-500/30 bg-red-500/[0.12] text-red-600";
  if (q.includes("warm"))
    return "border-amber-500/35 bg-amber-500/[0.15] text-amber-700";
  if (q.includes("cool"))
    return "border-sky-500/30 bg-sky-500/[0.12] text-sky-700";
  return "border-ds-primary/30 bg-ds-primary/[0.1] text-ds-primary-dark";
}

export function CallSummary({
  summary,
  loading,
  onRestart,
  onHome,
  restartLabel,
}: CallSummaryProps) {
  const [bookingState, setBookingState] = useState<BookingState>("idle");
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [bookingMessage, setBookingMessage] = useState("");
  const firedRef = useRef(false);

  // Once the summary is ready, record the call outcome: always log the lead to
  // the CRM sheet; book the calendar only when the call produced an appointment.
  useEffect(() => {
    if (loading || !summary || firedRef.current) return;
    firedRef.current = true;
    setBookingState("saving");
    fetch("/api/agent/book-appointment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name: summary.customerName,
        customer_phone: summary.phone,
        customer_email: summary.email,
        inquiry_type: summary.inquiryType,
        property: summary.property,
        timeline: summary.timeline,
        financing: summary.financing,
        lead_quality: summary.leadQuality,
        appointment_time: summary.appointment,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.configured === false) {
          setBookingState("unconfigured");
          setBookingMessage(
            data?.result ?? "Booking isn't connected on the server."
          );
        } else if (data?.ok) {
          setBookingState("done");
          setBookingResult(data as BookingResult);
        } else {
          setBookingState("error");
          setBookingMessage(data?.result ?? "Couldn't save the booking.");
        }
      })
      .catch(() => {
        setBookingState("error");
        setBookingMessage("Couldn't reach the server — please try again.");
      });
  }, [loading, summary]);

  if (loading || !summary) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center">
        <LoaderCircle className="h-10 w-10 animate-spin text-ds-primary" />
        <p className="font-jakarta text-lg font-semibold text-ds-heading">
          Analyzing the call…
        </p>
        <p className="font-jakarta text-sm text-ds-muted">
          Extracting the inquiry, qualification, and consultation booking.
        </p>
      </div>
    );
  }

  const rows = [
    { icon: User, label: "Lead", ...display(summary.customerName) },
    {
      icon: ArrowLeftRight,
      label: "Inquiry type",
      ...display(summary.inquiryType),
    },
    { icon: House, label: "Looking for", ...display(summary.property) },
    { icon: CalendarClock, label: "Timeline", ...display(summary.timeline) },
    { icon: Landmark, label: "Financing", ...display(summary.financing) },
    { icon: Phone, label: "Phone", ...display(summary.phone) },
    { icon: Mail, label: "Email", ...display(summary.email) },
  ];

  const appointment = display(summary.appointment);
  const quality = display(summary.leadQuality);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: `${SUCCESS}1F` }}
        >
          <CircleCheckBig className="h-7 w-7" style={{ color: SUCCESS }} />
        </div>
        <h2 className="font-jakarta text-2xl font-extrabold tracking-heading text-ds-heading">
          Call complete
        </h2>
        <p className="mt-1 font-jakarta text-sm text-ds-muted">
          Here&apos;s what the AI receptionist captured and actioned.
        </p>
        {quality.captured && (
          <div
            className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-jakarta text-xs font-bold uppercase tracking-wide ${qualityStyle(
              quality.text
            )}`}
          >
            <Flame className="h-3.5 w-3.5" />
            {quality.text} lead
          </div>
        )}
      </motion.div>

      {/* Extracted fields */}
      <div className="mt-6 space-y-2.5">
        {rows.map((row, i) => {
          const Icon = row.icon;
          return (
            <motion.div
              key={row.label}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 + i * 0.12 }}
              className="flex items-start gap-3 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 shadow-[0_1px_8px_rgba(0,0,0,0.03)]"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ds-primary/[0.12]">
                <Icon className="h-4 w-4 text-ds-primary-dark" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-jakarta text-[10px] font-bold uppercase tracking-[0.12em] text-ds-primary-dark">
                  {row.label}
                </p>
                <p
                  className={
                    row.captured
                      ? "font-jakarta text-sm text-ds-heading"
                      : "font-jakarta text-sm italic text-ds-subtle"
                  }
                >
                  {row.text}
                </p>
              </div>
              {row.captured && (
                <CircleCheckBig
                  className="mt-1 h-4 w-4 shrink-0"
                  style={{ color: SUCCESS }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* What the AI did — programmatic booking outcome */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 + rows.length * 0.12 }}
        className="mt-2.5 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_8px_rgba(0,0,0,0.03)]"
      >
        <p className="font-jakarta text-[10px] font-bold uppercase tracking-[0.12em] text-ds-primary-dark">
          What the AI did
        </p>

        {bookingState === "saving" && (
          <div className="mt-3 flex items-center gap-2 font-jakarta text-sm text-ds-muted">
            <LoaderCircle className="h-4 w-4 animate-spin text-ds-primary" />
            Saving the lead and booking…
          </div>
        )}

        {(bookingState === "error" || bookingState === "unconfigured") && (
          <p
            className={`mt-3 flex items-start gap-2 rounded-xl px-3 py-2.5 font-jakarta text-sm ${
              bookingState === "unconfigured"
                ? "bg-ds-primary/[0.08] text-ds-primary-dark"
                : "bg-red-500/[0.08] text-red-600"
            }`}
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {bookingMessage}
          </p>
        )}

        {bookingState === "done" && bookingResult && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2.5 rounded-xl border border-[#22A559]/25 bg-[#22A559]/[0.07] px-3 py-2.5">
              <CircleCheck
                className="h-4 w-4 shrink-0"
                style={{ color: SUCCESS }}
              />
              <span className="flex-1 font-jakarta text-sm text-ds-heading">
                Logged the lead to your CRM sheet
              </span>
              {bookingResult.sheetUrl && (
                <a
                  href={bookingResult.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-jakarta text-xs text-ds-muted hover:text-ds-primary-dark"
                >
                  View <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {bookingResult.booked ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-[#22A559]/25 bg-[#22A559]/[0.07] px-3 py-2.5">
                <CalendarCheck
                  className="h-4 w-4 shrink-0"
                  style={{ color: SUCCESS }}
                />
                <span className="flex-1 font-jakarta text-sm text-ds-heading">
                  Consultation booked — {appointment.text}
                </span>
                {bookingResult.calendarUrl && (
                  <a
                    href={bookingResult.calendarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-jakarta text-xs text-ds-muted hover:text-ds-primary-dark"
                  >
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 rounded-xl border border-black/[0.06] bg-ds-surface px-3 py-2.5">
                <CalendarX className="h-4 w-4 shrink-0 text-ds-subtle" />
                <span className="flex-1 font-jakarta text-sm text-ds-muted">
                  No calendar booking — lead not qualified for a consultation
                </span>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <Button
          variant="primary"
          size="lg"
          className="flex-1"
          onClick={onRestart}
        >
          <RotateCcw className="h-4 w-4" />
          {restartLabel}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          className="flex-1"
          onClick={onHome}
        >
          <House className="h-4 w-4" />
          Back to demo home
        </Button>
      </motion.div>
    </div>
  );
}
