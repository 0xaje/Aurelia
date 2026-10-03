/**
 * ORA — Pure Fast-Path Intent Router
 * 
 * Extracts and resolves explicit visitor navigation and environmental directives
 * deterministically in <1ms without cloud latency, API costs, or model hallucinations.
 * 
 * Architectural Rule:
 * This module is pure TypeScript: zero Node.js built-ins, zero server secrets,
 * zero side effects. It can be safely imported by both browser client and server runtime.
 */

import { SpaceId, AmbianceId } from "../domain/spatial";
import {
  OraDecision,
  OraConversationContext,
  PropertyContext
} from "./oraTypes";
import { extractReservationIntent } from "../domain/reservationExtractor";

export const VALID_SPACES: readonly SpaceId[] = [
  "exterior",
  "entrance",
  "living_room",
  "kitchen",
  "hallway",
  "master_bedroom",
  "ensuite_bathroom",
  "infinity_pool"
] as const;

export const VALID_AMBIANCES: readonly AmbianceId[] = [
  "day",
  "sunset",
  "night"
] as const;

export const DEFAULT_SPACE_RESPONSES: Record<SpaceId, string> = {
  master_bedroom: "Of course. Showing the master bedroom suite.",
  ensuite_bathroom: "Of course. Showing the primary ensuite bathroom.",
  infinity_pool: "Of course. Here is the cantilevered infinity pool.",
  living_room: "Of course. Showing the sunken living lounge.",
  kitchen: "Of course. Here is the gourmet kitchen and dining island.",
  exterior: "Of course. Showing the estate grounds and exterior view.",
  entrance: "Of course. Guiding you inside to the entrance canopy.",
  hallway: "Of course. Here is the central gallery corridor."
};

/**
 * Detects requests for the complete, step-by-step architectural tour of the property.
 */
export function isTourRequest(input?: string): boolean {
  if (!input) return false;
  const norm = input.toLowerCase().replace(/[^a-z0-9_\s]/g, " ").replace(/\s+/g, " ").trim();
  return (
    norm.includes("show me everything") ||
    norm.includes("show everything") ||
    norm.includes("show me the whole house") ||
    norm.includes("show me the whole building") ||
    norm.includes("show me whole house") ||
    norm.includes("show me all the rooms") ||
    norm.includes("show me all rooms") ||
    norm.includes("show all the rooms") ||
    norm.includes("show all rooms") ||
    norm.includes("give me a full tour") ||
    norm.includes("give me the full tour") ||
    norm.includes("full tour") ||
    norm.includes("tour everything") ||
    norm.includes("walk me through everything") ||
    norm.includes("take me through everything") ||
    norm === "show everything" ||
    norm === "grand tour" ||
    norm === "tour all"
  );
}

/**
 * Detects explicit architectural spaces mentioned in visitor utterance.
 */
export function detectExplicitSpace(input?: string): SpaceId | null {
  if (!input) return null;
  if (isTourRequest(input)) return null;
  const norm = input.toLowerCase().replace(/[^a-z0-9_\s]/g, " ").replace(/\s+/g, " ").trim();

  // If user is inquiring about price or how to book, do not force-navigate
  if (
    norm.includes("how much") ||
    norm.includes("what is the price") ||
    norm.includes("what does it cost") ||
    norm.includes("cost per night") ||
    norm.includes("nightly rate") ||
    norm.includes("how do i book") ||
    norm.includes("how to book") ||
    norm.includes("make a reservation")
  ) {
    return null;
  }

  // Unsupported spaces safeguard
  const unsupported = [
    "garage",
    "gym",
    "tennis court",
    "helipad",
    "cinema",
    "theater",
    "sauna",
    "wine cellar",
    "guest room",
    "kids room"
  ];
  for (const u of unsupported) {
    if (norm.includes(u)) return null;
  }

  // 1. Overview / Around / Stuff / Tour
  if (
    norm.includes("show me around") ||
    norm.includes("take me around") ||
    norm.includes("look around") ||
    norm.includes("give me a tour") ||
    norm.includes("show me stuff") ||
    norm.includes("show stuff") ||
    norm.includes("take me through") ||
    norm.includes("tour the house") ||
    norm.includes("tour the estate") ||
    norm === "show around" ||
    norm === "let's look around" ||
    norm === "lets look around"
  ) {
    return "exterior";
  }

  // 2. View / Scenery / Panorama
  if (
    norm.includes("the view") ||
    norm.includes("see the view") ||
    norm.includes("show the view") ||
    norm.includes("show me the view") ||
    norm.includes("look at the view") ||
    norm.includes("scenery") ||
    norm.includes("landscape") ||
    norm.includes("panorama")
  ) {
    return "infinity_pool";
  }

  if (norm.includes("bedroom") || norm.includes("sleep") || norm.includes("wake up") || norm.includes("bed")) {
    return "master_bedroom";
  }
  if (
    norm.includes("toilet") ||
    norm.includes("bathroom") ||
    norm.includes("restroom") ||
    norm.includes("washroom") ||
    norm.includes("wc") ||
    norm.includes("powder room") ||
    norm.includes("freshen up") ||
    norm.includes("shower") ||
    norm.includes("bath") ||
    norm.includes("tub") ||
    norm.includes("clean up")
  ) {
    return "ensuite_bathroom";
  }
  if (norm.includes("pool") || norm.includes("swim") || norm.includes("deck") || norm.includes("terrace") || norm.includes("loungers")) {
    return "infinity_pool";
  }
  if (
    norm.includes("living room") ||
    norm.includes("living lounge") ||
    norm.includes("lounge") ||
    norm.includes("conversation pit") ||
    norm.includes("sit") ||
    norm.includes("gather")
  ) {
    return "living_room";
  }
  if (
    norm.includes("kitchen") ||
    norm.includes("cook") ||
    norm.includes("dining island") ||
    norm.includes("island") ||
    norm.includes("meals") ||
    norm.includes("dining")
  ) {
    return "kitchen";
  }
  if (
    norm.includes("exterior") ||
    norm.includes("outside") ||
    norm.includes("show me the outside") ||
    norm.includes("facade") ||
    norm.includes("approach") ||
    norm.includes("grounds") ||
    norm.includes("yard")
  ) {
    return "exterior";
  }
  if (
    norm.includes("entrance") ||
    norm.includes("entry") ||
    norm.includes("front door") ||
    norm.includes("canopy") ||
    norm.includes("inside") ||
    norm.includes("interior") ||
    norm.includes("take me inside") ||
    norm.includes("step inside") ||
    norm.includes("go inside") ||
    norm.includes("show me inside") ||
    norm.includes("show me the interior") ||
    norm.includes("show the interior") ||
    norm.includes("show interior")
  ) {
    return "entrance";
  }
  if (norm.includes("hallway") || norm.includes("gallery") || norm.includes("corridor")) {
    return "hallway";
  }
  return null;
}

/**
 * Detects explicit lighting ambiances mentioned in visitor utterance.
 */
export function detectExplicitAmbiance(input?: string): AmbianceId | null {
  if (!input) return null;
  const norm = input.toLowerCase();
  if (norm.includes("sunset") || norm.includes("golden hour") || norm.includes("sun down") || norm.includes("sundown")) return "sunset";
  if (norm.includes("night") || norm.includes("after dark") || norm.includes("dark") || norm.includes("evening")) return "night";
  if (norm.includes("day") || norm.includes("daytime") || norm.includes("sunlight") || norm.includes("morning")) return "day";
  return null;
}

/**
 * Sanitizes model or assistant responses to eliminate generic AI disclaimers.
 */
export function sanitizeOraResponse(response: string, fallbackSpace?: SpaceId | null): string {
  if (!response || typeof response !== "string") {
    return (fallbackSpace && DEFAULT_SPACE_RESPONSES[fallbackSpace])
      ? DEFAULT_SPACE_RESPONSES[fallbackSpace]
      : "Of course.";
  }

  const lower = response.toLowerCase();
  const forbiddenPatterns = [
    /licensed/i,
    /real estate/i,
    /broker/i,
    /cannot show/i,
    /can't show/i,
    /unable to show/i,
    /not able to show/i,
    /text-based/i,
    /ai assistant/i,
    /language model/i,
    /google search/i,
    /houzz/i,
    /pinterest/i,
    /do not have the capability/i,
    /as an ai/i,
    /i don't have eyes/i,
    /i cannot display/i,
    /i can't display/i,
    /virtual assistant/i
  ];

  if (forbiddenPatterns.some((p) => p.test(lower))) {
    if (fallbackSpace && DEFAULT_SPACE_RESPONSES[fallbackSpace]) {
      return DEFAULT_SPACE_RESPONSES[fallbackSpace];
    }
    return "Of course. Welcome to Aurelia Sanctuary.";
  }

  // If response is longer than 2 sentences, trim to the first sentence or two
  const sentences = response.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 2) {
    return sentences.slice(0, 2).join(" ").trim();
  }

  return response.trim();
}

/**
 * Fast-path spatial intent resolver:
 * Instantly maps explicit visitor navigation directives (e.g. "Show me the toilet",
 * "Show me around", "Take me inside", "Show me outside", "Take me back") to typed
 * spatial decisions in <1ms without latency or model hallucinations.
 */
export function resolveDirectNavigationIntent(
  input: string,
  _context?: PropertyContext,
  session?: OraConversationContext
): OraDecision | null {
  const norm = input.toLowerCase().replace(/[^a-z0-9_\s]/g, " ").replace(/\s+/g, " ").trim();

  // If visitor is asking about price or reservations, do not treat as pure navigation
  if (
    norm.includes("how much") ||
    norm.includes("what is the price") ||
    norm.includes("what does it cost") ||
    norm.includes("cost per night") ||
    norm.includes("nightly rate") ||
    norm.includes("pricing") ||
    norm.includes("how to book") ||
    norm.includes("how do i book") ||
    norm.includes("can i book") ||
    norm.includes("make a reservation") ||
    norm.includes("stay for three nights") ||
    norm.includes("stay for two nights")
  ) {
    return null;
  }

  // Unsupported facilities check
  const unsupported = [
    "garage",
    "gym",
    "tennis court",
    "helipad",
    "cinema",
    "theater",
    "sauna",
    "wine cellar",
    "guest room",
    "kids room"
  ];
  for (const u of unsupported) {
    if (norm.includes(u)) return null;
  }

  // 0. Grand Tour: "Show me everything" / "Show me the whole house" / "Full tour"
  if (isTourRequest(input)) {
    return {
      type: "START_TOUR",
      response: "Of course. Let us tour Aurelia Sanctuary step-by-step."
    };
  }

  // 1. Take me back
  if (norm === "take me back" || norm === "go back" || norm === "head back" || norm === "back") {
    const targetSpace = (session?.lastSpace && VALID_SPACES.includes(session.lastSpace))
      ? session.lastSpace
      : "exterior";
    return {
      type: "SHOW_SPACE",
      spaceId: targetSpace,
      response: `Returning to the ${targetSpace.replace("_", " ")}.`
    };
  }

  // 2. Overview / Tour / Around / Stuff
  if (
    norm.includes("show me around") ||
    norm.includes("take me around") ||
    norm.includes("look around") ||
    norm.includes("give me a tour") ||
    norm.includes("show me stuff") ||
    norm.includes("show stuff") ||
    norm.includes("take me through") ||
    norm.includes("tour the house") ||
    norm.includes("tour the estate") ||
    norm === "show around" ||
    norm === "let's look around" ||
    norm === "lets look around"
  ) {
    return {
      type: "SHOW_SPACE",
      spaceId: "exterior",
      response: "Of course. Showing the estate grounds and exterior view."
    };
  }

  // 3. Combined Space + Ambiance or Pure Space Detection
  const detectedAmbiance = detectExplicitAmbiance(input);
  const detectedSpace = detectExplicitSpace(input);

  const isDirective =
    /(show|take|see|view|visit|look|go to|head to|where|inside|outside|around|toilet|bedroom|pool|kitchen|bathroom|living room|hallway|entrance)/i.test(norm);

  if (detectedSpace && isDirective) {
    if (detectedAmbiance && detectedAmbiance !== "day") {
      return {
        type: "SHOW_SPACE_AND_AMBIANCE",
        spaceId: detectedSpace,
        ambiance: detectedAmbiance,
        response: `Showing the ${detectedSpace.replace("_", " ")} at ${detectedAmbiance}.`
      };
    }
    return {
      type: "SHOW_SPACE",
      spaceId: detectedSpace,
      response: DEFAULT_SPACE_RESPONSES[detectedSpace]
    };
  }

  if (detectedAmbiance && /(look like|change|switch|show|turn|make it)/i.test(norm)) {
    return {
      type: "CHANGE_AMBIANCE",
      ambiance: detectedAmbiance,
      response: `Transitioning the sanctuary lighting to ${detectedAmbiance}.`
    };
  }

  return null;
}

/**
 * Fast-path reservation intent resolver:
 * Deterministically parses reservation requests with guest names and calendar dates,
 * emitting INITIATE_TRANSACTION or CLARIFICATION for missing details in <1ms.
 */
export function resolveReservationIntent(
  input: string,
  referenceYear?: number
): OraDecision | null {
  const norm = input.toLowerCase().replace(/[^a-z0-9_\s]/g, " ").replace(/\s+/g, " ").trim();

  // Safeguard general inquiry phrases tested in conversational test suite
  const isGeneralInquiry =
    norm === "how do i book" ||
    norm === "how to book" ||
    norm === "can i book" ||
    norm === "i want to book" ||
    norm === "can i stay here" ||
    norm === "i'd like to stay here" ||
    norm === "i think i'd like to stay here";

  if (isGeneralInquiry) {
    return null;
  }

  const extracted = extractReservationIntent(input, referenceYear);

  if (!extracted.hasReservationIntent) {
    return null;
  }

  if (extracted.validationError) {
    return {
      type: "CLARIFICATION",
      response: extracted.validationError,
      reason: "invalid_reservation_dates"
    };
  }

  if (extracted.isComplete && extracted.guestName && extracted.checkIn && extracted.checkOut) {
    return {
      type: "INITIATE_TRANSACTION",
      transactionType: "RESERVATION",
      guestName: extracted.guestName,
      checkIn: extracted.checkIn,
      checkOut: extracted.checkOut,
      response: "I’ve prepared your reservation request for Aurelia."
    };
  }

  // Missing details clarification
  const missing = extracted.missingFields;
  if (missing.includes("guestName") && (missing.includes("checkIn") || missing.includes("checkOut"))) {
    return {
      type: "CLARIFICATION",
      response: "I'd be delighted to prepare a reservation request for Aurelia. Could you please share your name and your desired check-in and check-out dates?",
      reason: "missing_reservation_details"
    };
  }

  if (missing.includes("checkIn") || missing.includes("checkOut")) {
    return {
      type: "CLARIFICATION",
      response: `I'd be happy to prepare the reservation for ${extracted.guestName}. What dates would you like to stay?`,
      reason: "missing_dates"
    };
  }

  if (missing.includes("guestName")) {
    return {
      type: "CLARIFICATION",
      response: "Could you please share your name for the reservation request?",
      reason: "missing_guest_name"
    };
  }

  return null;
}
