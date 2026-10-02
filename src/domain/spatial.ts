import rawProperty from "../../data/shortlet.json" with { type: "json" };

export type SpaceId =
  | "exterior"
  | "entrance"
  | "living_room"
  | "kitchen"
  | "hallway"
  | "master_bedroom"
  | "ensuite_bathroom"
  | "infinity_pool";

export type RepresentationType = "cinematic" | "detail";

export type SpaceCategory =
  | "outdoor"
  | "entry"
  | "living"
  | "culinary"
  | "circulation"
  | "bedroom"
  | "bathroom";

export interface SpaceVisual {
  type: "image";
  src: string;
  aspectRatio: string;
  alt: string;
}

export interface SpaceCinematic {
  available: boolean;
  frame: number | null;
  coverage: "full" | "partial" | "threshold" | "none";
}

export interface PropertySpace {
  id: SpaceId;
  name: string;
  category: SpaceCategory;
  description: string;
  representation: RepresentationType;
  visual?: SpaceVisual;
  cinematic?: SpaceCinematic;
  architecturalFeatures: string[];
}

export interface ShortletProperty {
  property: {
    id: string;
    name: string;
    tagline: string;
    type: "private_shortlet_estate";
    currency: "USD";
    pricing: {
      nightly_rate_usd: number | null;
      cleaning_fee_usd: number | null;
      status: string;
    };
    location: {
      label: string;
      region: string;
    };
    spaces: PropertySpace[];
  };
}

export const defaultProperty: ShortletProperty = rawProperty as ShortletProperty;

export type AmbianceId = "day" | "sunset" | "night";

/**
 * Action model representing spatial and environmental instructions that can be emitted
 * by conversational agents (Ora) or user interactions.
 */
export type SpatialAction =
  | { type: "SHOW_SPACE"; spaceId: SpaceId | (string & {}) }
  | { type: "SHOW_AMBIANCE"; ambiance: AmbianceId }
  | { type: "RETURN_TO_OVERVIEW" };

/**
 * Spatial View presentation state representing the current visual mode.
 */
export type SpatialView =
  | { mode: "overview" }
  | { mode: "cinematic"; space: PropertySpace; frame: number }
  | { mode: "detail"; space: PropertySpace; visual: SpaceVisual }
  | { mode: "ambiance"; ambiance: AmbianceId };

export type SpatialResolution =
  | {
      success: true;
      view: SpatialView;
    }
  | {
      success: false;
      error: string;
      fallbackView: SpatialView;
    };

/**
 * Queries a space by its identifier.
 */
export function getSpaceById(
  property: ShortletProperty,
  spaceId: string
): PropertySpace | undefined {
  return property.property.spaces.find((s) => s.id === spaceId);
}

/**
 * Returns all spaces designated with the 'detail' representation.
 */
export function getDetailSpaces(property: ShortletProperty): PropertySpace[] {
  return property.property.spaces.filter((s) => s.representation === "detail");
}

/**
 * Returns all spaces designated with the 'cinematic' representation.
 */
export function getCinematicSpaces(property: ShortletProperty): PropertySpace[] {
  return property.property.spaces.filter((s) => s.representation === "cinematic");
}

/**
 * Resolves a typed spatial action into a concrete presentation view.
 * Fails safely on invalid or unknown space IDs without hallucinating assets.
 */
export function resolveSpaceAction(
  action: SpatialAction,
  property: ShortletProperty = defaultProperty
): SpatialResolution {
  if (action.type === "RETURN_TO_OVERVIEW") {
    return {
      success: true,
      view: { mode: "overview" }
    };
  }

  if (action.type === "SHOW_SPACE") {
    const space = getSpaceById(property, action.spaceId);

    if (!space) {
      return {
        success: false,
        error: `Unknown space identifier: "${action.spaceId}". Space is not present in property catalog.`,
        fallbackView: { mode: "overview" }
      };
    }

    if (space.representation === "detail") {
      if (!space.visual) {
        return {
          success: false,
          error: `Space "${space.id}" is classified as detail but lacks visual asset specification.`,
          fallbackView: { mode: "overview" }
        };
      }

      return {
        success: true,
        view: {
          mode: "detail",
          space,
          visual: space.visual
        }
      };
    }

    if (space.representation === "cinematic") {
      const targetFrame = space.cinematic?.frame ?? 0;
      return {
        success: true,
        view: {
          mode: "cinematic",
          space,
          frame: targetFrame
        }
      };
    }
  }

  if (action.type === "SHOW_AMBIANCE") {
    const validAmbiances: AmbianceId[] = ["day", "sunset", "night"];
    if (validAmbiances.includes(action.ambiance)) {
      return {
        success: true,
        view: {
          mode: "ambiance",
          ambiance: action.ambiance
        }
      };
    }

    return {
      success: false,
      error: `Unsupported ambiance: "${action.ambiance}". Supported modes are day, sunset, and night.`,
      fallbackView: { mode: "overview" }
    };
  }

  return {
    success: false,
    error: "Unsupported spatial action",
    fallbackView: { mode: "overview" }
  };
}
