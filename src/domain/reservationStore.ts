/**
 * AURELIA — Session Reservation Store
 * 
 * Lightweight session-level store maintaining reservation request records.
 * Backed by in-memory state and browser sessionStorage for refresh continuity.
 * Contains zero SQL, ORM, database, or external network dependencies.
 */

import {
  ReservationRequest,
  ReservationStatus,
  CreateReservationParams
} from "./reservationTypes";
import { AURELIA_RESERVATION_CONFIG } from "./reservationConfig";
import {
  calculateNights,
  calculateReservationPricing,
  generateReservationReference
} from "./reservationLogic";

const STORAGE_KEY = "aurelia_session_reservations";

export class ReservationStore {
  private records: Map<string, ReservationRequest> = new Map();
  private listeners: Set<() => void> = new Set();
  private isBrowser: boolean;

  constructor() {
    this.isBrowser =
      typeof window !== "undefined" &&
      typeof window.sessionStorage !== "undefined";
    this.loadFromSessionStorage();
  }

  private loadFromSessionStorage(): void {
    if (!this.isBrowser) return;
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ReservationRequest[];
        if (Array.isArray(parsed)) {
          this.records.clear();
          for (const item of parsed) {
            if (item && item.reference) {
              this.records.set(item.reference, item);
            }
          }
        }
      }
    } catch {
      // sessionStorage unavailable or corrupt; continue with empty in-memory store
    }
  }

  private saveToSessionStorage(): void {
    if (!this.isBrowser) return;
    try {
      const serialized = JSON.stringify(Array.from(this.records.values()));
      window.sessionStorage.setItem(STORAGE_KEY, serialized);
    } catch {
      // Storage quota or restriction; keep in-memory
    }
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        // Listener error should not break store operation
      }
    }
  }

  /**
   * Subscribes to store changes (creation, updates, clears).
   * Returns an unsubscribe callback.
   */
  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Creates and stores a new Reservation Request record.
   * If required details (guestName, checkIn, checkOut) are valid, state is READY_FOR_HANDOFF.
   * If any detail is missing or invalid, state remains DRAFT.
   */
  public create(params: CreateReservationParams): ReservationRequest {
    const existingRefs = Array.from(this.records.keys());
    const reference = generateReservationReference(existingRefs);

    const guestName = (params.guestName || "").trim();
    const checkIn = (params.checkIn || "").trim();
    const checkOut = (params.checkOut || "").trim();

    let nights = 0;
    let total = 0;
    let hasValidDates = false;

    if (checkIn && checkOut) {
      try {
        nights = calculateNights(checkIn, checkOut);
        const pricing = calculateReservationPricing(nights, AURELIA_RESERVATION_CONFIG.nightlyRate);
        total = pricing.total;
        hasValidDates = true;
      } catch {
        hasValidDates = false;
      }
    }

    const isComplete = Boolean(guestName && hasValidDates && nights > 0);
    const status: ReservationStatus = params.status ?? (isComplete ? "READY_FOR_HANDOFF" : "DRAFT");

    const record: ReservationRequest = {
      reference,
      status,
      propertyId: params.propertyId || AURELIA_RESERVATION_CONFIG.propertyId,
      guestName: guestName || "Guest",
      checkIn: checkIn || "",
      checkOut: checkOut || "",
      nights,
      nightlyRate: AURELIA_RESERVATION_CONFIG.nightlyRate,
      currency: AURELIA_RESERVATION_CONFIG.currency,
      total,
      createdAt: new Date().toISOString(),
      source: params.source || "ORA"
    };

    this.records.set(reference, record);
    this.saveToSessionStorage();
    this.notify();

    return record;
  }

  /**
   * Retrieves a reservation request by its reference.
   */
  public get(reference: string): ReservationRequest | null {
    return this.records.get(reference) ?? null;
  }

  /**
   * Retrieves the most recent reservation request created in the session.
   */
  public getLatest(): ReservationRequest | null {
    const all = Array.from(this.records.values());
    if (all.length === 0) return null;
    return all[all.length - 1];
  }

  /**
   * Updates the status of an existing reservation request.
   */
  public updateStatus(
    reference: string,
    status: ReservationStatus
  ): ReservationRequest | null {
    const existing = this.records.get(reference);
    if (!existing) return null;

    const updated: ReservationRequest = {
      ...existing,
      status
    };

    this.records.set(reference, updated);
    this.saveToSessionStorage();
    this.notify();

    return updated;
  }

  /**
   * Returns all reservation requests in the current session.
   */
  public getAll(): ReservationRequest[] {
    return Array.from(this.records.values());
  }

  /**
   * Clears all session reservations (useful for test resets).
   */
  public clear(): void {
    this.records.clear();
    if (this.isBrowser) {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
    this.notify();
  }
}

export const reservationStore = new ReservationStore();
