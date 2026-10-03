/**
 * AURELIA — Reservation Domain Model (Phase 3)
 * 
 * Defines the strict, minimal data contracts for luxury shortlet reservation requests.
 * Represents a reservation request prepared for external handoff, NOT a confirmed booking.
 */

export type ReservationStatus = "DRAFT" | "READY_FOR_HANDOFF" | "HANDOFF_OPENED";

export interface ReservationRequest {
  reference: string;
  status: ReservationStatus;

  propertyId: string;

  guestName: string;

  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;

  nightlyRate: number;
  currency: string;
  total: number;

  createdAt: string;
  source: "ORA";
}

export interface CreateReservationParams {
  guestName?: string;
  checkIn?: string;
  checkOut?: string;
  propertyId?: string;
  source?: "ORA";
  status?: ReservationStatus;
}
