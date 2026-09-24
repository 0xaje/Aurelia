import type { Room } from "../state/types.ts";

export interface RoomSearchFilters {
  max_price_ngn?: number;
  required_balcony?: boolean;
  required_bathtub?: boolean;
}

/**
 * Deterministically searches authoritative hotel catalog based on guest criteria.
 * Never invents rooms or prices. Returns filtered rooms sorted by price ascending.
 */
export function searchRooms(catalog: Room[], filters: RoomSearchFilters): Room[] {
  return catalog.filter((room) => {
    // 1. Budget constraint
    if (filters.max_price_ngn !== undefined) {
      if (room.price_per_night > filters.max_price_ngn) {
        return false;
      }
    }

    // 2. Balcony constraint
    if (filters.required_balcony === true) {
      if (!room.has_balcony) {
        return false;
      }
    }

    // 3. Bathtub constraint
    if (filters.required_bathtub === true) {
      if (!room.has_bathtub) {
        return false;
      }
    }

    return true;
  }).sort((a, b) => a.price_per_night - b.price_per_night);
}
