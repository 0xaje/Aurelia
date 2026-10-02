import { resolveSpaceAction, defaultProperty } from "../domain/spatial";
import {
  PropertyContext,
  OraProvider,
  OraResult,
  OraSessionContext
} from "./oraTypes";
import { defaultPropertyContext } from "./oraPropertyContext";
import { interpretOraInput } from "./oraInterpreter";

/**
 * Deterministic local development adapter for the Ora conversational engine.
 * 
 * NOTE: This is a deterministic rule-based development implementation satisfying
 * the OraProvider interface. It does not call an external LLM and never hallucinates.
 * Future model providers (e.g. GeminiOraProvider) can implement this identical interface.
 */
export class DeterministicOraProvider implements OraProvider {
  public readonly name = "DeterministicOraProvider (Development Adapter)";

  public async interpret(
    input: string,
    context: PropertyContext = defaultPropertyContext,
    session?: OraSessionContext
  ): Promise<OraResult> {
    const interpretation = interpretOraInput(input, context, session);

    let action = undefined;
    let ambianceAction = undefined;

    if ("action" in interpretation) {
      action = interpretation.action;
    }

    if ("ambianceAction" in interpretation && interpretation.ambianceAction) {
      ambianceAction = interpretation.ambianceAction;
    } else if (interpretation.type === "CHANGE_AMBIANCE" && interpretation.action.type === "SHOW_AMBIANCE") {
      ambianceAction = interpretation.action;
    }

    const actions = [];
    if (ambianceAction) actions.push(ambianceAction);
    if (action) actions.push(action);

    return {
      rawInput: input,
      interpretation,
      action,
      ambianceAction,
      actions: actions.length > 0 ? actions : undefined,
      spokenResponse: interpretation.spokenResponse
    };
  }
}

import { ConversationalOraProvider } from "./conversationalOraProvider";

export { ConversationalOraProvider };
export const defaultOraProvider: OraProvider = new ConversationalOraProvider();

/**
 * Executes a conversational request through the Ora provider and resolves
 * any resultant spatial action against the authoritative property model.
 */
export async function executeOraRequest(
  input: string,
  provider: OraProvider = defaultOraProvider,
  context: PropertyContext = defaultPropertyContext,
  session?: OraSessionContext
): Promise<OraResult> {
  const result = await provider.interpret(input, context, session);

  if (result.ambianceAction) {
    resolveSpaceAction(result.ambianceAction, defaultProperty);
    if (session) {
      session.lastAmbiance = result.ambianceAction.ambiance;
      session.currentAmbiance = result.ambianceAction.ambiance;
    }
  }

  if (result.action) {
    const resolution = resolveSpaceAction(result.action, defaultProperty);
    result.resolution = resolution;

    if (session) {
      if (resolution.success && (resolution.view.mode === "cinematic" || resolution.view.mode === "detail")) {
        session.lastSpace = session.currentSpace;
        session.currentSpace = resolution.view.space.id;
        session.lastSpaceId = resolution.view.space.id;
      }
      session.lastAction = result.action;
    }
  }

  if (session) {
    const now = Date.now();
    session.history.push({
      id: `msg-${now}-user`,
      sender: "user",
      text: input,
      timestamp: now,
      action: result.action
    });

    session.history.push({
      id: `msg-${now + 1}-ora`,
      sender: "ora",
      text: result.spokenResponse,
      timestamp: now + 1,
      action: result.action,
      resolution: result.resolution
    });

    if (!session.recentTurns) {
      session.recentTurns = [];
    }
    session.recentTurns.push({
      role: "user",
      text: input,
      timestamp: now
    });
    session.recentTurns.push({
      role: "ora",
      text: result.spokenResponse,
      decision: result.decision,
      timestamp: now + 1
    });

    if (session.recentTurns.length > 8) {
      session.recentTurns = session.recentTurns.slice(-8);
    }
  }

  return result;
}
