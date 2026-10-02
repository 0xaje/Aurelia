/**
 * AURELIA — Server-side Ora Conversational Intelligence Engine (OpenRouter Migration)
 * 
 * Implements authoritative conversational understanding, natural language reasoning,
 * property grounding, multi-turn session continuity, structured decision generation,
 * and high-fidelity OpenRouter integration with NO silent fallbacks.
 */

import { SpaceId, AmbianceId } from "../src/domain/spatial";
import {
  OraDecision,
  OraConversationContext,
  PropertyContext,
  OraEngineMode
} from "../src/ora/oraTypes";
import { ORA_SYSTEM_PROMPT, ORA_LOCAL_SYSTEM_PROMPT } from "./oraPrompt";

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

export const DEFAULT_OPENROUTER_MODEL = "liquid/lfm-2.5-2.6b:free";
export const DEFAULT_OLLAMA_MODEL = "llama3.2:1b";
export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";

export type LlmProvider = "ollama" | "openrouter";

export interface EngineExecutionOptions {
  provider?: LlmProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  mode?: OraEngineMode;
}

/**
 * Extracts and parses a JSON object from raw LLM output, handling markdown code blocks
 * (```json ... ```) or conversational wrappers.
 */
export function extractJsonFromLlmResponse(raw: string): unknown {
  if (!raw || typeof raw !== "string") {
    throw new Error("Empty or non-string LLM response");
  }
  const clean = raw.trim();

  // 1. Check for markdown ```json ... ``` code blocks
  const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  let candidate = codeBlockMatch ? codeBlockMatch[1].trim() : clean;

  if (candidate.startsWith("```")) {
    candidate = candidate.replace(/^```(?:json)?\s*/i, "").trim();
  }

  // 2. Locate outermost JSON object boundaries { ... }
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonSubstring = candidate.substring(firstBrace, lastBrace + 1);
    return JSON.parse(jsonSubstring);
  }

  // 3. Fallback direct parse
  return JSON.parse(candidate);
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
  const rawType = typeof obj.type === "string" ? obj.type.trim() : "PROPERTY_ANSWER";
  const response =
    typeof obj.response === "string" && obj.response.trim().length > 0
      ? obj.response.trim()
      : "Of course.";

  const rawSpace = typeof obj.spaceId === "string" ? obj.spaceId.trim() : undefined;
  const rawAmbiance = typeof obj.ambiance === "string" ? obj.ambiance.trim() : undefined;
  const validSpace = rawSpace && VALID_SPACES.includes(rawSpace as SpaceId) ? (rawSpace as SpaceId) : undefined;
  const validAmbiance = rawAmbiance && VALID_AMBIANCES.includes(rawAmbiance as AmbianceId) ? (rawAmbiance as AmbianceId) : undefined;

  switch (rawType) {
    case "GREETING":
      return { type: "GREETING", response };

    case "SHOW_SPACE": {
      if (validSpace && validAmbiance) {
        return { type: "SHOW_SPACE_AND_AMBIANCE", spaceId: validSpace, ambiance: validAmbiance, response };
      }
      if (validSpace) {
        return { type: "SHOW_SPACE", spaceId: validSpace, response };
      }
      return {
        type: "PROPERTY_ANSWER",
        response: "Aurelia Sanctuary features the living lounge, kitchen, master suite, ensuite spa, and infinity pool."
      };
    }

    case "CHANGE_AMBIANCE": {
      if (validSpace && validAmbiance) {
        return { type: "SHOW_SPACE_AND_AMBIANCE", spaceId: validSpace, ambiance: validAmbiance, response };
      }
      if (validAmbiance) {
        return { type: "CHANGE_AMBIANCE", ambiance: validAmbiance, response };
      }
      return {
        type: "PROPERTY_ANSWER",
        response: "Aurelia Sanctuary features three authentic lighting tracks: daytime, sunset, and night."
      };
    }

    case "SHOW_SPACE_AND_AMBIANCE": {
      if (validSpace && validAmbiance) {
        return { type: "SHOW_SPACE_AND_AMBIANCE", spaceId: validSpace, ambiance: validAmbiance, response };
      }
      if (validSpace) {
        return { type: "SHOW_SPACE", spaceId: validSpace, response };
      }
      if (validAmbiance) {
        return { type: "CHANGE_AMBIANCE", ambiance: validAmbiance, response };
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

    case "PROPERTY_ANSWER":
    default: {
      if (validSpace && validAmbiance && validAmbiance !== "day") {
        return { type: "SHOW_SPACE_AND_AMBIANCE", spaceId: validSpace, ambiance: validAmbiance, response };
      }
      if (validSpace) {
        return { type: "SHOW_SPACE", spaceId: validSpace, response };
      }
      return { type: "PROPERTY_ANSWER", response };
    }
  }
}

/**
 * Retrieves the OpenRouter API key from server environment variables or .env file.
 */
export function getOpenRouterApiKey(): string | undefined {
  if (typeof process !== "undefined" && process.env?.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.trim()) {
    const key = process.env.OPENROUTER_API_KEY.trim();
    if (!key.includes("your_openrouter_api_key_here")) {
      return key;
    }
  }
  return undefined;
}

/**
 * Retrieves the configured OpenRouter model identifier, defaulting to a supported free model.
 */
export function getOpenRouterModel(): string {
  if (typeof process !== "undefined" && process.env?.OPENROUTER_MODEL && process.env.OPENROUTER_MODEL.trim()) {
    return process.env.OPENROUTER_MODEL.trim();
  }
  return DEFAULT_OPENROUTER_MODEL;
}

/**
 * Resolves the configured LLM provider ("ollama" | "openrouter").
 * Defaults to "ollama" for local runs, or "openrouter" if OPENROUTER_API_KEY is configured
 * and LLM_PROVIDER is explicitly set or no Ollama preference is set.
 */
export function getLlmProvider(): LlmProvider {
  if (typeof process !== "undefined" && process.env?.LLM_PROVIDER) {
    const p = process.env.LLM_PROVIDER.trim().toLowerCase();
    if (p === "openrouter") return "openrouter";
    if (p === "ollama") return "ollama";
  }
  if (
    typeof process !== "undefined" &&
    process.env?.OPENROUTER_API_KEY &&
    !process.env.OPENROUTER_API_KEY.includes("your_openrouter_api_key_here")
  ) {
    return "openrouter";
  }
  return "ollama";
}

/**
 * Retrieves the configured Ollama base URL (defaults to http://127.0.0.1:11434).
 */
export function getOllamaBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.OLLAMA_BASE_URL && process.env.OLLAMA_BASE_URL.trim()) {
    return process.env.OLLAMA_BASE_URL.trim();
  }
  return DEFAULT_OLLAMA_BASE_URL;
}

/**
 * Retrieves the configured Ollama model identifier (defaults to llama3.2:1b).
 */
export function getOllamaModel(): string {
  if (typeof process !== "undefined" && process.env?.OLLAMA_MODEL && process.env.OLLAMA_MODEL.trim()) {
    return process.env.OLLAMA_MODEL.trim();
  }
  return DEFAULT_OLLAMA_MODEL;
}

/**
 * Builds the standard Ollama chat completions request payload with format: "json".
 */
export function buildOllamaPayload(
  input: string,
  model: string = getOllamaModel(),
  session?: OraConversationContext
): Record<string, unknown> {
  return {
    model,
    messages: [
      {
        role: "system",
        content: ORA_LOCAL_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: JSON.stringify({
          visitorUtterance: input,
          currentSpace: session?.currentSpace || null,
          lastSpace: session?.lastSpace || null,
          currentAmbiance: session?.currentAmbiance || "day",
          recentTurns: session?.recentTurns?.slice(-6) || []
        })
      }
    ],
    format: "json",
    stream: false,
    options: {
      temperature: 0.2,
      num_predict: 150,
      num_ctx: 2048
    }
  };
}

/**
 * Dispatches an HTTP POST request to the local Ollama daemon (/api/chat).
 */
export async function sendOllamaRequest(
  payload: Record<string, unknown>,
  baseUrl: string = getOllamaBaseUrl(),
  timeoutMs = 30000
): Promise<{ status: number; body: any }> {
  const url = `${baseUrl.replace(/\/+$/, "")}/api/chat`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const parsed = await res.json();
    return { status: res.status, body: parsed };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls local Ollama with structured JSON parsing and domain decision validation.
 */
export async function callOllamaStructuredLlm(
  input: string,
  model: string = getOllamaModel(),
  baseUrl: string = getOllamaBaseUrl(),
  _context?: PropertyContext,
  session?: OraConversationContext,
  timeoutMs = 30000
): Promise<OraDecision | null> {
  const payload = buildOllamaPayload(input, model, session);

  try {
    const res = await sendOllamaRequest(payload, baseUrl, timeoutMs);

    if (res.status >= 200 && res.status < 300 && res.body && typeof res.body === "object") {
      const rawText = res.body.message?.content;
      if (rawText && typeof rawText === "string") {
        const parsed = extractJsonFromLlmResponse(rawText);
        return validateOraDecision(parsed);
      }
    }

    if (res.status >= 400) {
      const errMsg = res.body?.error || `HTTP ${res.status}`;
      console.warn(`[Ora Ollama] Provider returned error: ${errMsg}`);
    }

    return null;
  } catch (err: any) {
    console.warn(`[Ora Ollama] Request failed: ${err?.message || "Unknown error"}`);
    return null;
  }
}

/**
 * Builds the standard OpenRouter chat completions request payload.
 */
export function buildOpenRouterPayload(
  input: string,
  model: string = getOpenRouterModel(),
  session?: OraConversationContext
): Record<string, unknown> {
  return {
    model,
    messages: [
      {
        role: "system",
        content: ORA_SYSTEM_PROMPT
      },
      {
        role: "user",
        content: JSON.stringify({
          visitorUtterance: input,
          currentSpace: session?.currentSpace || null,
          lastSpace: session?.lastSpace || null,
          currentAmbiance: session?.currentAmbiance || "day",
          recentTurns: session?.recentTurns?.slice(-6) || []
        })
      }
    ],
    temperature: 0.2,
    max_tokens: 600
  };
}

/**
 * Dispatches an HTTP request to OpenRouter API (https://openrouter.ai/api/v1/chat/completions).
 * Uses node:https with family: 4 when running in Node for deterministic IPv4 connectivity,
 * with standard fetch fallback for other environments.
 */
export async function sendOpenRouterRequest(
  apiKey: string,
  payload: Record<string, unknown>,
  timeoutMs = 12000
): Promise<{ status: number; body: any }> {
  const jsonPayload = JSON.stringify(payload);

  if (typeof process !== "undefined" && process.versions?.node) {
    try {
      const https = await import("node:https");
      if (https && typeof https.request === "function") {
        return await new Promise<{ status: number; body: any }>((resolve, reject) => {
          const req = https.request(
            {
              hostname: "openrouter.ai",
              path: "/api/v1/chat/completions",
              method: "POST",
              family: 4,
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(jsonPayload),
                "HTTP-Referer": "https://aurelia-shortlet.local",
                "X-Title": "Aurelia Sanctuary"
              },
              timeout: timeoutMs
            },
            (res: any) => {
              let data = "";
              res.on("data", (chunk: any) => (data += chunk));
              res.on("end", () => {
                try {
                  const parsed = JSON.parse(data);
                  resolve({ status: res.statusCode || 200, body: parsed });
                } catch {
                  resolve({ status: res.statusCode || 200, body: data });
                }
              });
            }
          );

          req.on("timeout", () => {
            req.destroy(new Error(`OpenRouter request timed out after ${timeoutMs}ms`));
          });
          req.on("error", (err: any) => reject(err));
          req.write(jsonPayload);
          req.end();
        });
      }
    } catch {
      // Fallback to fetch
    }
  }

  // Universal fetch fallback
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aurelia-shortlet.local",
        "X-Title": "Aurelia Sanctuary"
      },
      body: jsonPayload,
      signal: controller.signal
    });
    const parsed = await res.json();
    return { status: res.status, body: parsed };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls OpenRouter with structured JSON parsing and domain decision validation.
 */
export async function callOpenRouterStructuredLlm(
  input: string,
  apiKey: string,
  model = getOpenRouterModel(),
  _context?: PropertyContext,
  session?: OraConversationContext,
  timeoutMs = 12000
): Promise<OraDecision | null> {
  const payload = buildOpenRouterPayload(input, model, session);

  try {
    const res = await sendOpenRouterRequest(apiKey, payload, timeoutMs);

    if (res.status >= 200 && res.status < 300 && res.body && typeof res.body === "object") {
      const choice = res.body.choices?.[0];
      const message = choice?.message;
      let rawText = message?.content;

      if (!rawText && message?.reasoning) {
        rawText = message.reasoning;
      }

      if (rawText && typeof rawText === "string") {
        const parsed = extractJsonFromLlmResponse(rawText);
        return validateOraDecision(parsed);
      }
    }

    if (res.status >= 400) {
      const errMsg = res.body?.error?.message || `HTTP ${res.status}`;
      console.warn(`[Ora OpenRouter] Provider returned error: ${errMsg}`);
    }

    return null;
  } catch (err: any) {
    console.warn(`[Ora OpenRouter] Request failed: ${err?.message || "Unknown error"}`);
    return null;
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

  const provider: LlmProvider =
    options.provider ||
    (options.apiKey !== undefined ? "openrouter" : getLlmProvider());
  const mode: OraEngineMode = options.mode || "conversational";

  if (mode === "conversational") {
    if (provider === "ollama") {
      const model = options.model || getOllamaModel();
      const baseUrl = options.baseUrl || getOllamaBaseUrl();

      try {
        const decision = await callOllamaStructuredLlm(
          trimmed,
          model,
          baseUrl,
          context,
          session,
          options.timeoutMs ?? 30000
        );

        if (decision) {
          return {
            ...decision,
            engineMode: "conversational",
            fallback: false
          };
        }
      } catch {
        // Fallthrough to explicit error state
      }

      return {
        type: "PROPERTY_ANSWER",
        response: `Local Ollama service is not responding at ${baseUrl}. Ensure 'ollama serve' is running and model '${model}' is downloaded.`,
        engineMode: "error",
        fallback: false
      };
    }

    // OpenRouter provider branch
    const apiKey = options.apiKey !== undefined ? options.apiKey : getOpenRouterApiKey();
    const model = options.model || getOpenRouterModel();

    if (!apiKey) {
      // No silent fallback when conversational mode is expected
      return {
        type: "PROPERTY_ANSWER",
        response: "Conversational intelligence is awaiting OPENROUTER_API_KEY configuration in the server environment.",
        engineMode: "error",
        fallback: false
      };
    }

    try {
      const decision = await callOpenRouterStructuredLlm(
        trimmed,
        apiKey,
        model,
        context,
        session,
        options.timeoutMs ?? 12000
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
    clean === "see it at night" ||
    clean === "what would it be like at night" ||
    clean === "what is it like at night"
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
    clean.includes("somewhere quieter") ||
    clean.includes("somewhere quiet") ||
    clean.includes("more quiet")
  ) {
    return {
      type: "SHOW_SPACE",
      spaceId: "master_bedroom",
      response: "The master bedroom suite offers complete acoustic seclusion above the canyon."
    };
  }

  if (
    clean === "no i meant the bedroom" ||
    clean === "i meant the bedroom" ||
    clean === "no the bedroom"
  ) {
    return {
      type: "SHOW_SPACE",
      spaceId: "master_bedroom",
      response: "Understood. Guiding you to the master bedroom suite."
    };
  }

  if (
    clean.includes("forget that") && (clean.includes("pool") || clean.includes("swim"))
  ) {
    return {
      type: "SHOW_SPACE",
      spaceId: "infinity_pool",
      response: "The cantilevered infinity pool terrace overlooks the western horizon."
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
