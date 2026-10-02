import { SpaceId, AmbianceId } from "../domain/spatial";
import {
  PropertyContext,
  OraInterpretation,
  OraSessionContext
} from "./oraTypes";
import {
  KNOWN_AMBIGUOUS_PATTERNS,
  KNOWN_UNSUPPORTED_ENTITIES,
  KNOWN_AMBIANCE_ALIASES,
  UNSUPPORTED_AMBIANCES
} from "./oraPropertyContext";

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const CONCIERGE_RESPONSES: Record<SpaceId, string> = {
  exterior: "Certainly.",
  entrance: "Of course.",
  living_room: "Here it is.",
  kitchen: "Certainly.",
  hallway: "Of course.",
  master_bedroom: "Certainly.",
  ensuite_bathroom: "Here it is.",
  infinity_pool: "Of course."
};

/**
 * Deterministically interprets a natural language utterance in the context of
 * Aurelia Sanctuary and optional session history.
 */
export function interpretOraInput(
  rawInput: string,
  context: PropertyContext,
  session?: OraSessionContext
): OraInterpretation {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return {
      type: "CLARIFICATION_REQUIRED",
      reason: "missing_target",
      spokenResponse: "Ask Ora about any space or lighting atmosphere."
    };
  }

  const lower = trimmed.toLowerCase();

  // 1. Overview or Return to Start intent
  if (
    lower === "overview" ||
    lower === "show overview" ||
    lower === "return to overview" ||
    lower === "start over" ||
    lower === "reset" ||
    lower === "back to start"
  ) {
    return {
      type: "RETURN_OVERVIEW",
      confidence: 1.0,
      action: { type: "RETURN_TO_OVERVIEW" },
      spokenResponse: "Of course."
    };
  }

  // 2. Check for Unsupported Ambiances (e.g. midnight, dawn, rain)
  for (const unsup of UNSUPPORTED_AMBIANCES) {
    const regex = new RegExp(`\\b${escapeRegExp(unsup)}\\b`, "i");
    if (regex.test(lower)) {
      return {
        type: "CLARIFICATION_REQUIRED",
        reason: "unsupported_ambiance",
        spokenResponse: `Aurelia Sanctuary features three authentic cinematic lighting tracks: daytime, sunset, and night.`
      };
    }
  }

  // 3. Check for Ambiguous Directions requiring explicit architectural clarification
  for (const item of KNOWN_AMBIGUOUS_PATTERNS) {
    if (item.pattern.test(lower)) {
      return {
        type: "CLARIFICATION_REQUIRED",
        reason: "ambiguous_space",
        spokenResponse: item.explanation,
        suggestedSpaces: ["living_room", "master_bedroom", "infinity_pool"]
      };
    }
  }

  // 4. Check for Known Unsupported Amenities (e.g. gym, cinema, garage, guest room)
  for (const [entityKey, keywords] of Object.entries(KNOWN_UNSUPPORTED_ENTITIES)) {
    const matchedKeyword = keywords.find((kw) => {
      const regex = new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i");
      return regex.test(lower);
    });

    if (matchedKeyword) {
      const entityLabel = entityKey.replace("_", " ");
      return {
        type: "UNSUPPORTED_SPACE",
        requestedEntity: entityKey,
        spokenResponse: `Aurelia Sanctuary does not feature a ${entityLabel}.`,
        availableSpaces: context.spaces.map((s) => s.id)
      };
    }
  }

  // 5. Detect Ambiance Intent
  let matchedAmbiance: AmbianceId | null = null;
  for (const [ambId, aliases] of Object.entries(KNOWN_AMBIANCE_ALIASES) as [AmbianceId, string[]][]) {
    for (const alias of aliases) {
      const regex = new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i");
      if (regex.test(lower)) {
        matchedAmbiance = ambId;
        break;
      }
    }
    if (matchedAmbiance) break;
  }

  // 6. Match against authoritative property spaces and aliases
  let bestMatch: {
    spaceId: SpaceId;
    alias: string;
    aliasLength: number;
    score: number;
    confidence: number;
  } | null = null;

  for (const space of context.spaces) {
    for (const alias of space.aliases) {
      const cleanAlias = alias.toLowerCase().trim();
      const regex = new RegExp(`\\b${escapeRegExp(cleanAlias)}\\b`, "i");

      if (regex.test(lower)) {
        const isGenericModifier =
          space.id === "exterior" &&
          (cleanAlias === "outside" ||
            cleanAlias === "property" ||
            cleanAlias === "building" ||
            cleanAlias === "estate");
        const priorityBonus = isGenericModifier ? 0 : 20;
        const score = cleanAlias.length + priorityBonus;

        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            spaceId: space.id,
            alias: cleanAlias,
            aliasLength: cleanAlias.length,
            score,
            confidence: 0.95
          };
        }
      }
    }
  }

  const isGenericPropertyReference =
    bestMatch &&
    bestMatch.spaceId === "exterior" &&
    (bestMatch.alias === "property" ||
      bestMatch.alias === "estate" ||
      bestMatch.alias === "building" ||
      bestMatch.alias === "whole property");

  // 7. Case A: Pure Ambiance Command or Ambiance on the overall Property
  // e.g. "show me at sunset", "show me the property during the day", "what does it look like after dark?"
  if (matchedAmbiance && (!bestMatch || isGenericPropertyReference)) {
    return {
      type: "CHANGE_AMBIANCE",
      ambiance: matchedAmbiance,
      confidence: 0.95,
      action: { type: "SHOW_AMBIANCE", ambiance: matchedAmbiance },
      spokenResponse: "Certainly."
    };
  }

  // 8. Case B: Combined Specific Space + Ambiance Command
  // e.g. "show me the living room at sunset", "show me the pool at night"
  if (bestMatch && matchedAmbiance) {
    const spaceId = bestMatch.spaceId;

    return {
      type: "NAVIGATE_SPACE",
      spaceId,
      confidence: 0.98,
      action: { type: "SHOW_SPACE", spaceId },
      ambianceAction: { type: "SHOW_AMBIANCE", ambiance: matchedAmbiance },
      spokenResponse: "Of course.",
      matchedAlias: bestMatch.alias
    };
  }

  // 9. Case C: Pure Space Navigation
  if (bestMatch) {
    const spaceId = bestMatch.spaceId;
    let responseText = CONCIERGE_RESPONSES[spaceId];

    const isFollowUp =
      lower.startsWith("what about") ||
      lower.startsWith("how about") ||
      lower.startsWith("and the") ||
      lower.startsWith("and what about") ||
      lower.startsWith("and ") ||
      lower.startsWith("take me to ");

    // Contextual variation if this was a follow-up inquiry
    if (isFollowUp && session?.lastSpaceId) {
      if (spaceId === "ensuite_bathroom" && session.lastSpaceId === "master_bedroom") {
        responseText = "Of course, adjoining the master bedroom.";
      } else {
        responseText = "Certainly.";
      }
    }

    return {
      type: "NAVIGATE_SPACE",
      spaceId,
      confidence: bestMatch.confidence,
      action: { type: "SHOW_SPACE", spaceId },
      spokenResponse: responseText,
      matchedAlias: bestMatch.alias
    };
  }

  // 10. Graceful Clarification for unrecognized requests
  return {
    type: "CLARIFICATION_REQUIRED",
    reason: "unsupported_destination",
    spokenResponse:
      "I couldn't identify that space. You can ask to view any part of the estate or lighting atmosphere.",
    suggestedSpaces: ["living_room", "master_bedroom", "infinity_pool", "kitchen"]
  };
}
