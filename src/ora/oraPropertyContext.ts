import { defaultProperty, SpaceId } from "../domain/spatial";
import { PropertyContext, PropertySpaceContext } from "./oraTypes";

/**
 * Natural language synonyms and architectural references for each canonical space.
 * Derived from data/shortlet.json and authentic property features.
 */
const SPATIAL_ALIASES: Record<SpaceId, string[]> = {
  exterior: [
    "exterior",
    "outside",
    "facade",
    "approach",
    "runway",
    "arrival",
    "property",
    "estate",
    "driveway",
    "canyon view",
    "mountain slope",
    "back outside",
    "outside view",
    "whole property",
    "building"
  ],
  entrance: [
    "entrance",
    "entry",
    "front door",
    "pivot doors",
    "canopy",
    "water channel",
    "reflection pool",
    "doors",
    "enter",
    "where do i enter",
    "arrival canopy",
    "foyer",
    "front"
  ],
  living_room: [
    "living room",
    "living",
    "lounge",
    "conversation pit",
    "sunken lounge",
    "pit",
    "seating area",
    "sitting area",
    "sofa",
    "great room",
    "pavilion",
    "where people sit",
    "gather",
    "living area",
    "sitting room"
  ],
  kitchen: [
    "kitchen",
    "island",
    "dining island",
    "waterfall island",
    "culinary",
    "cook",
    "prepare meals",
    "barstools",
    "pantry",
    "marble island",
    "where meals are prepared",
    "where the meals are prepared",
    "cooking area",
    "dining"
  ],
  hallway: [
    "hallway",
    "corridor",
    "gallery",
    "gallery corridor",
    "central corridor",
    "passageway",
    "transit",
    "hall",
    "slot lighting",
    "down the corridor",
    "hallways"
  ],
  master_bedroom: [
    "bedroom",
    "master bedroom",
    "primary bedroom",
    "primary suite",
    "master suite",
    "bed",
    "sleep",
    "where would i sleep",
    "sleeping area",
    "master",
    "primary",
    "suite"
  ],
  ensuite_bathroom: [
    "bathroom",
    "ensuite",
    "bath",
    "spa",
    "primary ensuite",
    "tub",
    "soaking tub",
    "shower",
    "washroom",
    "ensuite spa",
    "cactus courtyard",
    "freestanding tub"
  ],
  infinity_pool: [
    "pool",
    "infinity pool",
    "swimming pool",
    "terrace",
    "sun terrace",
    "deck",
    "sun deck",
    "swimming",
    "swimming area",
    "outside pool",
    "basalt pool",
    "canyon pool"
  ]
};

/**
 * Builds the authoritative property context consumed by the conversational interpreter.
 */
export function buildPropertyContext(): PropertyContext {
  const p = defaultProperty.property;

  const spaces: PropertySpaceContext[] = p.spaces.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    representation: s.representation,
    description: s.description,
    architecturalFeatures: s.architecturalFeatures,
    aliases: SPATIAL_ALIASES[s.id] || [s.id.replace("_", " ")]
  }));

  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    type: p.type,
    currency: p.currency,
    spaces
  };
}

export const defaultPropertyContext = buildPropertyContext();

/**
 * Known unsupported entities to distinguish explicit missing amenities from random gibberish.
 */
export const KNOWN_UNSUPPORTED_ENTITIES: Record<string, string[]> = {
  gym: ["gym", "fitness", "workout", "exercise", "weights", "treadmill"],
  cinema: ["cinema", "theater", "theatre", "screening room", "movie room"],
  garage: ["garage", "parking", "carport", "car", "cars", "park"],
  guest_room: ["guest room", "guest bedroom", "second bedroom", "bunk", "kids room"],
  office: ["office", "workspace", "study", "desk"],
  wine_cellar: ["wine cellar", "cellar", "wine room"]
};

/**
 * Ambiguity patterns requiring clarification rather than wild guessing.
 */
export const KNOWN_AMBIGUOUS_PATTERNS = [
  {
    pattern: /\b(upstairs|second floor|upper floor|top floor|second level|up)\b/i,
    explanation:
      "Aurelia Sanctuary is an architectural single-level modernist estate sculpted horizontally along the highland canyon slope. All living spaces, suites, and outdoor terraces extend across this single level."
  },
  {
    pattern: /\b(downstairs|lower floor|basement)\b/i,
    explanation:
      "Aurelia Sanctuary is built on a single continuous terrace level anchored into the bedrock. There is no lower floor."
  }
];

export const KNOWN_AMBIANCE_ALIASES: Record<"day" | "sunset" | "night", string[]> = {
  day: [
    "day",
    "daytime",
    "daylight",
    "morning",
    "day view",
    "during the day",
    "in the daytime",
    "switch to day",
    "switch to daytime",
    "see it in daylight",
    "daylight view"
  ],
  sunset: [
    "sunset",
    "golden hour",
    "dusk",
    "evening sunset",
    "sunset view",
    "at sunset",
    "during golden hour",
    "warm light",
    "sundown"
  ],
  night: [
    "night",
    "nighttime",
    "after dark",
    "dark",
    "night view",
    "at night",
    "evening lighting",
    "night lighting",
    "switch to night",
    "look like at night",
    "look like after dark"
  ]
};

export const UNSUPPORTED_AMBIANCES = [
  "midnight",
  "dawn",
  "sunrise",
  "noon",
  "rain",
  "fog",
  "snow",
  "storm",
  "winter",
  "autumn",
  "spring",
  "summer",
  "overcast",
  "cloudy"
];
