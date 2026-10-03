---
doc: prd
status: approved
---

# Product Requirements Document — ORA & AURELIA

**Document Purpose:** Defines the product experience, journey, technical functional requirements, and strict proof-of-concept boundaries for **ORA** as demonstrated through the **AURELIA Sanctuary** luxury shortlet reference implementation.

---

## 1. Executive Summary

ORA is an embodied voice and spatial intelligence layer that makes visual digital products conversationally controllable. Instead of detached floating chatbots or static search forms, ORA directs viewport cameras, crossfades lighting ambiances, controls audio environments, and executes verified commerce actions in real time.

**AURELIA Sanctuary** is the reference implementation: a secluded private shortlet residence perched on a highland desert canyon. Guests reserve the **entire private residence**, exploring 8 architectural spaces and booking complete estate stays through spoken dialogue.

---

## 2. Product Identity & Domain Truth

| Entity | Role | Definition |
| :--- | :--- | :--- |
| **ORA** | **Product / Intelligence Layer** | Reusable, domain-agnostic conversational agent managing audio streaming, intent reasoning, barge-in, and action dispatching. |
| **AURELIA** | **Reference Environment** | Modernist architectural luxury shortlet / private residence demonstrating ORA's spatial and transaction capabilities. |

### Domain Language Boundaries (No Hotel Concepts)
* **Entire Residence Buyout:** Guests reserve the entire private estate, not individual hotel rooms.
* **Spaces within the Property:** The 8 navigable locations (`exterior`, `entrance`, `living_room`, `kitchen`, `hallway`, `master_bedroom`, `ensuite_bathroom`, `infinity_pool`) represent architectural areas of the single residence.
* **Reservation Request:** ORA prepares a structured, verified Reservation Request for external handoff. It does not fabricate confirmed room bookings or pretend card payments took place.

---

## 3. User Personas

### 1. The Experiential Luxury Traveler (Primary User)
* **Goal:** Understand architectural feel, views, and spatial layout of Aurelia Sanctuary before reserving a private stay.
* **Behavior:** Prefers natural spoken interaction ("Show me the pool at sunset", "Reserve Aurelia for John from October 9th to October 11th") over clicking menus.
* **Expectation:** Fast, authoritative visual responses with immediate barge-in control and itemized pricing transparency.

### 2. The Host / Estate Operator (Business Stakeholder)
* **Goal:** Convert digital visitors into qualified reservation inquiries without losing high-net-worth leads to friction-heavy checkout forms.
* **Expectation:** Receives qualified, prefilled reservation request summaries ready for mobile messaging communication (WhatsApp).

---

## 4. Product Principles

1. **Spatial Embodiment over Chat Bubbles:** The application viewport, camera angle, and visual state are ORA's primary outputs.
2. **Audio Truth & Serenity:** The ambient soundscape breathes with speech; music ducks during dialogue turns and restores seamlessly.
3. **No Hallucinated Commerce:** Pricing, stay duration, and reference codes are computed by authoritative domain logic, never invented by the LLM.
4. **Transparent Request Lifecycle:** State transitions truthfully from `DRAFT` to `READY_FOR_HANDOFF`, explicitly communicating that a reservation request has been prepared.

---

## 5. Core Customer Journey

$$\text{SPEAK} \longrightarrow \text{UNDERSTAND} \longrightarrow \text{EXPLORE} \longrightarrow \text{DECIDE} \longrightarrow \text{RESERVE} \longrightarrow \text{HANDOFF}$$

1. **SPEAK:** The guest speaks naturally into the continuous microphone stream.
2. **UNDERSTAND:** ORA captures 16kHz PCM audio, streams to AssemblyAI v3, and extracts multi-turn spatial and business parameters.
3. **EXPLORE:** The Product Adapter navigates the viewport: the 300-frame canvas smoothly scrubs to the target space, detail cards center, and lighting crossfades.
4. **DECIDE:** The guest inspects features, takes an autonomous guided Grand Tour, and verifies details through spoken dialogue.
5. **RESERVE (Phase 3 Completed):** The guest states *"Ora, I’d like to reserve AURELIA for John from October 9th to October 11th"*. ORA validates dates, calculates 2 nights, computes $3,700 total, generates a verified reference (`AUR-YYYY-XXXX`), and presents the digital Reservation Pass in `READY_FOR_HANDOFF` status.
6. **HANDOFF (Phase 4 Completed):** The guest clicks **"Continue on WhatsApp"**, opening a genuine prefilled `https://wa.me/?text=...` URI delivering the reservation request to mobile messaging, transitioning the status to `HANDOFF_OPENED`.

---

## 6. Functional Requirements & Implementation Status

| ID | Requirement | Classification | Implementation Status |
| :--- | :--- | :--- | :--- |
| **FR-01** | **300-Frame Canvas Scrubber:** Hardware-accelerated 2D canvas with 900 photographic frames across 3 ambiance tracks (`day`, `sunset`, `night`). | AURELIA UI | **VERIFIED WORKING** |
| **FR-02** | **8 Architectural Spaces:** Catalog modeling `exterior`, `entrance`, `living_room`, `kitchen`, `hallway`, `master_bedroom`, `ensuite_bathroom`, `infinity_pool`. | AURELIA Domain | **VERIFIED WORKING** |
| **FR-03** | **Continuous Voice Streaming:** Real-time 16kHz PCM audio streaming via AssemblyAI Universal Streaming v3 WebSocket. | ORA Core | **VERIFIED WORKING** |
| **FR-04** | **Speech Synthesis (TTS):** Serene concierge voice synthesis with calm British cadence via Web Speech API. | ORA Core | **VERIFIED WORKING** |
| **FR-05** | **Instant Barge-In:** Immediate speech and tour cancellation when the guest begins speaking. | ORA Core | **VERIFIED WORKING** |
| **FR-06** | **Acoustic Ducking:** WebAudio coordinator automatically quieting background soundscape during voice turns. | ORA Core / Aurelia | **VERIFIED WORKING** |
| **FR-07** | **Sub-Millisecond Fast-Path Router:** Instant regex/keyword routing (<1ms) for common spatial commands. | ORA Core | **VERIFIED WORKING** |
| **FR-08** | **Dual LLM Conversational Engine:** Multi-turn intent reasoning supporting local Ollama and OpenRouter. | ORA Core | **VERIFIED WORKING** |
| **FR-09** | **Autonomous Grand Tour:** Sequenced 8-space guided tour with voice narration at ~2.4s intervals. | ORA Core / Aurelia | **VERIFIED WORKING** |
| **FR-10** | **Product Adapter Boundary:** Formal TypeScript contract decoupling ORA from Aurelia-specific space names. | Architecture | **VERIFIED WORKING (PHASE 2)** |
| **FR-11** | **Reservation Request Action:** Parsing stay duration and guest name to calculate total pricing ($1,850/night). | ORA Commerce | **VERIFIED WORKING (PHASE 3)** |
| **FR-12** | **Session Reservation Store:** Storing verified reservation records with `AUR-YYYY-XXXX` IDs in session memory & `sessionStorage`. | AURELIA Domain | **VERIFIED WORKING (PHASE 3)** |
| **FR-13** | **Visual Reservation Pass:** Glassmorphic modal displaying verified reservation credential in `READY_FOR_HANDOFF` status. | AURELIA UI | **VERIFIED WORKING (PHASE 3)** |
| **FR-14** | **WhatsApp Browser Handoff:** Verified `https://wa.me/?text=...` deep link prefilled with itemized reservation request via "Continue on WhatsApp". | ORA Commerce | **VERIFIED WORKING (PHASE 4)** |

---

## 7. Reservation State Lifecycle

```text
DRAFT
  ↓ (Guest name + valid checkIn + checkOut provided)
READY_FOR_HANDOFF
  ↓ (Guest activates "Continue on WhatsApp" CTA)
HANDOFF_OPENED
```

* **`DRAFT`:** The user expressed reservation intent, but one or more required fields (guest name, check-in, check-out) are missing. ORA naturally asks for the missing information.
* **`READY_FOR_HANDOFF`:** Application has verified checkOut > checkIn, calculated nights, computed total ($1,850 × nights), assigned an authentic `AUR-YYYY-XXXX` reference, and displayed the Reservation Pass with the primary "Continue on WhatsApp" CTA.
* **`HANDOFF_OPENED`:** The user has clicked to open the external handoff channel.

---

## 8. AI Guardrails & Truthfulness Constraints

1. **NEVER Claim a Reservation is Confirmed:** ORA explicitly states *"I’ve prepared your reservation request for Aurelia"*, never *"Your booking is confirmed"* or *"Payment received"*.
2. **NEVER Invent Pricing:** All calculations follow `total = nightlyRate ($1,850) × nights`.
3. **NEVER Guess Dates from Vague Phrases:** Queries such as *"Book it for next weekend"* produce a request for explicit calendar dates rather than silently inventing dates.
4. **NEVER Claim Automated WhatsApp Delivery:** The handoff is strictly an authentic browser link (`wa.me`) opened by the user.
