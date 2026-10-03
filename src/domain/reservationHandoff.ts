/**
 * AURELIA — Reservation WhatsApp Handoff Message & URL Builder (Phase 4)
 * 
 * Pure, deterministic functions that construct human-readable WhatsApp
 * handoff messages and deep links from verified ReservationRequest records.
 * Contains zero network calls, zero server APIs, and zero hardcoded credentials.
 */

import { ReservationRequest } from "./reservationTypes";
import { AURELIA_RESERVATION_CONFIG } from "./reservationConfig";

/**
 * Formats an ISO date string (YYYY-MM-DD) into a clean, human-readable format.
 * Example: "2026-10-09" -> "October 9, 2026".
 * If parsing fails or input is empty, falls back gracefully to the raw string.
 */
export function formatStayDate(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return isoDate || "Pending";
  }
  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const monthIndex = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day)) {
    return `${monthNames[monthIndex]} ${day}, ${yearStr}`;
  }
  return isoDate;
}

/**
 * Constructs a structured, human-readable WhatsApp handoff message.
 * Truthfully frames the message as a Reservation Request, not a confirmed booking or invoice.
 */
export function buildReservationHandoffMessage(reservation: ReservationRequest): string {
  const propertyName = AURELIA_RESERVATION_CONFIG.propertyName;
  const formattedCheckIn = formatStayDate(reservation.checkIn);
  const formattedCheckOut = formatStayDate(reservation.checkOut);
  const nightsLabel = reservation.nights === 1 ? "1 night" : `${reservation.nights} nights`;
  const formattedRate = `$${reservation.nightlyRate.toLocaleString()} ${reservation.currency}`;
  const formattedTotal = `$${reservation.total.toLocaleString()} ${reservation.currency}`;

  return [
    `Hello ${propertyName},`,
    "",
    "I would like to submit a reservation request for a private stay.",
    "",
    `Property: ${propertyName}`,
    `Request Reference: ${reservation.reference}`,
    "",
    `Guest: ${reservation.guestName || "Guest"}`,
    `Check-in: ${formattedCheckIn}`,
    `Check-out: ${formattedCheckOut}`,
    `Stay: ${nightsLabel}`,
    "",
    `Shortlet nightly rate: ${formattedRate} / night`,
    `Estimated total: ${formattedTotal}`,
    "",
    "Status: Reservation Request (Ready for Handoff)",
    "",
    "Please assist with availability and final confirmation.",
    "",
    "Thank you."
  ].join("\n");
}

/**
 * Builds a valid, URL-encoded WhatsApp browser deep link.
 * Format: https://wa.me/?text=<encoded-message>
 */
export function buildWhatsAppHandoffUrl(reservation: ReservationRequest): string {
  const message = buildReservationHandoffMessage(reservation);
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
