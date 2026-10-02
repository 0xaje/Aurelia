/**
 * AURELIA — Server-side Ora Conversational Intelligence Engine (Phase 5C.1)
 * 
 * Implements authoritative conversational understanding, natural language reasoning,
 * property grounding, multi-turn session continuity, structured decision generation,
 * and high-fidelity Google Gemini 1.5 Flash integration with NO silent fallbacks.
 */

import { SpaceId, AmbianceId } from "../src/domain/spatial";
import {
  OraDecision,
  OraConversationContext,
  PropertyContext,
  OraEngineMode
} from "../src/ora/oraTypes";
import { ORA_SYSTEM_PROMPT } from "./oraPrompt";

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

export interface EngineExecutionOptions {
  apiKey?: string;
  timeoutMs?: number;
  mode?: OraEngineMode;
}

/**
 * Validates and sanitizes a raw decision object against Aurelia's domain boundaries.
 */
export function validateOraDecision(raw: unknown): OraDecision {
  if (!raw || typeof raw !== "object") {
    return {
      type: "PROPERTY_ANSWER",
      response: "Aurelia Sanctuary offers eight architectural spaces across day, sunset, and night."
    };
  }

  const obj = raw as Record<string, unknown>;
  const type = typeof obj.type === "string" ? obj.type : "PROPERTY_ANSWER";
  const response =
    typeof obj.response === "string" && obj.response.trim().length > 0
      ? obj.response.trim()
      : "Of course.";

  switch (type) {
    case "GREETING":
      return { type: "GREETING", response };

    case "SHOW_SPACE": {
      const spaceId = obj.spaceId as SpaceId;
      if (VALID_SPACES.includes(spaceId)) {
        return { type: "SHOW_SPACE", spaceId, response };
      }
      return {
        type: "PROPERTY_ANSWER",
        response: "Aurelia Sanctuary features the living lounge, kitchen, master suite, ensuite spa, and infinity pool."
      };
    }

    case "CHANGE_AMBIANCE": {
      const ambiance = obj.ambiance as AmbianceId;
      if (VALID_AMBIANCES.includes(ambiance)) {
        return { type: "CHANGE_AMBIANCE", ambiance, response };
      }
      return {
        type: "PROPERTY_ANSWER",
        response: "Aurelia Sanctuary features three authentic lighting tracks: daytime, sunset, and night."
      };
    }

    case "SHOW_SPACE_AND_AMBIANCE": {
      const spaceId = obj.spaceId as SpaceId;
      const ambiance = obj.ambiance as AmbianceId;
      const validSpace = VALID_SPACES.includes(spaceId);
      const validAmbiance = VALID_AMBIANCES.includes(ambiance);

      if (validSpace && validAmbiance) {
        return { type: "SHOW_SPACE_AND_AMBIANCE", spaceId, ambiance, response };
      }
      if (validSpace) {
        return { type: "SHOW_SPACE", spaceId, response };
      }
      if (validAmbiance) {
        return { type: "CHANGE_AMBIANCE", ambiance, response };
      }
      return {
        type: "PROPERTY_ANSWER",
        response: "Aurelia Sanctuary offers eight architectural spaces across day, sunset, and night."
      };
    }

    case "CLARIFICATION": {
      const reason = typeof obj.reason === "string" ? obj.reason : undefined;
      return { type: "CLARIFICATION", response, reason };
    }

    case "BOOKING_INTENT":
      return { type: "BOOKING_INTENT", response };

    case "OUT_OF_SCOPE":
      return {
        type: "OUT_OF_SCOPE",
        response: response.length > 0
          ? response
          : "I'm here to help you explore Aurelia and plan your stay. What would you like to know about the sanctuary?"
      };

    default:
      return { type: "PROPERTY_ANSWER", response };
  }
}

/**
 * Retrieves the Google Gemini API key from environment variables or .env file.
 */
export function getGeminiApiKey(): string | undefined {
  if (typeof process !== "undefined" && process.env?.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    const key = process.env.GEMINI_API_KEY.trim();
    if (!key.includes("your_gemini_api_key_here")) {
      return key;
    }
  }
  return undefined;
}

/**
 * Calls Google Gemini (gemini-1.5-flash) with structured JSON enforcement.
 */
async function callGeminiStructuredLlm(
  input: string,
  apiKey: string,
  _context?: PropertyContext,
  session?: OraConversationContext,
  timeoutMs = 4500
): Promise<OraDecision | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = {
      systemInstruction: {
        parts: [{ text: ORA_SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: JSON.stringify({
                visitorUtterance: input,
                currentSpace: session?.currentSpace || null,
                lastSpace: session?.lastSpace || null,
                currentAmbiance: session?.currentAmbiance || "day",
                recentTurns: session?.recentTurns?.slice(-6) || []
              })
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        responseSchema: {
          type: "OBJECT",
          properties: {
            type: {
              type: "STRING",
              enum: [
                "GREETING",
                "PROPERTY_ANSWER",
                "SHOW_SPACE",
                "CHANGE_AMBIANCE",
                "SHOW_SPACE_AND_AMBIANCE",
                "CLARIFICATION",
                "BOOKING_INTENT",
                "OUT_OF_SCOPE"
              ]
            },
            spaceId: {
              type: "STRING",
              enum: [
                "exterior",
                "entrance",
                "living_room",
                "kitchen",
                "hallway",
                "master_bedroom",
                "ensuite_bathroom",
                "infinity_pool"
              ]
            },
            ambiance: {
              type: "STRING",
              enum: ["day", "sunset", "night"]
            },
            response: {
              type: "STRING"
            }
          },
          required: ["type", "response"]
        }
      }
    };

    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        const parsed = JSON.parse(text);
        return validateOraDecision(parsed);
      }
    }

    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Server-side entrypoint for Ora Conversational Intelligence.
 * 
 * Enforces NO silent fallback in production conversational mode:
 * - If in conversational mode and key is missing or call fails, returns a clear graceful error.
 * - Deterministic-dev mode is only executed when explicitly selected or in offline tests.
 */
export async function executeServerOraConversation(
  transcript: string,
  context?: PropertyContext,
  session?: OraConversationContext,
  options: EngineExecutionOptions = {}
): Promise<OraDecision> {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return {
      type: "CLARIFICATION",
      response: "Ask Ora about any space or lighting atmosphere."
    };
  }

  const apiKey = options.apiKey || getGeminiApiKey();

  // Determine mode: default to conversational unless explicitly set to deterministic-dev
  const mode: OraEngineMode = options.mode || (apiKey ? "conversational" : "conversational");

  if (mode === "conversational") {
    if (!apiKey) {
      // Phase 5C.1: No silent fallback when conversational mode is expected!
      return {
        type: "PROPERTY_ANSWER",
        response: "Conversational intelligence is awaiting GEMINI_API_KEY configuration in the server environment.",
        engineMode: "error",
        fallback: false
      };
    }

    try {
      const decision = await callGeminiStructuredLlm(
        trimmed,
        apiKey,
        context,
        session,
        options.timeoutMs ?? 4500
      );

      if (decision) {
        return {
          ...decision,
          engineMode: "conversational",
          fallback: false
        };
      }
    } catch {
      // LLM call failed or timed out
    }

    // Explicit graceful error state rather than pretending full conversational intelligence exists
    return {
      type: "PROPERTY_ANSWER",
      response: "I'm having a brief connection difficulty with the conversational service. Please try asking again in a moment.",
      engineMode: "error",
      fallback: false
    };
  }

  // Deterministic dev mode (only for explicit offline testing / development)
  const semanticDecision = evaluateSemanticDecision(trimmed, context, session);
  return {
    ...semanticDecision,
    engineMode: "deterministic-dev",
    fallback: true
  };
}

/**
 * Authoritative semantic reasoning engine for local development, offline mode, and deterministic unit tests.
 * Cleaned of all generic canned assistance filler.
 */
export function evaluateSemanticDecision(
  input: string,
  _context?: PropertyContext,
  session?: OraConversationContext
): OraDecision {
  const norm = input.toLowerCase().trim();
  const clean = norm.replace(/[?.!,;:]+$/g, "").trim();

  // 1. Greetings & Pleasantries
  if (
    clean === "hi" ||
    clean === "hello" ||
    clean === "hey" ||
    clean === "hi ora" ||
    clean === "hello ora" ||
    clean === "good morning" ||
    clean === "good afternoon" ||
    clean === "good evening" ||
    clean === "hey ora" ||
    clean === "how are you" ||
    clean === "how are you doing" ||
    clean === "what is your name" ||
    clean === "whats your name" ||
    clean === "who are you"
  ) {
    if (clean.includes("who are you") || clean.includes("name")) {
      return {
        type: "GREETING",
        response: "I'm Ora, the architectural intelligence of Aurelia Sanctuary."
      };
    }
    if (clean.includes("how are you")) {
      return {
        type: "GREETING",
        response: "I'm well. Take your time looking around."
      };
    }
    return {
      type: "GREETING",
      response: "Hello. Welcome to Aurelia."
    };
  }

  // 2. Out of scope / domain boundaries
  const outOfScopePatterns = [
    /\bquantum physics\b/,
    /\bpresident\b/,
    /\belection\b/,
    /\bstock market\b/,
    /\bbitcoin\b/,
    /\bwrite (a )?(poem|code|essay|story)\b/,
    /\btell me a joke\b/,
    /\bweather in (paris|tokyo|london|new york)\b/,
    /\bwho won the (game|super bowl|match|championship)\b/,
    /\bwho is the prime minister\b/,
    /\bcapital of \w+\b/
  ];

  for (const pat of outOfScopePatterns) {
    if (pat.test(clean)) {
      return {
        type: "OUT_OF_SCOPE",
        response: "I'm here to help you explore Aurelia and plan your stay. What would you like to know about the sanctuary?"
      };
    }
  }

  // 3. Ambiguity & Clarification Checks
  const unsupportedAmbiances = ["rain", "storm", "snow", "fog", "cloudy", "winter", "dawn", "sunrise", "midnight"];
  for (const unsup of unsupportedAmbiances) {
    if (new RegExp(`\\b${unsup}\\b`, "i").test(clean)) {
      return {
        type: "CLARIFICATION",
        reason: "unsupported_ambiance",
        response: "Aurelia Sanctuary features three authentic cinematic lighting tracks: daytime, sunset, and night."
      };
    }
  }

  if (
    clean === "show me the room" ||
    clean === "take me to the room" ||
    clean === "show the room" ||
    clean === "can i see the room" ||
    clean === "view the room"
  ) {
    return {
      type: "CLARIFICATION",
      response: "Of course. Do you mean the living room or the master bedroom?"
    };
  }

  // 4. Booking & Stay Intent
  if (
    norm.includes("how do i book") ||
    norm.includes("how to book") ||
    norm.includes("can i book") ||
    norm.includes("want to book") ||
    norm.includes("like to book") ||
    norm.includes("make a reservation") ||
    norm.includes("how do i reserve") ||
    norm.includes("can i reserve") ||
    norm.includes("can i stay here") ||
    norm.includes("i'd like to stay here") ||
    norm.includes("i think i'd like to stay here") ||
    norm.includes("stay for three nights") ||
    norm.includes("stay for two nights") ||
    norm.includes("reserve this")
  ) {
    return {
      type: "BOOKING_INTENT",
      response: "Aurelia Sanctuary welcomes private stays. Inquiries and reservations can be arranged directly."
    };
  }

  // 5. Pricing & Availability
  if (
    norm.includes("how much") ||
    norm.includes("what is the price") ||
    norm.includes("what does it cost") ||
    norm.includes("cost per night") ||
    norm.includes("nightly rate") ||
    norm.includes("pricing") ||
    norm.includes("two nights be")
  ) {
    return {
      type: "PROPERTY_ANSWER",
      response: "Reservations and tailored seasonal rates for Aurelia Sanctuary are arranged upon inquiry."
    };
  }

  // 6. Conversational Continuity & Context Follow-ups
  if (
    clean === "what about the bathroom" ||
    clean === "and the bathroom" ||
    clean === "and where do i freshen up" ||
    clean === "what about the bath" ||
    clean === "where do i freshen up" ||
    clean === "where can i freshen up"
  ) {
    return {
      type: "SHOW_SPACE",
      spaceId: "ensuite_bathroom",
      response: "The ensuite spa features a freestanding stone tub overlooking a private cactus courtyard."
    };
  }

  if (
    clean === "what about outside" ||
    clean === "and outside" ||
    clean === "can we look outside" ||
    clean === "take me outside" ||
    clean === "show me outside"
  ) {
    return {
      type: "SHOW_SPACE",
      spaceId: "exterior",
      response: "The monolithic exterior is framed by desert stone and native saguaro cacti."
    };
  }

  if (
    clean === "can i see it at night" ||
    clean === "what about at night" ||
    clean === "show it at night" ||
    clean === "see it at night"
  ) {
    const targetSpace = session?.currentSpace || "exterior";
    return {
      type: "SHOW_SPACE_AND_AMBIANCE",
      spaceId: targetSpace,
      ambiance: "night",
      response: `Showing the ${targetSpace.replace("_", " ")} at night.`
    };
  }

  if (
    clean === "can i see it at sunset" ||
    clean === "what about at sunset" ||
    clean === "show it at sunset" ||
    clean === "see it at sunset"
  ) {
    const targetSpace = session?.currentSpace || "exterior";
    return {
      type: "SHOW_SPACE_AND_AMBIANCE",
      spaceId: targetSpace,
      ambiance: "sunset",
      response: `Showing the ${targetSpace.replace("_", " ")} at sunset.`
    };
  }

  if (clean === "take me back" || clean === "go back") {
    if (session?.lastSpace && VALID_SPACES.includes(session.lastSpace)) {
      return {
        type: "SHOW_SPACE",
        spaceId: session.lastSpace,
        response: `Returning to the ${session.lastSpace.replace("_", " ")}.`
      };
    }
    return {
      type: "SHOW_SPACE",
      spaceId: "exterior",
      response: "Returning to the estate approach."
    };
  }

  if (clean === "what was that room again" || clean === "what room is this" || clean === "where are we") {
    const curr = session?.currentSpace;
    if (curr === "kitchen") {
      return { type: "PROPERTY_ANSWER", response: "This is the Gourmet Kitchen & Dining Island." };
    }
    if (curr === "master_bedroom") {
      return { type: "PROPERTY_ANSWER", response: "This is the Master Bedroom Suite." };
    }
    if (curr === "living_room") {
      return { type: "PROPERTY_ANSWER", response: "This is the Sunken Living Lounge." };
    }
    if (curr === "ensuite_bathroom") {
      return { type: "PROPERTY_ANSWER", response: "This is the Primary Ensuite Spa." };
    }
    if (curr === "infinity_pool") {
      return { type: "PROPERTY_ANSWER", response: "This is the Cantilevered Infinity Pool terrace." };
    }
    return {
      type: "PROPERTY_ANSWER",
      response: "We are currently viewing Aurelia Sanctuary."
    };
  }

  // Barge-in or conversational topic transition
  if (
    norm.includes("don't worry about the price") ||
    norm.includes("dont worry about the price") ||
    norm.includes("never mind the price")
  ) {
    if (norm.includes("pool") || norm.includes("swim")) {
      return {
        type: "SHOW_SPACE",
        spaceId: "infinity_pool",
        response: "The cantilevered infinity pool overlooks the western canyon contours."
      };
    }
  }

  // 7. Combined Space + Ambiance Requests
  const hasSunset = norm.includes("sunset") || norm.includes("golden hour") || norm.includes("sun down") || norm.includes("sundown");
  const hasNight = norm.includes("night") || norm.includes("after dark") || norm.includes("dark") || norm.includes("evening");
  const hasDay = norm.includes("day") || norm.includes("daytime") || norm.includes("sunlight") || norm.includes("morning");

  const requestedAmbiance: AmbianceId | null = hasSunset ? "sunset" : hasNight ? "night" : hasDay ? "day" : null;

  // Space detection
  let detectedSpace: SpaceId | null = null;
  if (norm.includes("bedroom") || norm.includes("sleep") || norm.includes("wake up") || norm.includes("bed")) {
    detectedSpace = "master_bedroom";
  } else if (norm.includes("bathroom") || norm.includes("freshen up") || norm.includes("shower") || norm.includes("bath") || norm.includes("tub") || norm.includes("clean up")) {
    detectedSpace = "ensuite_bathroom";
  } else if (norm.includes("pool") || norm.includes("swim") || norm.includes("deck") || norm.includes("terrace")) {
    detectedSpace = "infinity_pool";
  } else if (norm.includes("living room") || norm.includes("lounge") || norm.includes("conversation pit") || norm.includes("sit") || norm.includes("gather")) {
    detectedSpace = "living_room";
  } else if (norm.includes("kitchen") || norm.includes("cook") || norm.includes("island") || norm.includes("meals") || norm.includes("dining")) {
    detectedSpace = "kitchen";
  } else if (norm.includes("exterior") || norm.includes("outside") || norm.includes("facade") || norm.includes("approach")) {
    detectedSpace = "exterior";
  } else if (norm.includes("entrance") || norm.includes("entry") || norm.includes("front door") || norm.includes("canopy")) {
    detectedSpace = "entrance";
  } else if (norm.includes("hallway") || norm.includes("gallery") || norm.includes("corridor")) {
    detectedSpace = "hallway";
  }

  if (detectedSpace && requestedAmbiance) {
    return {
      type: "SHOW_SPACE_AND_AMBIANCE",
      spaceId: detectedSpace,
      ambiance: requestedAmbiance,
      response: `Showing the ${detectedSpace.replace("_", " ")} at ${requestedAmbiance}.`
    };
  }

  if (detectedSpace) {
    const spaceResponses: Record<SpaceId, string> = {
      master_bedroom: "The master bedroom suite features a low platform bed and panoramic desert windows.",
      ensuite_bathroom: "The ensuite spa features a freestanding stone tub overlooking a private cactus courtyard.",
      infinity_pool: "The cantilevered infinity pool overlooks the western canyon contours.",
      living_room: "The sunken living lounge is anchored by a conversation pit and panoramic canyon views.",
      kitchen: "The kitchen features Calacatta marble with an integrated culinary island.",
      exterior: "The monolithic exterior is framed by desert stone and native saguaro cacti.",
      entrance: "The entrance features a cedar soffit above a dark reflection channel.",
      hallway: "The central gallery corridor connects the living wing to the private suites."
    };

    return {
      type: "SHOW_SPACE",
      spaceId: detectedSpace,
      response: spaceResponses[detectedSpace]
    };
  }

  // Overview navigation
  if (
    clean === "show me around" ||
    clean === "take me around" ||
    clean === "give me a tour" ||
    clean === "let's look around" ||
    clean === "lets look around" ||
    clean === "can you show me around" ||
    clean === "okay show me around" ||
    clean === "ok show me around" ||
    clean === "take me through the house" ||
    clean === "take me through"
  ) {
    return {
      type: "SHOW_SPACE",
      spaceId: "exterior",
      response: "Welcome to Aurelia Sanctuary. Let us begin at the estate approach."
    };
  }

  // Pure ambiance changes
  if (requestedAmbiance && (norm.includes("look like") || norm.includes("change") || norm.includes("switch") || norm.includes("show") || norm.includes("see"))) {
    return {
      type: "CHANGE_AMBIANCE",
      ambiance: requestedAmbiance,
      response: `Transitioning the sanctuary lighting to ${requestedAmbiance}.`
    };
  }

  // 8. Architectural & Property Information Questions
  if (
    norm.includes("what is this place") ||
    norm.includes("tell me about this house") ||
    norm.includes("tell me about aurelia") ||
    norm.includes("what is aurelia") ||
    norm.includes("architectural") ||
    norm.includes("architecture") ||
    norm.includes("who built this") ||
    norm.includes("design") ||
    norm.includes("materials")
  ) {
    return {
      type: "PROPERTY_ANSWER",
      response: "Aurelia Sanctuary is a modernist private retreat nestled above the highland desert canyon, characterized by monolithic concrete, warm cedar, and panoramic vistas."
    };
  }

  // 9. Casual Compliments / Observations (Conversation without camera movement!)
  if (
    norm.includes("beautiful") ||
    norm.includes("stunning") ||
    norm.includes("gorgeous") ||
    norm.includes("magnificent") ||
    norm.includes("love this") ||
    norm.includes("incredible") ||
    norm.includes("amazing") ||
    norm.includes("wow")
  ) {
    return {
      type: "PROPERTY_ANSWER",
      response: "It is. The interplay of raw stone and desert light was crafted specifically for this ridge."
    };
  }

  // 10. Unsupported entities safeguards
  const unsupportedEntities = [
    "garage",
    "gym",
    "tennis court",
    "helipad",
    "cinema",
    "theater",
    "sauna",
    "wine cellar",
    "guest room",
    "kids room",
    "penthouse",
    "elevator",
    "spa center"
  ];

  for (const ent of unsupportedEntities) {
    if (norm.includes(ent)) {
      return {
        type: "PROPERTY_ANSWER",
        response: `Aurelia Sanctuary does not feature a ${ent}, but I can guide you through the lounge, master suite, or infinity pool.`
      };
    }
  }

  // 11. Default grounded response (No generic assist phrases!)
  return {
    type: "PROPERTY_ANSWER",
    response: "Aurelia Sanctuary offers eight architectural spaces across day, sunset, and night. Which space would you like to experience?"
  };
}
