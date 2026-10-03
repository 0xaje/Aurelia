/**
 * ORA — Product Adapter Contract
 * 
 * Defines the generic, domain-agnostic interface that any host application
 * must implement to become conversationally controllable and actionable by ORA.
 */

import { OraDecision, OraConversationContext } from "./oraTypes";

export interface ProductEntity {
  id: string;
  name: string;
  category: string;
  description: string;
  aliases: string[];
  attributes?: Record<string, unknown>;
}

export interface ProductCapabilities {
  supportsSpatialNavigation: boolean;
  supportsAtmosphereControl: boolean;
  supportsGuidedTour: boolean;
  supportsDirectTransaction: boolean;
}

export interface ProductContext {
  productId: string;
  productName: string;
  tagline: string;
  entities: ProductEntity[];
  supportedAmbiances?: string[];
  capabilities: ProductCapabilities;
}

export type ProductActionResult =
  | {
      success: true;
      message?: string;
      data?: unknown;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Generic ORA Action Model.
 * High-level actions that ORA can emit to any connected product adapter.
 */
export type OraAction =
  | {
      type: "NAVIGATE";
      payload: { targetId: string };
    }
  | {
      type: "SET_AMBIANCE";
      payload: { mode: string };
    }
  | {
      type: "START_TOUR";
      payload?: Record<string, never>;
    }
  | {
      type: "INITIATE_TRANSACTION";
      payload: {
        transactionType: "RESERVATION" | string;
        guestName?: string;
        checkIn?: string;
        checkOut?: string;
        nights?: number;
        details?: Record<string, unknown>;
      };
    }
  | {
      type: "DISPATCH_HANDOFF";
      payload: {
        channel: "WHATSAPP" | string;
        recipientNote?: string;
        prefilledText: string;
        handoffUrl?: string;
      };
    };

/**
 * The ProductAdapter interface.
 * Decouples ORA Core intelligence from product-specific visual, spatial, and commerce implementations.
 */
export interface ProductAdapter {
  /** Returns the metadata, entities, and capabilities of the host product */
  getContext(): ProductContext;

  /** Optional fast-path domain intent resolver: allows the adapter to map explicit phrases in <1ms */
  resolveFastPathIntent?(
    utterance: string,
    context?: OraConversationContext
  ): OraDecision | null;

  /** Executes a spatial or visual reorientation to a specific entity */
  navigateToEntity(entityId: string): Promise<ProductActionResult>;

  /** Executes an environmental or visual lighting change */
  setAmbiance?(ambianceId: string): Promise<ProductActionResult>;

  /** Executes an autonomous guided walkthrough */
  startTour?(): Promise<ProductActionResult>;

  /** Executes a generic action or transaction */
  executeAction?(action: OraAction): Promise<ProductActionResult>;
}
