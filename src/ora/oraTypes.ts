import { SpaceId, SpatialAction, SpatialResolution, AmbianceId } from "../domain/spatial";
import type { OraAction } from "./productAdapter";

export type OraState =
  | "idle"
  | "hover"
  | "active"
  | "listening"
  | "processing"
  | "responding"
  | "clarification"
  | "error";

export interface PropertySpaceContext {
  id: SpaceId;
  name: string;
  category: string;
  representation: "cinematic" | "detail";
  description: string;
  architecturalFeatures: string[];
  aliases: string[];
}

export interface PropertyContext {
  id: string;
  name: string;
  tagline: string;
  type: string;
  currency: string;
  spaces: PropertySpaceContext[];
}

export interface OraMessage {
  id: string;
  sender: "user" | "ora";
  text: string;
  timestamp: number;
  action?: SpatialAction;
  resolution?: SpatialResolution;
}

export interface ConversationTurn {
  role: "user" | "ora";
  text: string;
  decision?: OraDecision;
  timestamp: number;
}

export interface OraConversationContext {
  currentSpace?: SpaceId;
  lastSpace?: SpaceId;
  currentAmbiance?: AmbianceId;
  recentTurns: ConversationTurn[];
}

export interface OraSessionContext {
  lastSpaceId?: SpaceId;
  currentSpace?: SpaceId;
  lastSpace?: SpaceId;
  lastAction?: SpatialAction;
  lastAmbiance?: AmbianceId;
  currentAmbiance?: AmbianceId;
  history: OraMessage[];
  recentTurns?: ConversationTurn[];
}

export type OraEngineMode = "conversational" | "deterministic-dev" | "error";

export type OraDecision = (
  | {
      type: "GREETING";
      response: string;
    }
  | {
      type: "PROPERTY_ANSWER";
      response: string;
    }
  | {
      type: "SHOW_SPACE";
      spaceId: SpaceId;
      response: string;
    }
  | {
      type: "CHANGE_AMBIANCE";
      ambiance: AmbianceId;
      response: string;
    }
  | {
      type: "SHOW_SPACE_AND_AMBIANCE";
      spaceId: SpaceId;
      ambiance: AmbianceId;
      response: string;
    }
  | {
      type: "CLARIFICATION";
      response: string;
      reason?: string;
    }
  | {
      type: "BOOKING_INTENT";
      response: string;
    }
  | {
      type: "OUT_OF_SCOPE";
      response: string;
    }
  | {
      type: "START_TOUR";
      response: string;
    }
  | {
      type: "INITIATE_TRANSACTION";
      transactionType: "RESERVATION" | string;
      guestName?: string;
      checkIn?: string;
      checkOut?: string;
      response: string;
    }
) & {
  engineMode?: OraEngineMode;
  fallback?: boolean;
};

export type OraInterpretationType =
  | "NAVIGATE_SPACE"
  | "CHANGE_AMBIANCE"
  | "RETURN_OVERVIEW"
  | "CLARIFICATION_REQUIRED"
  | "UNSUPPORTED_SPACE"
  | "GENERAL_INQUIRY";

export type OraInterpretation =
  | {
      type: "NAVIGATE_SPACE";
      spaceId: SpaceId;
      confidence: number;
      action: SpatialAction;
      ambianceAction?: { type: "SHOW_AMBIANCE"; ambiance: AmbianceId };
      spokenResponse: string;
      matchedAlias?: string;
    }
  | {
      type: "CHANGE_AMBIANCE";
      ambiance: AmbianceId;
      confidence: number;
      action: SpatialAction;
      spaceAction?: { type: "SHOW_SPACE"; spaceId: SpaceId };
      spokenResponse: string;
    }
  | {
      type: "RETURN_OVERVIEW";
      confidence: number;
      action: SpatialAction;
      spokenResponse: string;
    }
  | {
      type: "CLARIFICATION_REQUIRED";
      reason: "ambiguous_space" | "unsupported_destination" | "missing_target" | "unsupported_ambiance";
      spokenResponse: string;
      suggestedSpaces?: SpaceId[];
    }
  | {
      type: "UNSUPPORTED_SPACE";
      requestedEntity: string;
      spokenResponse: string;
      availableSpaces: SpaceId[];
    }
  | {
      type: "GENERAL_INQUIRY";
      topic: string;
      spokenResponse: string;
    };

export interface OraResult {
  rawInput: string;
  interpretation: OraInterpretation;
  decision?: OraDecision;
  action?: SpatialAction;
  ambianceAction?: { type: "SHOW_AMBIANCE"; ambiance: AmbianceId };
  actions?: SpatialAction[];
  spokenResponse: string;
  resolution?: SpatialResolution;
  transactionAction?: OraAction;
}

export interface OraProvider {
  name: string;
  interpret(
    input: string,
    context: PropertyContext,
    session?: OraSessionContext
  ): Promise<OraResult>;
}
