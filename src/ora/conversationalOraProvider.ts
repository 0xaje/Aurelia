/**
 * AURELIA — Conversational Ora Provider (Phase 5C)
 * 
 * Production intelligence adapter implementing OraProvider.
 * Communicates with the secure server-side conversational endpoint (/api/ora/converse),
 * translates structured OraDecisions into typed AURELIA spatial actions,
 * and maintains zero-failure local semantic fallback for offline/test environments.
 */

import {
  OraProvider,
  OraResult,
  OraSessionContext,
  PropertyContext,
  OraDecision,
  OraConversationContext,
  OraInterpretation
} from "./oraTypes";
import { defaultPropertyContext } from "./oraPropertyContext";

const DEFAULT_CONVERSATION_URL = "/api/ora/converse";

export class ConversationalOraProvider implements OraProvider {
  public readonly name = "ConversationalOraProvider (Aurelia Intelligence)";

  constructor(private endpointUrl: string = DEFAULT_CONVERSATION_URL) {}

  public async interpret(
    input: string,
    context: PropertyContext = defaultPropertyContext,
    session?: OraSessionContext
  ): Promise<OraResult> {
    const trimmed = input.trim();
    if (!trimmed) {
      const fallbackDecision: OraDecision = {
        type: "CLARIFICATION",
        response: "Ask Ora about any space or lighting atmosphere."
      };
      return this.mapDecisionToResult(trimmed, fallbackDecision);
    }

    const conversationContext: OraConversationContext = {
      currentSpace: session?.currentSpace || session?.lastSpaceId,
      lastSpace: session?.lastSpace,
      currentAmbiance: session?.currentAmbiance || session?.lastAmbiance,
      recentTurns: session?.recentTurns || []
    };

    let decision: OraDecision | null = null;

    // 0. Fast-path spatial navigation intent resolution:
    // Instantly maps directives ("show me the toilet", "show me around", "take me inside", etc.) in <1ms
    try {
      const { resolveDirectNavigationIntent } = await import("../../server/oraConversationEngine");
      const fastNav = resolveDirectNavigationIntent(trimmed, context, conversationContext);
      if (fastNav) {
        decision = fastNav;
      }
    } catch {
      // Continue to network call
    }

    const isBrowserRuntime =
      typeof window !== "undefined" &&
      typeof window.document !== "undefined" &&
      typeof window.location !== "undefined" &&
      Boolean(window.location.protocol && window.location.protocol.startsWith("http"));

    // 1. In browser runtime, attempt secure server endpoint call if not already resolved by fast-path
    if (!decision && isBrowserRuntime && typeof fetch === "function") {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 35000);

        const res = await fetch(this.endpointUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: trimmed,
            session: conversationContext
          }),
          signal: controller.signal
        });

        clearTimeout(timer);

        if (res.ok) {
          const data = (await res.json()) as { decision?: OraDecision; debug?: Record<string, unknown> };
          if (data.decision) {
            decision = data.decision;
            if (data.debug && typeof console !== "undefined" && console.debug) {
              console.debug("[Ora Conversational Intelligence]", data.debug);
            }
          }
        }
      } catch {
        // Network error or timeout contacting server endpoint
      }
    }

    // 2. Direct semantic engine invocation (tests or offline browser fallback)
    if (!decision) {
      try {
        const { executeServerOraConversation } = await import("../../server/oraConversationEngine");
        decision = await executeServerOraConversation(
          trimmed,
          context,
          conversationContext,
          { mode: "deterministic-dev" }
        );
      } catch {
        decision = {
          type: "PROPERTY_ANSWER",
          response: "Aurelia Sanctuary offers eight architectural spaces across day, sunset, and night."
        };
      }
    }

    return this.mapDecisionToResult(trimmed, decision);
  }

  /**
   * Maps a validated OraDecision to the existing typed OraResult contract.
   */
  private mapDecisionToResult(rawInput: string, decision: OraDecision): OraResult {
    let action = undefined;
    let ambianceAction = undefined;

    switch (decision.type) {
      case "SHOW_SPACE":
        action = { type: "SHOW_SPACE" as const, spaceId: decision.spaceId };
        break;

      case "CHANGE_AMBIANCE":
        ambianceAction = { type: "SHOW_AMBIANCE" as const, ambiance: decision.ambiance };
        break;

      case "SHOW_SPACE_AND_AMBIANCE":
        action = { type: "SHOW_SPACE" as const, spaceId: decision.spaceId };
        ambianceAction = { type: "SHOW_AMBIANCE" as const, ambiance: decision.ambiance };
        break;

      case "GREETING":
      case "PROPERTY_ANSWER":
      case "CLARIFICATION":
      case "BOOKING_INTENT":
      case "OUT_OF_SCOPE":
      default:
        // Pure conversational responses intentionally do NOT move the camera or alter ambiance
        break;
    }

    const actions = [];
    if (ambianceAction) actions.push(ambianceAction);
    if (action) actions.push(action);

    // Construct backward-compatible OraInterpretation
    let interpretation: OraInterpretation;

    if (decision.type === "SHOW_SPACE") {
      interpretation = {
        type: "NAVIGATE_SPACE",
        spaceId: decision.spaceId,
        confidence: 0.95,
        action: action!,
        spokenResponse: decision.response
      };
    } else if (decision.type === "CHANGE_AMBIANCE") {
      interpretation = {
        type: "CHANGE_AMBIANCE",
        ambiance: decision.ambiance,
        confidence: 0.95,
        action: ambianceAction!,
        spokenResponse: decision.response
      };
    } else if (decision.type === "SHOW_SPACE_AND_AMBIANCE") {
      interpretation = {
        type: "NAVIGATE_SPACE",
        spaceId: decision.spaceId,
        confidence: 0.95,
        action: action!,
        ambianceAction,
        spokenResponse: decision.response
      };
    } else if (decision.type === "CLARIFICATION") {
      interpretation = {
        type: "CLARIFICATION_REQUIRED",
        reason: (decision.reason as any) || "ambiguous_space",
        spokenResponse: decision.response
      };
    } else {
      interpretation = {
        type: "GENERAL_INQUIRY",
        topic: decision.type,
        spokenResponse: decision.response
      };
    }

    return {
      rawInput,
      decision,
      interpretation,
      action,
      ambianceAction,
      actions: actions.length > 0 ? actions : undefined,
      spokenResponse: decision.response
    };
  }
}
