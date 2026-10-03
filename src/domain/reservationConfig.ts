/**
 * AURELIA — Shortlet Reservation Domain Configuration
 * 
 * Defines authoritative domain configuration for the Aurelia Sanctuary luxury shortlet.
 * Keeps pricing and reference prefix rules decoupled from ORA Core.
 */

export interface AureliaReservationConfig {
  propertyId: string;
  propertyName: string;
  tagline: string;
  currency: string;
  nightlyRate: number;
  referencePrefix: string;
}

export const AURELIA_RESERVATION_CONFIG: AureliaReservationConfig = {
  propertyId: "aurelia-sanctuary",
  propertyName: "Aurelia Sanctuary",
  tagline: "A secluded modernist retreat nestled above the highland valley",
  currency: "USD",
  nightlyRate: 1850,
  referencePrefix: "AUR"
} as const;
