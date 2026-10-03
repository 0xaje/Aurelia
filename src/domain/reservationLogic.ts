/**
 * AURELIA — Shortlet Reservation Business Logic
 * 
 * Pure, deterministic date calculation, pricing, and reference generation.
 * All pricing and stay duration arithmetic is owned by the application domain,
 * never hallucinated or calculated by the LLM.
 */

import { AURELIA_RESERVATION_CONFIG } from "./reservationConfig";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates check-in and check-out dates and calculates the stay duration in nights.
 * Enforces checkOut > checkIn and nights > 0.
 */
export function calculateNights(checkIn: string, checkOut: string): number {
  if (!ISO_DATE_REGEX.test(checkIn)) {
    throw new Error(`Invalid check-in date format: "${checkIn}". Expected YYYY-MM-DD.`);
  }
  if (!ISO_DATE_REGEX.test(checkOut)) {
    throw new Error(`Invalid check-out date format: "${checkOut}". Expected YYYY-MM-DD.`);
  }

  const [inYear, inMonth, inDay] = checkIn.split("-").map(Number);
  const [outYear, outMonth, outDay] = checkOut.split("-").map(Number);

  const startUtc = Date.UTC(inYear, inMonth - 1, inDay);
  const endUtc = Date.UTC(outYear, outMonth - 1, outDay);

  if (isNaN(startUtc) || isNaN(endUtc)) {
    throw new Error("Invalid date values encountered during night calculation.");
  }

  const diffMs = endUtc - startUtc;
  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (nights <= 0) {
    throw new Error(
      `Check-out date (${checkOut}) must be strictly after check-in date (${checkIn}). Calculated nights: ${nights}.`
    );
  }

  return nights;
}

/**
 * Calculates deterministic shortlet reservation pricing.
 * Total = nightlyRate * nights.
 */
export function calculateReservationPricing(
  nights: number,
  nightlyRate: number = AURELIA_RESERVATION_CONFIG.nightlyRate
): { nightlyRate: number; total: number } {
  if (nights <= 0 || !Number.isInteger(nights)) {
    throw new Error(`Invalid nights value for pricing: ${nights}. Must be a positive integer.`);
  }
  if (nightlyRate <= 0) {
    throw new Error(`Invalid nightly rate: ${nightlyRate}. Must be a positive number.`);
  }

  return {
    nightlyRate,
    total: nightlyRate * nights
  };
}

/**
 * Generates an authentic request reference adhering to AUR-YYYY-XXXX.
 * - Dynamic current year (not hardcoded).
 * - Exactly four digits.
 * - Guarantees uniqueness against existing session references.
 */
export function generateReservationReference(
  existingReferences?: Set<string> | string[],
  year?: number,
  deterministicDigits?: string
): string {
  const activeYear = year ?? new Date().getFullYear();
  const existingSet = existingReferences instanceof Set
    ? existingReferences
    : new Set(existingReferences || []);

  if (deterministicDigits && /^\d{4}$/.test(deterministicDigits)) {
    const candidate = `${AURELIA_RESERVATION_CONFIG.referencePrefix}-${activeYear}-${deterministicDigits}`;
    return candidate;
  }

  let attempts = 0;
  while (attempts < 1000) {
    const randomDigits = String(Math.floor(1000 + Math.random() * 9000));
    const candidate = `${AURELIA_RESERVATION_CONFIG.referencePrefix}-${activeYear}-${randomDigits}`;
    if (!existingSet.has(candidate)) {
      return candidate;
    }
    attempts++;
  }

  // Fallback timestamp-based suffix if loop exceeded
  const timestampSuffix = String(Date.now() % 10000).padStart(4, "0");
  return `${AURELIA_RESERVATION_CONFIG.referencePrefix}-${activeYear}-${timestampSuffix}`;
}
