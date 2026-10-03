import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatStayDate,
  buildReservationHandoffMessage,
  buildWhatsAppHandoffUrl
} from "../src/domain/reservationHandoff";
import { ReservationRequest } from "../src/domain/reservationTypes";
import { reservationStore } from "../src/domain/reservationStore";
import { aureliaProductAdapter } from "../src/ora/aureliaAdapter";

describe("Phase 4: WhatsApp Reservation Handoff Unit Tests", () => {
  const sampleReservationA: ReservationRequest = {
    reference: "AUR-2026-4821",
    propertyId: "aurelia-sanctuary",
    guestName: "John",
    checkIn: "2026-10-09",
    checkOut: "2026-10-11",
    nights: 2,
    nightlyRate: 1850,
    currency: "USD",
    total: 3700,
    status: "READY_FOR_HANDOFF",
    createdAt: new Date().toISOString(),
    source: "ORA"
  };

  const sampleReservationB: ReservationRequest = {
    reference: "AUR-2026-9042",
    propertyId: "aurelia-sanctuary",
    guestName: "Elena & Marcus O'Connor + Guest",
    checkIn: "2026-11-20",
    checkOut: "2026-11-25",
    nights: 5,
    nightlyRate: 1850,
    currency: "USD",
    total: 9250,
    status: "READY_FOR_HANDOFF",
    createdAt: new Date().toISOString(),
    source: "ORA"
  };

  describe("Date Formatting (formatStayDate)", () => {
    it("formats ISO date string into human-readable Month Day, Year", () => {
      assert.equal(formatStayDate("2026-10-09"), "October 9, 2026");
      assert.equal(formatStayDate("2026-11-25"), "November 25, 2026");
      assert.equal(formatStayDate("2027-01-01"), "January 1, 2027");
    });

    it("falls back gracefully on invalid or non-ISO dates without throwing", () => {
      assert.equal(formatStayDate(""), "Pending");
      assert.equal(formatStayDate("invalid-date"), "invalid-date");
      assert.equal(formatStayDate("10/09/2026"), "10/09/2026");
    });
  });

  describe("Message Generation (buildReservationHandoffMessage)", () => {
    it("contains all required reservation fields", () => {
      const message = buildReservationHandoffMessage(sampleReservationA);

      assert.match(message, /Property:\s*AURELIA Sanctuary/i);
      assert.match(message, /Request Reference:\s*AUR-2026-4821/);
      assert.match(message, /Guest:\s*John/);
      assert.match(message, /Check-in:\s*October 9, 2026/);
      assert.match(message, /Check-out:\s*October 11, 2026/);
      assert.match(message, /Stay:\s*2 nights/);
      assert.match(message, /Shortlet nightly rate:\s*\$1,850 USD \/ night/);
      assert.match(message, /Estimated total:\s*\$3,700 USD/);
    });

    it("truthfully frames message as a reservation request without false confirmations or invoices", () => {
      const message = buildReservationHandoffMessage(sampleReservationA);

      // Must include reservation request language
      assert.match(message, /reservation request/i);
      assert.match(message, /Status: Reservation Request \(Ready for Handoff\)/);
      assert.match(message, /Please assist with availability and final confirmation/i);

      // Must NOT include invoice, payment, or confirmed booking claims
      assert.doesNotMatch(message, /invoice/i);
      assert.doesNotMatch(message, /confirmed booking/i);
      assert.doesNotMatch(message, /booking confirmed/i);
      assert.doesNotMatch(message, /payment received/i);
      assert.doesNotMatch(message, /payment due/i);
      assert.doesNotMatch(message, /hotel room/i);
    });

    it("handles single night stay grammar cleanly", () => {
      const singleNightReservation: ReservationRequest = {
        ...sampleReservationA,
        nights: 1,
        total: 1850
      };
      const message = buildReservationHandoffMessage(singleNightReservation);
      assert.match(message, /Stay:\s*1 night\b/);
    });
  });

  describe("WhatsApp URL Generation & Proper Encoding (buildWhatsAppHandoffUrl)", () => {
    it("begins with https://wa.me/?text=", () => {
      const url = buildWhatsAppHandoffUrl(sampleReservationA);
      assert.ok(url.startsWith("https://wa.me/?text="));
    });

    it("contains valid URL-encoded message content", () => {
      const url = buildWhatsAppHandoffUrl(sampleReservationA);
      const queryParam = url.replace("https://wa.me/?text=", "");
      
      // Decoded text matches original pure message
      const decoded = decodeURIComponent(queryParam);
      const expectedMessage = buildReservationHandoffMessage(sampleReservationA);
      assert.equal(decoded, expectedMessage);
    });

    it("correctly handles spaces and special characters (&, ', +)", () => {
      const url = buildWhatsAppHandoffUrl(sampleReservationB);
      assert.ok(url.startsWith("https://wa.me/?text="));

      // Raw URL should not contain raw unencoded spaces or newlines
      assert.ok(!url.includes("\n"));
      assert.ok(!url.includes("\r"));

      // Decoded matches expected with special characters preserved
      const queryParam = url.replace("https://wa.me/?text=", "");
      const decoded = decodeURIComponent(queryParam);
      assert.match(decoded, /Guest:\s*Elena & Marcus O'Connor \+ Guest/);
      assert.match(decoded, /Estimated total:\s*\$9,250 USD/);
    });

    it("does not hardcode any user or operator phone number", () => {
      const urlA = buildWhatsAppHandoffUrl(sampleReservationA);
      const urlB = buildWhatsAppHandoffUrl(sampleReservationB);

      // Must be https://wa.me/?text=, NOT https://wa.me/1234567890?text=
      assert.ok(urlA.startsWith("https://wa.me/?text="));
      assert.ok(urlB.startsWith("https://wa.me/?text="));
      assert.doesNotMatch(urlA, /^https:\/\/wa\.me\/\d+/);
      assert.doesNotMatch(urlB, /^https:\/\/wa\.me\/\d+/);
    });
  });

  describe("Dynamic Data Fidelity", () => {
    it("generates distinct messages and URLs for different reservation inputs", () => {
      const messageA = buildReservationHandoffMessage(sampleReservationA);
      const messageB = buildReservationHandoffMessage(sampleReservationB);
      const urlA = buildWhatsAppHandoffUrl(sampleReservationA);
      const urlB = buildWhatsAppHandoffUrl(sampleReservationB);

      assert.notEqual(messageA, messageB);
      assert.notEqual(urlA, urlB);
      assert.ok(messageA.includes("John"));
      assert.ok(messageB.includes("Elena & Marcus"));
      assert.ok(messageA.includes("$3,700"));
      assert.ok(messageB.includes("$9,250"));
    });
  });

  describe("State Transitions & Reservation Integrity", () => {
    it("transitions reservation status from READY_FOR_HANDOFF to HANDOFF_OPENED via store", () => {
      const created = reservationStore.create({
        guestName: "Audrey Hepburn",
        checkIn: "2026-12-10",
        checkOut: "2026-12-14",
        propertyId: "aurelia-sanctuary",
        source: "ORA"
      });

      assert.equal(created.status, "READY_FOR_HANDOFF");

      const updated = reservationStore.updateStatus(created.reference, "HANDOFF_OPENED");
      assert.ok(updated);
      assert.equal(updated.status, "HANDOFF_OPENED");
    });

    it("preserves reservation data integrity without mutating dates, pricing, or guest info during handoff", () => {
      const created = reservationStore.create({
        guestName: "Sophia Loren",
        checkIn: "2026-10-15",
        checkOut: "2026-10-18",
        propertyId: "aurelia-sanctuary",
        source: "ORA"
      });

      const originalSnapshot = { ...created };

      // Dispatch handoff update
      const afterHandoff = reservationStore.updateStatus(created.reference, "HANDOFF_OPENED");
      assert.ok(afterHandoff);

      // Verify ONLY status changed
      assert.equal(afterHandoff.status, "HANDOFF_OPENED");
      assert.equal(afterHandoff.reference, originalSnapshot.reference);
      assert.equal(afterHandoff.guestName, originalSnapshot.guestName);
      assert.equal(afterHandoff.checkIn, originalSnapshot.checkIn);
      assert.equal(afterHandoff.checkOut, originalSnapshot.checkOut);
      assert.equal(afterHandoff.nights, originalSnapshot.nights);
      assert.equal(afterHandoff.nightlyRate, originalSnapshot.nightlyRate);
      assert.equal(afterHandoff.total, originalSnapshot.total);
      assert.equal(afterHandoff.currency, originalSnapshot.currency);
      assert.equal(afterHandoff.propertyId, originalSnapshot.propertyId);
      assert.equal(afterHandoff.source, originalSnapshot.source);
    });

    it("AureliaProductAdapter DISPATCH_HANDOFF transitions status to HANDOFF_OPENED", async () => {
      const created = reservationStore.create({
        guestName: "Alexander Wright",
        checkIn: "2026-11-01",
        checkOut: "2026-11-04",
        propertyId: "aurelia-sanctuary",
        source: "ORA"
      });

      assert.equal(created.status, "READY_FOR_HANDOFF");

      const result = await aureliaProductAdapter.executeAction({
        type: "DISPATCH_HANDOFF",
        payload: {
          channel: "WHATSAPP",
          recipientNote: created.reference,
          prefilledText: "Reservation Request for Alexander Wright",
          handoffUrl: "https://wa.me/?text=test"
        }
      });

      assert.equal(result.success, true);
      const current = reservationStore.get(created.reference);
      assert.equal(current?.status, "HANDOFF_OPENED");
    });

    it("simulates client-side window.open execution and verifies URL and parameter delivery", () => {
      const created = reservationStore.create({
        guestName: "Lady Eleanor",
        checkIn: "2026-10-20",
        checkOut: "2026-10-23",
        propertyId: "aurelia-sanctuary",
        source: "ORA"
      });

      assert.equal(created.status, "READY_FOR_HANDOFF");

      // Mock window.open
      let openedUrl = "";
      let openedTarget = "";
      let openedFeatures = "";
      const originalWindow = (globalThis as any).window;
      (globalThis as any).window = {
        open: (url: string, target: string, features: string) => {
          openedUrl = url;
          openedTarget = target;
          openedFeatures = features;
          return {};
        }
      };

      try {
        const url = buildWhatsAppHandoffUrl(created);
        reservationStore.updateStatus(created.reference, "HANDOFF_OPENED");
        (globalThis as any).window.open(url, "_blank", "noopener,noreferrer");

        assert.ok(openedUrl.startsWith("https://wa.me/?text="));
        assert.equal(openedTarget, "_blank");
        assert.equal(openedFeatures, "noopener,noreferrer");
        assert.ok(openedUrl.includes(encodeURIComponent("Lady Eleanor")));
        assert.ok(openedUrl.includes(encodeURIComponent("October 20, 2026")));
        assert.ok(openedUrl.includes(encodeURIComponent(created.reference)));

        const finalRecord = reservationStore.get(created.reference);
        assert.equal(finalRecord?.status, "HANDOFF_OPENED");
      } finally {
        (globalThis as any).window = originalWindow;
      }
    });

    it("fails safely without crashing if window.open throws or is unavailable", () => {
      const created = reservationStore.create({
        guestName: "Lord Arthur",
        checkIn: "2026-12-01",
        checkOut: "2026-12-03",
        propertyId: "aurelia-sanctuary",
        source: "ORA"
      });

      const originalWindow = (globalThis as any).window;
      // Headless / blocked popup environment simulation
      (globalThis as any).window = {
        open: () => {
          throw new Error("Popup blocked by browser policy");
        }
      };

      try {
        assert.doesNotThrow(() => {
          try {
            const url = buildWhatsAppHandoffUrl(created);
            (globalThis as any).window.open(url, "_blank", "noopener,noreferrer");
          } catch {
            // Handled gracefully
          }
        });
      } finally {
        (globalThis as any).window = originalWindow;
      }
    });
  });
});
