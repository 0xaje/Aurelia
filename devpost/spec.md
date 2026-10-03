---
doc: spec
status: approved
---

# Technical Specification — ORA & AURELIA

> **Canonical Technical Blueprint.**  
> Specifies the implemented architecture, domain models, runtime components, and data flows for **ORA** and the **AURELIA Sanctuary** luxury shortlet reference implementation.

---

## 1. System Architecture Overview

ORA operates on a dual-plane architecture:
1. **Interactive Presentation & Spatial Plane (Browser Client):** Renders the hardware-accelerated 300-frame canvas scrubber, spatial detail panels, ambient WebAudio soundscape, microphone capture worklet, Web Speech synthesis, and the glassmorphic Reservation Pass.
2. **Conversational Intelligence & Action Plane (Hybrid Client/Server):** Real-time streaming STT over WebSocket to AssemblyAI v3, sub-millisecond fast-path intent routing, session-backed reservation storage, and server-side LLM completion (Ollama / OpenRouter) generating structured action envelopes.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                            BROWSER RUNTIME CLIENT                            │
│                                                                              │
│  ┌───────────────────────┐   Spatial Action   ┌───────────────────────────┐  │
│  │     ScrollHero        │◄───────────────────┤      AureliaAdapter       │  │
│  │ (300-Frame 2D Canvas) │   Ambiance Action  │ (Implements ProductAdapter│  │
│  └───────────────────────┘                    └─────────────▲─────────────┘  │
│                                                             │ Typed Actions  │
│  ┌───────────────────────┐                    ┌─────────────┴─────────────┐  │
│  │      SpaceDetail      │◄───────────────────┤         ORA CORE          │  │
│  │ (Master/Bath/Pool)    │   Center Space     │ • Session / Turn Manager  │  │
│  └───────────────────────┘                    │ • Speech Synthesis (TTS)  │  │
│                                               │ • Audio Duck Coordinator  │  │
│  ┌───────────────────────┐   Audio Duck       │ • Fast-Path Router (<1ms) │  │
│  │   AureliaAtmosphere   │◄───────────────────┤ • Action Bus Dispatcher   │  │
│  │ (WebAudio Soundscape) │                    └─────────────▲─────────────┘  │
│  └───────────────────────┘                                  │ Audio / Turns  │
│                                                             │                │
│  ┌──────────────────────────────────────────────────────────┴─────────────┐  │
│  │                               OraPresence                              │  │
│  │    • Mic Worklet (16kHz PCM16 Mono)                                    │  │
│  │    • AssemblyAI v3 Streaming Client (wss://streaming.assemblyai.com)   │  │
│  │    • Autonomous Grand Tour Sequencer                                   │  │
│  └──────────────────────────────────────────────────────────┬─────────────┘  │
│                                                             │                │
│  ┌──────────────────────────────────────────────────────────┴─────────────┐  │
│  │                 ReservationPass Modal (Phase 3 & 4)                    │  │
│  │    • Displays Reference (AUR-YYYY-XXXX), Dates, Nights, Rate, Total    │  │
│  │    • Primary CTA: "Continue on WhatsApp" -> wa.me deep link            │  │
│  │    • Subscribed to session ReservationStore (HANDOFF_OPENED)           │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┼────────────────┘
                                                              │
                              ┌───────────────────────────────┴───────────────┐
                              ▼ (HTTP Token & Converse)                       ▼ (Binary WS)
┌───────────────────────────────────────────────┐   ┌──────────────────────────────────────────┐
│              LOCAL SERVER API                 │   │       ASSEMBLYAI STREAMING STT v3        │
│  • GET  /api/assemblyai/token (Ephemeral JWT) │   │     wss://streaming.assemblyai.com/v3/ws │
│  • POST /api/ora/converse                     │   └──────────────────────────────────────────┘
│    └─ Structured LLM (Ollama / OpenRouter)    │
│    └─ Sanitization & Guardrails               │
└───────────────────────────────────────────────┘
```

---

## 2. Reservation Domain Model & State Lifecycle (Phase 3)

### Data Model Contract (`src/domain/reservationTypes.ts`):
```typescript
export type ReservationStatus = "DRAFT" | "READY_FOR_HANDOFF" | "HANDOFF_OPENED";

export interface ReservationRequest {
  reference: string;          // e.g. "AUR-2026-4821"
  status: ReservationStatus;  // "DRAFT" | "READY_FOR_HANDOFF" | "HANDOFF_OPENED"
  propertyId: string;         // "aurelia-sanctuary"
  guestName: string;          // e.g. "John"
  checkIn: string;            // "2026-10-09" (YYYY-MM-DD)
  checkOut: string;           // "2026-10-11" (YYYY-MM-DD)
  nights: number;             // 2
  nightlyRate: number;        // 1850 (USD)
  currency: string;           // "USD"
  total: number;              // 3700 (USD)
  createdAt: string;          // ISO timestamp
  source: "ORA";
}
```

### Deterministic Pricing & Night Calculation (`src/domain/reservationLogic.ts`):
* Stay duration: `nights = (checkOutTimestamp - checkInTimestamp) / (1000 * 60 * 60 * 24)`
* Rate configuration: $1,850 USD / night (defined in `src/domain/reservationConfig.ts`).
* Total calculation: `total = nightlyRate * nights` (e.g. 2 nights × $1,850 = $3,700 USD).
* Reference generation: `AUR-${year}-${random4Digits}` using dynamic current year with active session collision checks.

### Session Persistence (`src/domain/reservationStore.ts`):
* In-memory `Map<string, ReservationRequest>` backed by browser `sessionStorage` for refresh continuity.
* Zero external databases (no SQL, Postgres, SQLite, Prisma, or Supabase).
* Reactive subscriber pattern notifying React components (`App.tsx`) when reservations change.

---

## 3. Product Adapter Contract (`src/ora/productAdapter.ts`)

```typescript
export interface ProductAdapter {
  getContext(): ProductContext;
  resolveFastPathIntent?(utterance: string, context?: OraConversationContext): OraDecision | null;
  navigateToEntity(entityId: string): Promise<ProductActionResult>;
  setAmbiance?(ambianceId: string): Promise<ProductActionResult>;
  startTour?(): Promise<ProductActionResult>;
  executeAction?(action: OraAction): Promise<ProductActionResult>;
}
```

### Generic Action Envelopes (`OraAction`):
```typescript
export type OraAction =
  | { type: "NAVIGATE"; payload: { targetId: string } }
  | { type: "SET_AMBIANCE"; payload: { mode: string } }
  | { type: "START_TOUR"; payload?: Record<string, never> }
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
```

---

## 4. End-to-End Reservation Execution Flow

```text
Visitor Speaks: "Ora, I’d like to reserve AURELIA for John from October 9th to October 11th."
  │
  ▼
1. Audio Stream & STT: AssemblyAI v3 transcribes audio in real time.
  │
  ▼
2. Fast-Path Extractor: extracts guest "John", checkIn "2026-10-09", checkOut "2026-10-11".
  │
  ▼
3. OraDecision Emitted: INITIATE_TRANSACTION with extracted details.
  │
  ▼
4. Adapter Execution: AureliaProductAdapter.executeAction(action) calls reservationStore.create(...).
  │
  ▼
5. Domain Logic: Validates checkOut > checkIn, calculates 2 nights, total = $3,700, generates AUR-YYYY-XXXX.
  │
  ▼
6. State Updated: Status set to READY_FOR_HANDOFF, saved to sessionStorage, subscribers notified.
  │
  ▼
7. UI & Vocalization:
     - ReservationPass modal displays on screen with itemized reservation request details and "Continue on WhatsApp" CTA.
     - Speech synthesis states: "I’ve prepared your reservation request for Aurelia."
  │
  ▼
8. WhatsApp Handoff (Phase 4):
     - Guest activates "Continue on WhatsApp" CTA.
     - System constructs valid URL-encoded `https://wa.me/?text=...` deep link containing dynamic reservation parameters.
     - Store transitions status from `READY_FOR_HANDOFF` to `HANDOFF_OPENED`.
     - Browser opens deep link in new tab without external API overhead.
```

---

## 5. Explicit Limitations & Out-of-Scope Items

* **Live Availability Engines:** Calendar availability is handled truthfully without mocking real-time PMS or channel managers.
* **Credit Card Payment Gateways:** No Stripe or Paystack processing; transaction scope concludes at verified request and handoff.
* **WhatsApp Cloud API:** Handoff is achieved through verified `https://wa.me/?text=...` browser links, not external API bots.
* **Database Infrastructure:** Zero SQL databases or backend server accounts.
