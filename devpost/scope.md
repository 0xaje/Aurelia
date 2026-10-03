---
doc: scope
status: approved
---

# ORA (with AURELIA Luxury Shortlet Reference Environment)

**Ora lets products become conversationally controllable.**

ORA is a reusable conversational intelligence and action layer that allows high-value visual products to be explored, controlled, and transacted through natural voice and direct manipulation.

**AURELIA** is the current reference implementation: a luxury architectural shortlet / private residence ("Aurelia Sanctuary") through which ORA demonstrates spatial control, environmental immersion, and verified transaction initiation.

---

## 1. The Unique Kernel

Instead of a floating text chatbot in a corner widget or a blind voice assistant with no visual grounding, ORA **embodies the product surface**. The application viewport, camera angle, visual focus, lighting ambiance, and soundscape dynamically respond in real time to natural spoken dialogue, closing the loop with a verified reservation request and mobile WhatsApp handoff.

---

## 2. Who It's For

* **The Guest / Buyer:** An experiential client (e.g. planning a private retreat or luxury shortlet stay) who discovers and decides through natural human conversation ("show me the infinity pool at sunset", "give me a full tour", "reserve Aurelia for John from October 9th to October 11th") rather than clicking complex filter dropdowns, thumbnail carousels, and forms.
* **The Business:** Luxury shortlets, private estates, high-end real estate, automotive showrooms, and bespoke retail seeking an autonomous spatial sales agent that guides customers and delivers qualified, itemized transaction handoffs.

---

## 3. The Core Product Distinction

### ORA (The Reusable Product Layer)
* Continuous hands-free voice input and streaming STT (AssemblyAI v3).
* Serene concierge vocalization and instant sub-second barge-in (interruption).
* Multi-turn conversational reasoning, context memory, and fast-path intent routing (<1ms).
* Domain-agnostic Action Bus dispatching typed envelopes (`NAVIGATE`, `SET_AMBIANCE`, `START_TOUR`, `INITIATE_TRANSACTION`, `DISPATCH_HANDOFF`).
* Audio ducking coordinator (quieting background soundscapes during speech turns).
* Structured transaction intent extractor (identifying guest name and stay dates).

### AURELIA (The Reference Implementation)
* A private modernist desert shortlet residence ("Aurelia Sanctuary") with 8 architectural spaces.
* 300-frame photographic canvas scrubber with programmatic camera timeline tweening.
* 3 authentic lighting and ambiance passes (`day`, `sunset`, `night`).
* Spatial discovery panels for detail sanctuaries (Master Bedroom, Ensuite Spa, Infinity Pool).
* Authoritative domain pricing model ($1,850/night shortlet buyout rate).
* Session reservation store and glassmorphic Reservation Pass UI.

---

## 4. The Core Customer Journey

$$\text{SPEAK} \longrightarrow \text{UNDERSTAND} \longrightarrow \text{EXPLORE} \longrightarrow \text{DECIDE} \longrightarrow \text{RESERVE} \longrightarrow \text{HANDOFF}$$

1. **SPEAK:** The guest speaks naturally into the continuous microphone stream.
2. **UNDERSTAND:** ORA transcribes audio in real time, maintains multi-turn context, and parses spatial/transactional intent.
3. **EXPLORE:** The Product Adapter directs the viewport: the 300-frame canvas smoothly navigates to the target space, detail cards center into view, or the ambiance crossfades.
4. **DECIDE:** The guest examines features and asks questions, supported by an autonomous guided Grand Tour and instant barge-in.
5. **RESERVE (Phase 3 Completed):** The guest states *"Ora, I’d like to reserve AURELIA for John from October 9th to October 11th"*. ORA extracts guest name and dates, calculates 2 nights, computes $3,700 total, generates a verified reference (`AUR-YYYY-XXXX`), and presents the digital Reservation Pass in `READY_FOR_HANDOFF` status.
6. **HANDOFF (Phase 4 Completed):** The guest clicks **"Continue on WhatsApp"**, opening a genuine prefilled `https://wa.me/?text=...` browser deep link delivering the reservation request to mobile messaging, transitioning the state to `HANDOFF_OPENED`.

---

## 5. Reservation Architecture & State Lifecycle

```text
DRAFT
  ↓ (Guest name + valid stay dates provided)
READY_FOR_HANDOFF
  ↓ (User clicks "Continue on WhatsApp")
HANDOFF_OPENED
```

* **`DRAFT`:** Reservation intent expressed, but required fields (guest name or calendar dates) are pending.
* **`READY_FOR_HANDOFF`:** Application has validated stay dates, calculated nights and total stay price, generated an authentic `AUR-YYYY-XXXX` reference, and displayed the Reservation Pass with the "Continue on WhatsApp" action.
* **`HANDOFF_OPENED`:** The user has clicked the external messaging handoff link.

**Truthful Boundary:** ORA prepares a verified **Reservation Request**. It does not pretend to be a confirmed hotel booking or instant card charge.

---

## 6. Proof-of-Concept Boundary

### Currently Implemented & Verified:
* **8 Architectural Spaces:** `exterior`, `entrance`, `living_room`, `kitchen`, `hallway`, `master_bedroom`, `ensuite_bathroom`, `infinity_pool`.
* **300-Frame Canvas Engine:** Hardware-accelerated 2D canvas scrubber with 900 physical JPEG frames across `day`, `sunset`, and `night`.
* **Acoustic Atmosphere:** Real-time WebAudio soundscape with automated volume ducking during speech turns.
* **Continuous Hands-Free Voice:** AssemblyAI v3 streaming WebSocket with ephemeral token minting.
* **Instant Barge-In:** Immediate speech synthesis and tour cancellation when the guest speaks.
* **ProductAdapter Boundary:** Formal TypeScript contract decoupling ORA Core from Aurelia's visual and spatial implementation.
* **Real Shortlet Reservation Flow (Phase 3):** Deterministic date calculation, pricing engine ($1,850/night × nights), dynamic reference generation (`AUR-YYYY-XXXX`), session persistence (`sessionStorage`), and glassmorphic Reservation Pass UI.
* **WhatsApp Deep Link Handoff (Phase 4):** Verified client-side WhatsApp browser deep link handoff (`https://wa.me/?text=...`) on the Reservation Pass via "Continue on WhatsApp", transitioning status to `HANDOFF_OPENED`.

### Planned Next Implementation:
* **Phase 5:** Dead code pruning and final submission assets.

### Explicitly Excluded (Out of Scope):
* **Live Credit Card Payment Gateways (Stripe/Paystack):** Webhook latency and live card handling distract from the conversational UI thesis.
* **External WhatsApp Business Cloud API / Twilio:** Adds backend server complexity without improving the customer handoff proof; browser `wa.me` deep link truthfully delivers the reservation request.
* **Production SQL / Postgres Infrastructure:** Single-property proof of concept uses in-memory session persistence backed by `sessionStorage`.
* **Hotel Inventory / Room Booking Systems:** Aurelia is a private residence shortlet estate, not a hotel with individual room allocation.
* **Live Availability Engines:** Calendar availability is represented truthfully for demo dates without mocking external PMS integration.
* **User Accounts / Passwords:** Session-level guest identification is sufficient.
