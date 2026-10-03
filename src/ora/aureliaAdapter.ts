/**
 * AURELIA — Product Adapter Implementation
 * 
 * Implements the ProductAdapter interface for the Aurelia Sanctuary shortlet estate.
 * Maps generic ORA action envelopes and queries into concrete Aurelia spatial,
 * atmospheric, and presentation operations.
 */

import {
  ProductAdapter,
  ProductContext,
  ProductActionResult,
  OraAction
} from "./productAdapter";
import { defaultProperty, SpaceId, AmbianceId, resolveSpaceAction } from "../domain/spatial";
import { resolveDirectNavigationIntent } from "./fastPath";
import { OraDecision, OraConversationContext } from "./oraTypes";
import { defaultPropertyContext } from "./oraPropertyContext";
import { reservationStore } from "../domain/reservationStore";

export class AureliaProductAdapter implements ProductAdapter {
  private readonly property = defaultProperty;

  /**
   * Exposes domain metadata, spaces, and capabilities to ORA.
   */
  public getContext(): ProductContext {
    return {
      productId: this.property.property.id,
      productName: this.property.property.name,
      tagline: this.property.property.tagline,
      entities: this.property.property.spaces.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        description: s.description,
        aliases: [s.name.toLowerCase(), s.id.replace("_", " ")],
        attributes: {
          representation: s.representation,
          architecturalFeatures: s.architecturalFeatures,
          cinematicFrame: s.cinematic?.frame ?? null
        }
      })),
      supportedAmbiances: ["day", "sunset", "night"],
      capabilities: {
        supportsSpatialNavigation: true,
        supportsAtmosphereControl: true,
        supportsGuidedTour: true,
        supportsDirectTransaction: true
      }
    };
  }

  /**
   * Fast-path spatial routing using pure shared fast-path router.
   */
  public resolveFastPathIntent(
    utterance: string,
    context?: OraConversationContext
  ): OraDecision | null {
    return resolveDirectNavigationIntent(utterance, defaultPropertyContext, context);
  }

  /**
   * Executes visual/spatial navigation to an architectural space.
   */
  public async navigateToEntity(entityId: string): Promise<ProductActionResult> {
    const resolution = resolveSpaceAction(
      { type: "SHOW_SPACE", spaceId: entityId as SpaceId },
      this.property
    );

    if (resolution.success) {
      return {
        success: true,
        message: `Navigated to space: ${entityId}`,
        data: resolution.view
      };
    }

    return {
      success: false,
      error: resolution.error
    };
  }

  /**
   * Sets ambient lighting mode (day, sunset, night).
   */
  public async setAmbiance(ambianceId: string): Promise<ProductActionResult> {
    const resolution = resolveSpaceAction(
      { type: "SHOW_AMBIANCE", ambiance: ambianceId as AmbianceId },
      this.property
    );

    if (resolution.success) {
      return {
        success: true,
        message: `Set ambiance to: ${ambianceId}`,
        data: resolution.view
      };
    }

    return {
      success: false,
      error: resolution.error
    };
  }

  /**
   * Starts autonomous grand tour.
   */
  public async startTour(): Promise<ProductActionResult> {
    return {
      success: true,
      message: "Aurelia Sanctuary grand tour initiated."
    };
  }

  /**
   * Dispatches generic ORA action to Aurelia domain.
   */
  public async executeAction(action: OraAction): Promise<ProductActionResult> {
    switch (action.type) {
      case "NAVIGATE":
        return this.navigateToEntity(action.payload.targetId);

      case "SET_AMBIANCE":
        return this.setAmbiance(action.payload.mode);

      case "START_TOUR":
        return this.startTour();

      case "INITIATE_TRANSACTION": {
        const payload = action.payload;
        const reservation = reservationStore.create({
          guestName: payload.guestName,
          checkIn: payload.checkIn,
          checkOut: payload.checkOut,
          propertyId: this.property.property.id,
          source: "ORA"
        });

        const isComplete = reservation.status === "READY_FOR_HANDOFF";
        return {
          success: true,
          message: isComplete
            ? "I’ve prepared your reservation request for Aurelia."
            : "I've started your reservation request. Please provide your guest name and stay dates.",
          data: reservation
        };
      }

      case "DISPATCH_HANDOFF": {
        const payload = action.payload;
        const ref = payload.recipientNote || reservationStore.getLatest()?.reference;
        if (ref) {
          reservationStore.updateStatus(ref, "HANDOFF_OPENED");
        }
        return {
          success: true,
          message: `Handoff action dispatched for channel: ${payload.channel}`,
          data: payload
        };
      }

      default:
        return {
          success: false,
          error: `Unsupported ORA action: ${(action as any).type}`
        };
    }
  }
}

export const aureliaProductAdapter = new AureliaProductAdapter();
