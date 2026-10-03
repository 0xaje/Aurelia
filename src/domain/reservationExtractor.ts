/**
 * AURELIA — Shortlet Reservation Intent & Detail Extractor
 * 
 * Extracts guest name and stay dates deterministically from visitor natural language.
 * Never invents dates or silent defaults from vague phrases (e.g. "next weekend").
 */

import { calculateNights } from "./reservationLogic";

export interface ExtractedReservationIntent {
  hasReservationIntent: boolean;
  isComplete: boolean;
  guestName?: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  missingFields: Array<"guestName" | "checkIn" | "checkOut">;
  validationError?: string;
}

const MONTH_NAMES: Record<string, string> = {
  january: "01",
  jan: "01",
  february: "02",
  feb: "02",
  march: "03",
  mar: "03",
  april: "04",
  apr: "04",
  may: "05",
  june: "06",
  jun: "06",
  july: "07",
  jul: "07",
  august: "08",
  aug: "08",
  september: "09",
  sep: "09",
  sept: "09",
  october: "10",
  oct: "10",
  november: "11",
  nov: "11",
  december: "12",
  dec: "12"
};

const MONTH_PATTERN = Object.keys(MONTH_NAMES).join("|");

/**
 * Normalizes day string (e.g. "9th", "11", "1st") to two-digit format ("09", "11", "01").
 */
function normalizeDay(dayStr: string): string {
  const digits = dayStr.replace(/\D/g, "");
  return digits.padStart(2, "0");
}

/**
 * Parses natural language check-in and check-out dates from an utterance.
 * Supports:
 * - "from October 9th to October 11th"
 * - "from October 9 to 11"
 * - "from October 28th to November 2nd"
 * - "from 2026-10-09 to 2026-10-11"
 * Returns YYYY-MM-DD format with dynamic current year.
 */
export function extractStayDates(
  input: string,
  referenceYear: number = new Date().getFullYear()
): { checkIn?: string; checkOut?: string } {
  const text = input.trim();

  // 1. ISO Date Format: YYYY-MM-DD to YYYY-MM-DD
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})\s+(?:to|-|until|through)\s+(\d{4}-\d{2}-\d{2})/i);
  if (isoMatch) {
    return {
      checkIn: isoMatch[1],
      checkOut: isoMatch[2]
    };
  }

  // 2. Natural Month + Day: e.g. "from October 9th to October 11th" or "from October 9 to 11"
  const dateRangeRegex = new RegExp(
    `(?:from|for|between)?\\s*(${MONTH_PATTERN})\\s+(\\d{1,2}(?:st|nd|rd|th)?)\\s+(?:to|-|until|through)\\s+(?:(${MONTH_PATTERN})\\s+)?(\\d{1,2}(?:st|nd|rd|th)?)`,
    "i"
  );

  const match = text.match(dateRangeRegex);
  if (match) {
    const startMonthName = match[1].toLowerCase();
    const startDay = normalizeDay(match[2]);
    const endMonthName = (match[3] ? match[3].toLowerCase() : startMonthName);
    const endDay = normalizeDay(match[4]);

    const startMonth = MONTH_NAMES[startMonthName];
    const endMonth = MONTH_NAMES[endMonthName];

    if (startMonth && endMonth) {
      const checkIn = `${referenceYear}-${startMonth}-${startDay}`;
      const checkOut = `${referenceYear}-${endMonth}-${endDay}`;
      return { checkIn, checkOut };
    }
  }

  return {};
}

/**
 * Extracts guest name from natural language (e.g. "for John", "for John Doe", "for Sarah").
 * Avoids matching common conversational stop words or spatial terms.
 */
export function extractGuestName(input: string): string | undefined {
  const stopWords = new Set([
    "aurelia",
    "sanctuary",
    "shortlet",
    "estate",
    "house",
    "property",
    "two",
    "three",
    "four",
    "five",
    "next",
    "weekend",
    "tonight",
    "today",
    "the",
    "a",
    "an",
    "me",
    "us",
    "my",
    "our",
    "him",
    "her",
    "them",
    "from",
    "to",
    "until",
    "through",
    "between",
    "starting",
    "on",
    "at",
    "in",
    "with",
    "dates",
    "night",
    "nights",
    "october",
    "november",
    "december",
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september"
  ]);

  // Match: "for <GuestName>" (e.g. "for John", "for John Doe", "for Sarah")
  const match = input.match(/\bfor\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/i);
  if (match) {
    const rawCandidate = match[1].trim();
    const words = rawCandidate.split(/\s+/).filter(Boolean);
    const validNameWords: string[] = [];

    for (const w of words) {
      if (stopWords.has(w.toLowerCase())) {
        break; // Stop at any preposition or date delimiter like "from"
      }
      validNameWords.push(w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
    }

    if (validNameWords.length > 0) {
      return validNameWords.join(" ");
    }
  }

  return undefined;
}

/**
 * Detects whether the visitor's utterance expresses a reservation intent and extracts
 * all available booking parameters.
 */
export function extractReservationIntent(
  input: string,
  referenceYear?: number
): ExtractedReservationIntent {
  const norm = input.toLowerCase().replace(/[^a-z0-9_\s-]/g, " ").replace(/\s+/g, " ").trim();

  // Detect explicit reservation phrases
  const hasReservationIntent =
    norm.includes("reserve") ||
    norm.includes("reservation") ||
    norm.includes("book") ||
    norm.includes("booking") ||
    norm.includes("stay for") ||
    norm.includes("plan a stay");

  if (!hasReservationIntent) {
    return {
      hasReservationIntent: false,
      isComplete: false,
      missingFields: ["guestName", "checkIn", "checkOut"]
    };
  }

  const guestName = extractGuestName(input);
  const { checkIn, checkOut } = extractStayDates(input, referenceYear);

  const missingFields: Array<"guestName" | "checkIn" | "checkOut"> = [];
  if (!guestName) missingFields.push("guestName");
  if (!checkIn) missingFields.push("checkIn");
  if (!checkOut) missingFields.push("checkOut");

  // Vague relative dates check: e.g. "next weekend", "next week", "tomorrow"
  if (norm.includes("next weekend") || norm.includes("next week") || norm.includes("tomorrow")) {
    if (!checkIn || !checkOut) {
      return {
        hasReservationIntent: true,
        isComplete: false,
        guestName,
        missingFields: ["checkIn", "checkOut"],
        validationError: "Please provide explicit calendar dates (for example, from October 9th to October 11th)."
      };
    }
  }

  if (checkIn && checkOut) {
    try {
      const nights = calculateNights(checkIn, checkOut);
      return {
        hasReservationIntent: true,
        isComplete: missingFields.length === 0,
        guestName,
        checkIn,
        checkOut,
        nights,
        missingFields
      };
    } catch (err) {
      return {
        hasReservationIntent: true,
        isComplete: false,
        guestName,
        checkIn,
        checkOut,
        missingFields,
        validationError: (err as Error).message
      };
    }
  }

  return {
    hasReservationIntent: true,
    isComplete: false,
    guestName,
    checkIn,
    checkOut,
    missingFields
  };
}
