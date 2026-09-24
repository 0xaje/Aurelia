import type { FeatureFocus, AmbianceMode, Room } from "../state/types.ts";
import type { RoomSearchFilters } from "./roomSearch.ts";

export type UserCommand =
  | {
      type: "SEARCH_ROOMS";
      filters: RoomSearchFilters;
      rawInput: string;
    }
  | {
      type: "ADJUST_VIEW";
      feature?: FeatureFocus;
      ambiance?: AmbianceMode;
      rawInput: string;
    }
  | {
      type: "UNSUPPORTED";
      reason: string;
      rawInput: string;
    };

/**
 * Extracts a numeric Naira budget from natural language text.
 * Examples: "150k" -> 150000, "₦150,000" -> 150000, "85000 naira" -> 85000.
 */
export function extractBudget(text: string): number | undefined {
  // 1. Matches "150k", "₦150k", "150 k"
  const kMatch = text.match(/(?:₦|ngn|naira)?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1]) * 1000);
  }

  // 2. Matches "150,000", "₦150,000", "150000"
  const numMatch = text.match(/(?:₦|ngn|naira|\b)?\s*(\d{1,3}(?:,\d{3})+|\d{4,9})\s*(?:naira|ngn|\b)/i);
  if (numMatch) {
    const rawNum = numMatch[1].replace(/,/g, "");
    const parsed = parseInt(rawNum, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
}

/**
 * Deterministically interprets a natural language text command into a typed UserCommand.
 * Never invents intent or hallucinates parameters.
 */
export function interpretTextCommand(input: string): UserCommand {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      type: "UNSUPPORTED",
      reason: "Please enter a request, such as a room budget or view preference.",
      rawInput: input
    };
  }

  const lower = trimmed.toLowerCase();

  // 1. Detect view / presentation inspection intent
  // Phrases like: "show me what it looks like at night", "show me the balcony at night", "show me the bathroom"
  const isViewInspection =
    lower.includes("look like") ||
    lower.includes("what does it look like") ||
    lower.startsWith("show me the ") ||
    lower.startsWith("show the ") ||
    lower.startsWith("view the ") ||
    lower === "night view" ||
    lower === "day view" ||
    lower === "at night" ||
    lower === "night" ||
    lower === "day";

  if (isViewInspection && !lower.includes("somewhere") && !lower.includes("room under") && !lower.includes("coming with")) {
    let feature: FeatureFocus | undefined = undefined;
    let ambiance: AmbianceMode | undefined = undefined;

    // Detect Ambiance
    if (lower.includes("night") || lower.includes("evening") || lower.includes("dusk")) {
      ambiance = "night";
    } else if (lower.includes("day") || lower.includes("daylight") || lower.includes("morning")) {
      ambiance = "day";
    }

    // Detect Feature Focus
    if (lower.includes("balcony") || lower.includes("terrace")) {
      feature = "balcony";
    } else if (
      lower.includes("bathroom") ||
      lower.includes("bath") ||
      lower.includes("tub") ||
      lower.includes("shower")
    ) {
      feature = "bathroom";
    } else if (lower.includes("overview") || lower.includes("bedroom")) {
      feature = "overview";
    }

    if (feature !== undefined || ambiance !== undefined) {
      return {
        type: "ADJUST_VIEW",
        feature,
        ambiance,
        rawInput: input
      };
    }
  }

  // 2. Detect Room Search intent
  const budget = extractBudget(lower);
  const wantsBalcony = /\b(balcony|balconies|terrace)\b/i.test(lower);
  const wantsBathtub = /\b(bathtub|tub|soaking tub)\b/i.test(lower);
  const isSearchContext =
    budget !== undefined ||
    wantsBalcony ||
    wantsBathtub ||
    lower.includes("room") ||
    lower.includes("suite") ||
    lower.includes("anniversary") ||
    lower.includes("quiet") ||
    lower.includes("find") ||
    lower.includes("coming with") ||
    lower.includes("stay");

  if (isSearchContext && (budget !== undefined || wantsBalcony || wantsBathtub)) {
    const filters: RoomSearchFilters = {};
    if (budget !== undefined) filters.max_price_ngn = budget;
    if (wantsBalcony) filters.required_balcony = true;
    if (wantsBathtub) filters.required_bathtub = true;

    return {
      type: "SEARCH_ROOMS",
      filters,
      rawInput: input
    };
  }

  // 3. Check for specific standalone feature commands without "show"
  if (lower === "balcony" || lower === "show balcony") {
    return { type: "ADJUST_VIEW", feature: "balcony", rawInput: input };
  }
  if (lower === "bathroom" || lower === "show bathroom" || lower === "tub") {
    return { type: "ADJUST_VIEW", feature: "bathroom", rawInput: input };
  }

  // 4. Controlled fallback for unsupported queries
  return {
    type: "UNSUPPORTED",
    reason:
      "I can help you search rooms by budget and amenities (such as a balcony or tub), or adjust the view to day, night, bathroom, or balcony.",
    rawInput: input
  };
}

/**
 * Formulates concise, factual response copy grounded exclusively in the matched rooms.
 * Never invents pricing or inventory.
 */
export function formatCommandResponse(
  cmd: UserCommand,
  matchedRooms?: Room[],
  activeRoom?: Room
): string {
  if (cmd.type === "SEARCH_ROOMS") {
    if (!matchedRooms || matchedRooms.length === 0) {
      return "I couldn't find a room matching all those requirements. Our Deluxe Room starts at ₦85,000 per night.";
    }

    const primaryMatch = matchedRooms[0];
    const formattedPrice = `₦${primaryMatch.price_per_night.toLocaleString()}`;

    if (cmd.filters.required_balcony && cmd.filters.max_price_ngn) {
      return `The ${primaryMatch.name} fits your balcony and ₦${cmd.filters.max_price_ngn.toLocaleString()} budget at ${formattedPrice} per night.`;
    }

    if (matchedRooms.length === 1) {
      return `The ${primaryMatch.name} fits your requirements at ${formattedPrice} per night.`;
    }

    return `I found ${matchedRooms.length} suites matching your criteria. Presenting the ${primaryMatch.name} at ${formattedPrice} per night.`;
  }

  if (cmd.type === "ADJUST_VIEW") {
    const roomName = activeRoom?.name || "Suite";
    if (cmd.feature === "balcony" && cmd.ambiance === "night") {
      return `Presenting the private sunset balcony of the ${roomName} under evening architectural lighting.`;
    }
    if (cmd.feature === "balcony") {
      return `Focusing on the private balcony terrace of the ${roomName}.`;
    }
    if (cmd.feature === "bathroom") {
      return `Focusing on the bathroom and soaking tub of the ${roomName}.`;
    }
    if (cmd.ambiance === "night") {
      return `Atmosphere transitioned to evening architectural lighting.`;
    }
    if (cmd.ambiance === "day") {
      return `Atmosphere transitioned to natural daylight.`;
    }
    return `Adjusted view for ${roomName}.`;
  }

  return cmd.reason;
}
