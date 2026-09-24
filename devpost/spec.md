---
doc: spec
status: approved
---

# AURELIA — Technical Specification (Verified Architecture)

> **Canonical Technical Blueprint for Implementation.**  
> Implements all requirements and behaviors defined in [devpost/prd.md](file:///home/oyeolorun/Aurelia/devpost/prd.md) and [devpost/scope.md](file:///home/oyeolorun/Aurelia/devpost/scope.md).

---

## 1. Technical Architecture Overview

AURELIA operates as a synchronized dual-plane architecture:
1. **Deterministic Business & Presentation Plane:** A single-page client and lightweight local server governing room catalog data, atomic booking persistence, state machine transitions, and hardware-accelerated CSS rendering.
2. **Realtime Conversational Agent Plane:** A single WebSocket connection directly between the browser and AssemblyAI’s Voice Agent API (`wss://agents.assemblyai.com/v1/ws`) authenticated via a server-minted ephemeral token.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                             BROWSER RUNTIME CLIENT                           │
│                                                                              │
│   ┌─────────────────────┐               ┌────────────────────────────────┐   │
│   │ Audio Controller    │               │      Cinematic Stage           │   │
│   │ (Mic In / Spkr Out) │               │    (Full-bleed Canvas & HUD)   │   │
│   └──────────┬──────────┘               └───────────────▲────────────────┘   │
│              │ (PCM 24kHz / Speaker)                    │                    │
│              │                                          │ (8 Active States)  │
│              ▼                                          │                    │
│   ┌─────────────────────┐   Typed Action Bus   ┌────────┴────────────────┐   │
│   │ Voice Agent Client  ├─────────────────────>│ Deterministic State     │   │
│   │ (AssemblyAI WS)     │   (Strict Schemas)   │ Machine (FSM)           │   │
│   └──────────┬──────────┘                      └────────┬────────────────┘   │
└──────────────┼──────────────────────────────────────────┼────────────────────┘
               │ (Direct WS via Token)                    │ (Local REST / Tools)
               ▼                                          ▼
┌──────────────────────────────┐         ┌─────────────────────────────────┐
│  ASSEMBLYAI VOICE AGENT API  │         │     AURELIA BACKEND SERVICE     │
│  wss://agents.assemblyai...  │         │     (Node.js / Express Server)  │
│                              │         │                                 │
│  • Neural Turn Detection     │         │  • Ephemeral Token Generator    │
│  • Streaming STT & TTS (Ivy) │         │  • Deterministic Room Catalog   │
│  • Tool Call Protocol        │         │  • Serialized Booking Store     │
│  • Integrated Barge-in       │         │  • Demonstration Key Generator  │
└──────────────────────────────┘         └─────────────────────────────────┘
```

---

## 2. Runtime Components

1. **Client Application (`localhost:5173`):**
   - Single Page Application built with **Vite + React 18 + TypeScript**.
   - Pure **Vanilla CSS** utilizing design tokens (zero heavy CSS framework overhead).
   - Manages audio streaming, AssemblyAI WebSocket session, typed action bus, and the 8-state FSM.
2. **Backend Service (`localhost:3001`):**
   - Single **Node.js + Express** HTTP process.
   - Provides ephemeral token minting for AssemblyAI, authoritative catalog queries, and mutex-serialized booking persistence.
3. **External Realtime Agent Service:**
   - **AssemblyAI Voice Agent API** (`wss://agents.assemblyai.com/v1/ws`).

---

## 3. Frontend Architecture & The AI → UI Action Boundary

### The Ironclad Boundary: No Arbitrary Control
The LLM has **zero** access to the DOM (`document`, `window`), zero style/CSS manipulation abilities, and zero arbitrary JavaScript execution rights.

When the AI determines a user intent, it can *only* emit a structured tool call. The client-side WebSocket manager intercepts this event, validates arguments against a strict Zod schema, and emits a strongly typed `UIAction` onto the local event bus:

```text
Voice/Text Input 
       │
       ▼
AssemblyAI Tool Call: { name: "search_rooms" | "adjust_view" | "create_booking", arguments: { ... } }
       │
       ▼
Client Validation (Zod Schema) — Invalid payloads rejected immediately
       │
       ▼
Typed UI Action Bus (Dispatches exact typed envelope)
       │
       ▼
Deterministic Finite State Machine (Validates transition; ignores illegal jumps)
       │
       ▼
React Component Rendering & Hardware-Accelerated CSS Transitions
```

### Typed UI Action Envelopes:
```typescript
export type UIAction =
  | { type: "FOCUS_ROOM"; payload: { roomId: "deluxe" | "executive-suite" | "presidential-suite" } }
  | { type: "SHOW_FEATURE"; payload: { roomId: string; feature: "overview" | "bathroom" | "balcony" } }
  | { type: "CHANGE_AMBIANCE"; payload: { mode: "day" | "night" } }
  | { type: "SHOW_BOOKING_SUMMARY"; payload: { bookingId: string } }
  | { type: "REVEAL_KEY"; payload: { booking: Booking } }
  | { type: "DISPLAY_NOTIFICATION"; payload: { message: string; level: "info" | "error" } };
```

---

## 4. Backend Architecture & Persistence Strategy

### Persistence: Mutex-Serialized JSON Store
* **Why SQL/Postgres/SQLite are Rejected:**
  - For 3 static rooms and a hackathon demonstration of booking creation, SQL introduces native C++ compilation risks (`better-sqlite3`), database migrations, and connection lifecycles with zero product upside.
* **How Read-Modify-Write is Serialized:**
  - While `fs/promises.writeFile` writes data, asynchronous interleaving of `readFile` → mutate → `writeFile` can cause lost updates if two requests occur concurrently.
  - AURELIA implements a strict in-memory **Promise Queue Mutex** on the backend:
    ```typescript
    let writeQueue = Promise.resolve();

    export function persistBookingSerialized(newBooking: Booking): Promise<void> {
      return new Promise((resolve, reject) => {
        writeQueue = writeQueue.then(async () => {
          try {
            const raw = await fs.readFile(BOOKINGS_FILE, "utf-8");
            const bookings: Booking[] = JSON.parse(raw);
            bookings.push(newBooking);
            
            // Atomic write via temp file + rename to prevent corrupted partial reads
            const tempFile = `${BOOKINGS_FILE}.tmp.${Date.now()}`;
            await fs.writeFile(tempFile, JSON.stringify(bookings, null, 2), "utf-8");
            await fs.rename(tempFile, BOOKINGS_FILE);
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    }
    ```
  - Guarantees 100% atomic, crash-resilient, serialized persistence across reloads.

---

## 5. Data Model & Truth Boundaries

### Strict Authoritative Truth Boundaries:
1. **Server Inventory Authority:** The server is the sole source of truth for rooms, nightly rates, capacity, and amenities (`data/rooms.json`).
2. **Server Room Validation:** The server strictly validates `room_id`. If an invalid ID is provided, the booking is rejected.
3. **Server ID & Credential Generation:** The server creates the booking ID (`AUR-YYYY-[4-hex]`) and demonstration credential token (`key_live_[12-hex]`).
4. **Zero Model Hallucination:** The AI model never manufactures availability, prices, booking IDs, or keys.
5. **Key Issuance Invariant:** `KEY_ISSUED` state can **only** occur after a successful, verified booking returned by the backend.

### Schemas (`data/rooms.json` & `data/bookings.json`)
```typescript
export interface Room {
  id: "deluxe" | "executive-suite" | "presidential-suite";
  name: string;
  room_number: string;
  price_per_night: number; // in NGN
  currency: "NGN";
  capacity: number;
  features: string[];
  has_balcony: boolean;
  has_bathtub: boolean;
  quiet_tier: "Standard" | "High" | "Maximum";
  description: string;
  media: {
    day_overview: string;
    night_overview: string;
    bathroom_detail: string;
    balcony_detail?: string;
  };
}

export interface Booking {
  booking_id: string; // e.g. "AUR-2026-8842"
  room_id: "deluxe" | "executive-suite" | "presidential-suite";
  room_name: string;
  room_number: string;
  guest_name: string;
  nights: number;
  price_per_night: number;
  total_price: number;
  currency: "NGN";
  status: "CONFIRMED";
  created_at: string; // ISO 8601
  access_credential: {
    token: string; // e.g. "key_live_98a7f01c4e2b"
    issued_at: string;
    disclaimer: "Demonstration Stay Credential • Non-physical lock credential";
  };
}
```

---

## 6. AssemblyAI Voice Agent Integration Protocol (Verified Official API)

All parameters, endpoints, and event structures verified against official documentation:

### A. Authentication & Ephemeral Tokens
1. **Backend Token Generation:**
   - Endpoint: `GET https://agents.assemblyai.com/v1/token`
   - Headers: `Authorization: Bearer process.env.ASSEMBLYAI_API_KEY`
   - Request Query / Payload: `expires_in_seconds=300` (valid for 5 minutes)
   - Response: `{ "token": "temp_tok_abc123...", "expires_in_seconds": 300 }`
2. **Client WebSocket Connection:**
   - Endpoint: `wss://agents.assemblyai.com/v1/ws?token=temp_tok_abc123...`

### B. Session Handshake (`session.update`)
Immediately after socket `open`, client transmits configuration:
```json
{
  "type": "session.update",
  "session": {
    "system_prompt": "You are Aurelia, the elegant voice of Aurelia Luxury Hotel. Factual truth is absolute: Deluxe (₦85,000), Executive Suite (₦145,000), Presidential Suite (₦280,000). Always speak currency as Nigerian Naira or Naira. Keep spoken responses under 2 sentences. Use search_rooms for guest preferences. Use adjust_view when guest asks to see features or night ambiance. Use create_booking when guest confirms reservation. Digital keys are issued automatically upon booking.",
    "output": {
      "voice": "ivy"
    },
    "tools": [
      {
        "type": "function",
        "name": "search_rooms",
        "description": "Search rooms matching budget and amenity criteria.",
        "parameters": {
          "type": "object",
          "properties": {
            "max_price_ngn": { "type": "number", "description": "Maximum budget in Naira" },
            "required_balcony": { "type": "boolean" },
            "required_bathtub": { "type": "boolean" }
          }
        }
      },
      {
        "type": "function",
        "name": "adjust_view",
        "description": "Visually inspect room feature or switch between day and night ambiance.",
        "parameters": {
          "type": "object",
          "properties": {
            "feature": { "type": "string", "enum": ["overview", "bathroom", "balcony"] },
            "ambiance": { "type": "string", "enum": ["day", "night"] }
          }
        }
      },
      {
        "type": "function",
        "name": "create_booking",
        "description": "Create an immutable hotel reservation for the guest.",
        "parameters": {
          "type": "object",
          "properties": {
            "room_id": { "type": "string", "enum": ["deluxe", "executive-suite", "presidential-suite"] },
            "guest_name": { "type": "string", "description": "Guest name" },
            "nights": { "type": "number", "default": 1 }
          },
          "required": ["room_id", "guest_name"]
        }
      }
    ]
  }
}
```

### C. Tool-Call Request & Response Protocol
1. **Server Event:**
   ```json
   {
     "type": "tool.call",
     "call_id": "call_987654",
     "name": "search_rooms",
     "arguments": { "max_price_ngn": 150000, "required_balcony": true }
   }
   ```
2. **Turn Synchronization:** Client awaits `reply.done` event for the corresponding turn before returning tool results.
3. **Client Result Event:**
   ```json
   {
     "type": "tool.result",
     "call_id": "call_987654",
     "result": "{\"matches\":[{\"id\":\"executive-suite\",\"name\":\"Executive Suite\",\"price_per_night\":145000}]}"
   }
   ```

### D. Audio & Interruption (Barge-in) Lifecycle
* **Audio Input:** Client captures 24 kHz, 16-bit signed PCM, mono and streams binary WebSocket chunks.
* **Audio Output:** Client receives synthesized audio chunks from AssemblyAI (`session.output.voice: "ivy"`).
* **Barge-in:** When user speaks during agent playback, AssemblyAI triggers turn detection and emits `reply.done` with `status: "interrupted"`. The browser immediately stops the `AudioContext` buffer queue, discards remaining audio packets, and transitions UI to `LISTENING`.

---

## 7. Re-Evaluation of Tools & The Tool List

We evaluated whether `focus_room_feature` / `adjust_view` should be an AI tool:

* **Architectural Justification:**
  - In a voice-first application over WebSocket, the AI communicates to the client *exclusively* via audio frames, text transcripts, and tool calls.
  - If the user asks *"Show me what it looks like at night"* or *"Show me the bathtub"*, the agent *must* have an unambiguous, type-safe event mechanism to tell the UI to change ambiance or focus.
  - Relying on natural-language regex on speech transcripts (e.g. `if (transcript.includes("night"))`) is notoriously brittle.
  - Therefore, **`adjust_view`** is retained, but explicitly designated as an **Inline Client Action Tool**. It never calls a backend API; the client WebSocket manager handles it locally, dispatches `CHANGE_AMBIANCE` or `SHOW_FEATURE`, and returns `{ "status": "view_updated" }` to the Voice Agent.

### Final 3 Tools:
1. **`search_rooms` (Backend Data Query):** Queries room inventory, returns factual room matches, triggers `FOCUS_ROOM`.
2. **`adjust_view` (Client Presentation Action):** Dispatches `CHANGE_AMBIANCE` or `SHOW_FEATURE` locally.
3. **`create_booking` (Backend Data Mutation):** Posts to backend, commits to `data/bookings.json`, issues key token, triggers `REVEAL_KEY`.

---

## 8. Deterministic 8-State Finite State Machine (FSM)

The interface operates strictly on **8 primary states**. Errors are modeled as non-blocking transient event overlays that leave primary state intact or safely transition to `IDLE` or `EXPLORING`.

```text
                  ┌──────────────┐
                  │   1. IDLE    │◄──────────────┐
                  └──────┬───────┘               │
                         │ (Mic on / Text submit)│
                         ▼                       │
                  ┌──────────────┐               │
           ┌─────►│ 2. LISTENING │               │
           │      └──────┬───────┘               │
 (Barge-in)│             │ (Turn ends)           │
           │             ▼                       │
           │      ┌──────────────┐               │
           │      │3.UNDERSTAND. │               │
           │      └──────┬───────┘               │
           │             │ (Tool dispatched)     │
           │             ▼                       │ (Reset / Dismiss)
           │      ┌──────────────┐               │
           │      │4.VISUAL_TRANS│               │
           │      └──────┬───────┘               │
           │             │ (500ms complete)      │
           │             ▼                       │
           │      ┌──────────────┐               │
           └──────┤ 5.RESPONDING ├───────────────┤
                  └──────┬───────┘               │
                         │ (Audio finishes)      │
                         ▼                       │
                  ┌──────────────┐               │
                  │ 6. EXPLORING │               │
                  └──────┬───────┘               │
                         │ ("Book it")           │
                         ▼                       │
                  ┌──────────────┐               │
                  │  7. BOOKING  │               │
                  └──────┬───────┘               │
                         │ (Persisted)           │
                         ▼                       │
                  ┌──────────────┐               │
                  │ 8.KEY_ISSUED ├───────────────┘
                  └──────────────┘
```

### Transition & Invariant Rules:
* **`IDLE` → `LISTENING` / `UNDERSTANDING`:** Activated via microphone click/spacebar or text submit.
* **`LISTENING` → `UNDERSTANDING`:** Neural turn silence detected.
* **`UNDERSTANDING` → `VISUAL_TRANSITION`:** Tool call parsed and validated.
* **`VISUAL_TRANSITION` → `RESPONDING`:** Camera/ambiance glide completes (500ms); agent voice playback begins.
* **`RESPONDING` → `LISTENING` (Barge-in):** User speaks; agent audio immediately cut off.
* **`RESPONDING` → `EXPLORING`:** Agent voice completes; room details remain interactive.
* **`EXPLORING` → `BOOKING`:** Guest confirms reservation; spec dock locks.
* **`BOOKING` → `KEY_ISSUED`:** Server returns verified booking object and demonstration key token.
* **Illegal Jumps:** Any attempt to jump directly to `KEY_ISSUED` without a valid backend booking object is rejected by the FSM.
* **Error Handling:** Network or parsing errors emit `DISPLAY_NOTIFICATION` (toast overlay), auto-recovering to `EXPLORING` or `IDLE`.

---

## 9. Fallback Architecture: Clean Text Command Mode

Per architecture discipline, **all secondary multi-agent or streaming LLM adapters are removed from the MVP**. 

The fallback architecture is single and robust:
* **If Voice Agent is unavailable (offline / permission denied):**
  - The UI seamlessly switches to **Text Command Mode**.
  - A permanent text command drawer at bottom center accepts the exact same queries (*"Anniversary suite under 150k"*, *"Night view"*, *"Book for John"*).
  - The text input directly executes the local tool dispatch and REST API endpoints.
  - Zero second AI pipeline needed. 100% demo reliability guaranteed.

---

## 10. Annotated Project File Structure

```text
/home/oyeolorun/Aurelia/
├── data/
│   ├── rooms.json              # Authoritative catalog (3 rooms, prices, media)
│   └── bookings.json           # Mutex-serialized booking store
├── devpost/
│   ├── learner-profile.md      # Onboarding profile (git-ignored)
│   ├── scope.md                # Approved project scope
│   ├── prd.md                  # Approved PRD
│   └── spec.md                 # This technical specification
├── server/
│   ├── index.ts                # Express server entry point (port 3001)
│   ├── tokenService.ts         # AssemblyAI ephemeral token generator
│   └── bookingService.ts       # Mutex-serialized booking transaction logic
├── src/
│   ├── assets/                 # Curated room imagery (deluxe, executive, presidential)
│   ├── components/
│   │   ├── Stage/              # Canvas, ambient lighting, feature zoom
│   │   ├── HUD/                # Pulse ring, live subtitles, mic toggle
│   │   ├── SpecDock/           # Room title, price tag, amenity pills
│   │   ├── KeyCard/            # Embossed digital stay pass, QR code, NFC glyph
│   │   └── TextFallback/       # Accessible command input drawer
│   ├── services/
│   │   ├── assemblyClient.ts   # WebSocket manager, session.update, audio pump
│   │   ├── audioRecorder.ts    # WebAudio PCM 24kHz capture worklet
│   │   └── api.ts              # Local backend fetch calls
│   ├── state/
│   │   ├── stateMachine.ts     # FSM governing the 8 interface states
│   │   └── actionBus.ts        # Typed UI action event dispatcher
│   ├── styles/
│   │   ├── tokens.css          # Color palette, spacing, typography scales
│   │   ├── stage.css           # Cinematic viewport & transition animations
│   │   ├── hud.css             # Floating audio ring, glassmorphic docks
│   │   └── key.css             # Key pass card styling & 3D tilt effects
│   ├── App.tsx                 # Root layout & state provider
│   └── main.tsx                # Client bootstrap
├── .env.example                # Example environment file
├── .gitignore                  # Active security ignore rules
├── package.json                # Project dependencies & scripts
├── tsconfig.json               # Strict TypeScript configuration
└── vite.config.ts              # Vite bundler & server proxy configuration
```

---

## 11. Testing & Demo Verification Script (60–90 Seconds)

1. **Step 1 (0:00–0:15):** User opens app (`npm run dev`). Arrives at `IDLE` state with ambient exterior/lobby view.
2. **Step 2 (0:15–0:35):** User holds Spacebar and speaks: *"We're celebrating our anniversary and want a quiet room with a balcony under ₦150,000."*
   - AssemblyAI invokes `search_rooms({ max_price_ngn: 150000, required_balcony: true })`.
   - UI glides to **Executive Suite**. Subtitle ribbon displays AI response. Spec dock shows `₦145,000 / night`.
3. **Step 3 (0:35–0:50):** User speaks: *"Show me what it looks like at night."*
   - AssemblyAI invokes `adjust_view({ ambiance: "night" })`.
   - Viewport crossfades over 600ms into warm architectural evening lighting.
4. **Step 4 (0:50–1:10):** User speaks: *"Book it for John."*
   - AssemblyAI invokes `create_booking({ room_id: "executive-suite", guest_name: "John", nights: 1 })`.
   - Backend commits record to `data/bookings.json` via Mutex queue.
5. **Step 5 (1:10–1:30):** UI transitions to `KEY_ISSUED`. Background blurs to optical frost; Digital Stay Pass reveals Suite 304, John, reference `AUR-2026-8842`, and active access token. AI confirms: *"Your room is ready."*

---

### Technical Specification Approval
* **Status:** `status: ready_for_approval`
* **Workflow Position:** Phase 4 completed. Ready for human review and approval before entering Phase 5 (Build).
