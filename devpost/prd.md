---
doc: prd
status: draft
---

# AURELIA — Product Requirements Document (PRD)

> **“Talk to the hotel. Watch it respond.”**  
> *The AI is not a chatbot placed on top of a hotel website. The AI is the interface through which the guest experiences the hotel.*

---

## 1. Product Overview

**AURELIA** is a conversational hotel web application where natural spoken dialogue directly manipulates the spatial, visual, and transactional state of a luxury hotel environment. 

Instead of relegating AI to a text chat bubble or relying on rigid multi-step form wizards (date-pickers, filter checkboxes, paginated cards), AURELIA turns the entire visual surface of the hotel into the living body of the AI conversation. The guest describes their stay in human terms, the interface reorients visually in real time to match that intent, facts remain strictly grounded in deterministic hotel records, and the interaction closes with an authenticated booking record and a digital demonstration access key.

---

## 2. Problem

1. **The Chatbot Anti-Pattern:** Modern "AI for hospitality" almost universally slaps an isolated chat widget over a static, legacy website. The AI and the visual website exist in silos; the conversation does not control what the user sees, and the user is still forced to manually click traditional booking UI to complete tasks.
2. **Friction in Luxury Hospitality Discovery:** Travelers planning experiential stays (anniversaries, retreats, executive trips) must translate holistic desires ("quiet, private balcony, romantic evening view around ₦150,000") into arbitrary dropdown filters, pagination menus, and static photo carousels.
3. **The Voice-Only Disconnect:** Voice assistants (phone bots, IVRs, smart speakers) suffer from cognitive overload because audio cannot communicate spatial layout or aesthetic atmosphere. Voice needs a synchronized visual surface to be effective for hospitality.

---

## 3. Target User

* **Primary Persona:** The Experiential Guest (e.g., "Marcus & Clara").
* **Context:** Booking a special getaway (e.g., an anniversary weekend).
* **Behavior:** Knows their experiential criteria (quiet atmosphere, private outdoor space, comfortable soaking tub, specific budget threshold) and values immediate sensory confirmation over browsing dense tabular inventory.
* **Pain Point Today:** Scrolling through dozens of search results, squinting at thumbnail carousels to verify if a tub exists, and guessing whether the room faces street noise or sunset.

---

## 4. Product Promise

1. **Zero Chat Bubbles:** The entire viewport reacts to what you say.
2. **Zero Hallucinated Facts:** Room rates, amenities, and availability are immutable and deterministic.
3. **Continuous Spatial Context:** The hotel shifts focus, lighting, and detail views in direct synchronization with speech.
4. **End-to-End Closure:** A spoken intent progresses from initial discovery to an immutable booking record and a digital access pass in under 90 seconds.

---

## 5. Core Experience

The experience operates on an unbroken 6-stage lifecycle:

$$\text{SPEAK} \longrightarrow \text{UNDERSTAND} \longrightarrow \text{EXPLORE} \longrightarrow \text{DECIDE} \longrightarrow \text{BOOK} \longrightarrow \text{KEY}$$

1. **SPEAK:** The guest presses the conversation trigger (or speaks into an active audio stream) using everyday language.
2. **UNDERSTAND:** The system transcribes the speech, extracts multi-dimensional parameters (budget, occasion, required features), and acknowledges the request without generic loading spinners.
3. **EXPLORE:** The viewport smoothly transitions toward the matching room, highlighting requested architectural features and adjusting ambient lighting.
4. **DECIDE:** The guest examines room details through contextual voice or text queries ("What does it look like at night?", "Does it have a bathtub?").
5. **BOOK:** The guest confirms commitment ("Book it for John"), creating a verified booking record in the application store.
6. **KEY:** The viewport transitions into a confirmed-stay access state, revealing an interactive digital demonstration key card.

---

## 6. Primary User Journey (Signature Demo Path)

This journey represents the canonical happy-path for the 60–90 second hackathon demonstration:

```text
[Initial Hero Canvas]
       │
       ▼
Guest Speaks: "I'm coming with my wife for our anniversary. We want somewhere quiet with a balcony, around ₦150,000 a night."
       │
       ▼
[System Transcribes & Resolves Parameters]
• Guests = 2 | Occasion = Anniversary | Ambience = Quiet | Feature = Balcony | Budget ≈ ₦150,000/night
       │
       ▼
[Deterministic Query identifies: Executive Suite @ ₦145,000]
       │
       ▼
[Visual Transition]: Viewport glides to Executive Suite, highlights Balcony & Tub, AI provides spoken confirmation
       │
       ▼
Guest Speaks: "Show me what it looks like at night."
       │
       ▼
[Ambiance Shift]: Scene crossfades from Daylight to Night/Dusk mood lighting
       │
       ▼
Guest Speaks: "Book it for John."
       │
       ▼
[Deterministic Booking Created]: Record AUR-2026-8842 written to storage
       │
       ▼
[Key State Reveal]: Viewport blurs softly; Digital Room Pass (Key #304, QR Code, Guest Name) animates into center focus
```

---

## 7. User Stories & Acceptance Criteria

### US-1: Conversational Room Matching
* **As an** experiential guest,  
* **I want to** state my budget and stay desires in natural speech,  
* **So that** I don't have to manually filter search forms.
  - [ ] System extracts budget, guest count, and amenity requirements accurately.
  - [ ] System queries deterministic inventory and rejects rooms outside constraints.
  - [ ] System selects the optimal match (`Executive Suite` for ₦150k + balcony).

### US-2: Synchronized Visual Reorientation
* **As a** visual decision maker,  
* **I want** the hotel website to automatically show me the room the AI is discussing,  
* **So that** I have immediate visual proof of the AI's recommendation.
  - [ ] Viewport shifts to the matching room without page reload or card grids.
  - [ ] Authoritative metadata dock updates with exact price (`₦145,000 / night`) and amenity badges.

### US-3: Contextual Detail Inspection
* **As a** guest inspecting a room,  
* **I want to** ask about specific features ("Does it have a bathtub?", "Show me the balcony") and time of day,  
* **So that** I can assess the atmosphere before committing.
  - [ ] Inquiring about a feature spotlights the feature's imagery.
  - [ ] Requesting "night view" transitions the lighting ambiance across the active room canvas.

### US-4: Deterministic Reservation Closure
* **As a** guest ready to reserve,  
* **I want to** confirm my booking conversationally ("Book it for John"),  
* **So that** my reservation is created immediately without filling out standard checkout forms.
  - [ ] System creates an immutable booking object with unique ID, room ID, guest name, and timestamp.
  - [ ] System transitions to the Key state.

### US-5: Digital Key Access Pass
* **As a** confirmed guest,  
* **I want** an immediate digital credential representing my stay,  
* **So that** I have a tangible, delightful confirmation of my completed booking.
  - [ ] Digital key pass displays guest name, booking reference, room number, and demonstration QR/NFC code.
  - [ ] Interface explicitly states "Demonstration Stay Credential" (does not claim physical door lock integration).

---

## 8. Functional Requirements

| ID | Category | Requirement | Priority |
| :--- | :--- | :--- | :--- |
| **FR-01** | Inventory | Catalog must contain exactly 3 predefined rooms with fixed Naira rates. | P0 |
| **FR-02** | Voice Input | Web microphone stream must capture guest speech with push-to-talk and click-to-speak triggers. | P0 |
| **FR-03** | Audio Fallback | High-visibility text input must execute identical conversational logic. | P0 |
| **FR-04** | Intent Parsing | LLM must parse natural language into typed parameter objects. | P0 |
| **FR-05** | Tool Dispatch | Backend must execute deterministic tools and return verified JSON. | P0 |
| **FR-06** | UI Action Bus | Frontend must consume structured UI action events to drive visual state. | P0 |
| **FR-07** | Motion Control | Visual transitions (camera glide, crossfade) must finish within 400–600ms. | P0 |
| **FR-08** | Booking Store | Successful booking must persist in application session memory/JSON store. | P0 |
| **FR-09** | Key Issuance | Key pass must render deterministically from the created booking record. | P0 |
| **FR-10** | Transcript Feed | Live speech transcription must appear as non-obtrusive subtitles. | P1 |

---

## 9. AI Behavior & Boundaries

### What the AI Is Permitted to Do:
1. **Transcribe & Normalize:** Convert user audio into clean conversational text.
2. **Extract Entities:** Identify numbers, currency values, names, dates, and amenities.
3. **Select Tools:** Decide whether to call `search_rooms`, `create_booking`, or `issue_digital_key`.
4. **Formulate UI Action Payloads:** Request UI actions (`focus_room`, `change_ambiance`, `show_feature`).
5. **Generate Conversational Commentary:** Provide warm, concise, luxury-attuned vocal narration ("I have prepared the Executive Suite for you...").

### Strict Negative Constraints (What the AI Must NEVER Do):
1. **NEVER Invent Hotel Facts:** The AI cannot quote prices not returned by the database (e.g., offering an imaginary discount or different room rate).
2. **NEVER Fabricate Inventory:** The AI cannot claim rooms or amenities that do not exist in `rooms.json`.
3. **NEVER Invent Booking IDs:** The AI cannot generate random booking codes; it must await the return value of `create_booking`.
4. **NEVER Directly Control the DOM:** The AI has zero access to `document`, `window`, CSS styles, or arbitrary JavaScript execution.

---

## 10. Deterministic Data Behavior (System of Record)

All business rules, inventory, pricing, and transactions reside strictly in the application layer.

### Hotel Inventory (`AURELIA HOTEL`)
```json
[
  {
    "id": "deluxe",
    "name": "Deluxe Room",
    "price_per_night": 85000,
    "currency": "NGN",
    "capacity": 2,
    "features": ["King bed", "City view", "Walk-in shower", "Workstation"],
    "has_balcony": false,
    "has_bathtub": false,
    "quiet_tier": "Standard",
    "room_number": "204"
  },
  {
    "id": "executive-suite",
    "name": "Executive Suite",
    "price_per_night": 145000,
    "currency": "NGN",
    "capacity": 2,
    "features": ["Private sunset balcony", "Soaking tub", "Lounge", "Breakfast included"],
    "has_balcony": true,
    "has_bathtub": true,
    "quiet_tier": "High",
    "room_number": "304"
  },
  {
    "id": "presidential-suite",
    "name": "Presidential Suite",
    "price_per_night": 280000,
    "currency": "NGN",
    "capacity": 4,
    "features": ["Panoramic skyline", "Terrace plunge pool", "Marble bathroom", "24/7 butler"],
    "has_balcony": true,
    "has_bathtub": true,
    "quiet_tier": "Maximum",
    "room_number": "501"
  }
]
```

### Deterministic Backend Operations (Tools)
1. `search_rooms({ max_price, required_features, guest_count })`:
   - Evaluates criteria against inventory. Returns array of matching room summaries or empty array.
2. `create_booking({ room_id, guest_name, nights })`:
   - Validates `room_id`.
   - Computes `total_price = price_per_night * nights`.
   - Generates unique ID format: `AUR-YYYY-[4-digit-hex]`.
   - Writes to booking repository. Returns complete booking object.
3. `issue_digital_key({ booking_id })`:
   - Validates booking exists and is confirmed.
   - Generates demonstration digital key payload (access token hash, room number, activation timestamp).

---

## 11. The AI → UI Action Model (The Controlled Event Bus)

To maintain absolute architectural safety, the AI interacts with the frontend **only through strongly typed, discrete action envelopes**. 

```text
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  AI Intent /    │  ───> │  Structured UI  │  ───> │  Frontend UI    │
│  Tool Calling   │       │  Action Envelope│       │  State Machine  │
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                   │                         │
                                   ▼                         ▼
                            Strict Schema            Validated Transition
                            Validation               (Rejects invalid state)
```

### Action Schema Specification:

```typescript
type UIAction =
  | { type: "FOCUS_ROOM"; payload: { roomId: "deluxe" | "executive-suite" | "presidential-suite" } }
  | { type: "SHOW_FEATURE"; payload: { roomId: string; feature: "overview" | "bathroom" | "balcony" } }
  | { type: "CHANGE_AMBIANCE"; payload: { mode: "day" | "night" } }
  | { type: "SHOW_BOOKING_SUMMARY"; payload: { bookingId: string } }
  | { type: "REVEAL_KEY"; payload: { bookingId: string } }
  | { type: "DISPLAY_NOTIFICATION"; payload: { message: string; level: "info" | "error" } };
```

* **Client Authority:** The frontend state machine validates every incoming action. If the AI emits `REVEAL_KEY` but no booking exists in the client store, the frontend rejects the transition and flags an error state.

---

## 12. Visual & Interface Requirements

The design language reflects modern luxury boutique architecture: **warm obsidian (#0B0C0E), deep charcoal (#141619), polished bronze/gold accents (#D4AF37), and optical white text (#F8F9FA)** with subtle glassmorphic scrims.

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  [AURELIA HOTEL]                          [₦145,000 / night] [Status: ●] │
│                                                                          │
│                                                                          │
│                       FULL-BLEED CINEMATIC ROOM CANVAS                   │
│                                                                          │
│                   [Executive Suite — Sunset Balcony View]                │
│                                                                          │
│                                                                          │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ "I have brought up the Executive Suite. It features a private      │  │
│  │  balcony and deep soaking tub at ₦145,000 per night."              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│   [● Mic: Listening] [Ambiance: Day / Night] [Text: Ask anything... ↵]   │
└──────────────────────────────────────────────────────────────────────────┘
```

### The 8 Definitive Interface States:

1. **Initial State (Arrival):**
   - Cinematic exterior/lobby establishing shot with subtle breathing ambiance.
   - Elegant center welcome typography: *"AURELIA — Speak to explore."*
   - Ambient pulse on the voice interaction pill at bottom center.
2. **Listening State:**
   - Microphone indicator turns warm gold with an active, subtle audio-reactive waveform ring.
   - Live transcription stream appears in an elegant, translucent glass ribbon.
   - Screen brightness dims slightly (5%) to focus attention on the spoken dialogue.
3. **Understanding State (Zero Generic Spinners):**
   - The waveform ring settles into an organic, rhythmic shimmer.
   - A single, understated status pill displays active semantic parsing: *"Selecting Suite..."* or *"Adjusting Ambiance..."*
4. **Responding State:**
   - AI audio streams cleanly through browser speakers.
   - Subtitle ribbon renders the spoken response with high legibility.
5. **Visual Transition State:**
   - The room canvas undergoes a smooth 500ms easing glide.
   - As the new room centers, metadata tags (Title, Price, Features) slide in from the bottom with 50ms stagger.
6. **Exploration State:**
   - When a specific feature is requested ("Show the bathtub"), the camera pans/zooms to the high-detail bathroom focal point.
   - When "Night view" is requested, the lighting layer crossfades smoothly from day to dusk/architectural night lighting.
7. **Booking State:**
   - Upon "Book it", the room details dock locks into an active reservation preview.
   - A brief, tactile checkmark pulse indicates record creation in the database.
8. **Key State (The Climax):**
   - The background room softly blurs with an optical glass frost (`backdrop-filter: blur(24px)`).
   - An embossed digital key card animates into center view:
     - Header: *AURELIA HOTEL — GUEST ACCESS*
     - Room: *Suite 304*
     - Guest: *John*
     - Reference: *AUR-2026-8842*
     - Active animated NFC/QR authorization glyph.
     - Label: *"Demonstration Digital Key Issued"*.

---

## 13. Motion Principles (Motion with Meaning)

Every animation in AURELIA communicates a state transition or spatial continuity. Decorative, purposeless animations are prohibited.

* **Spatial Continuity (Room Glides):**
  - Rooms do not cut or flash. They glide laterally with natural spring deceleration (`cubic-bezier(0.16, 1, 0.3, 1)`), establishing that the rooms exist within a contiguous physical hotel structure.
* **Atmospheric Crossfade (Day → Night):**
  - Transition duration: 600ms crossfade between color temperatures (Day 5500K warm-white → Night 2400K architectural amber).
  - Background elements adjust exposure gradually, avoiding sudden contrast jolts.
* **Camera Focus (Detail Pan/Zoom):**
  - When exploring a feature (e.g. bathtub), the view scales smoothly by 1.08x with a directional pan toward the focal zone.
* **Elevation & Hierarchy (Digital Key Reveal):**
  - The key card rises with an ease-out spring from depth (`scale(0.92)` to `scale(1.0)` with a subtle 3D tilt reaction to cursor movement).
* **Anti-Slop Restraints:**
  - No continuous floating/bobbing animations.
  - No decorative particle swarms or glitter effects.
  - No animations that block user input or exceed 600ms.

---

## 14. Voice Interaction Model

* **Hero Interaction:** Spoken dialogue is the natural, primary method of navigation.
* **Activation Modes:**
  1. *Push-to-Talk (Hold Spacebar or Click-and-Hold Button):* Ideal for noisy hackathon environments.
  2. *Tap-to-Speak (Click to Toggle On/Off):* Hands-free exploration.
* **Interruption & Barge-in:**
  - If the user begins speaking while the AI is talking, playback immediately pauses, and the system pivots to the new input.
* **Audio Feedback Prevention:**
  - Browser echo cancellation (`echoCancellation: true`, `noiseSuppression: true`) enabled by default.
* **Transcript Subtitles:**
  - Closed captions rendered at the lower third of the screen in optical sans-serif with high contrast backing for silent demonstrations.

---

## 15. Text Fallback (Non-Negotiable Parity)

The application provides a seamless, elegant text input dock accessible at any moment:
* **Trigger:** Clicking the input bar or pressing `/` focuses the text field.
* **Functional Parity:** Every voice command has 100% feature parity through text. Typing *"We want a quiet room with a balcony around ₦150k"* triggers the exact same intent extraction, tool execution, and visual transitions.
* **Fail-Safe Guarantee:** If microphone permissions are denied, an understated toast appears (*"Voice unavailable — text mode active"*), and the text bar expands smoothly as the active prompt interface.

---

## 16. Room Exploration Model

Exploration is multi-dimensional across three fixed dimensions:

```text
                     ┌──────────────────┐
                     │   ROOM SELECTION │ (Deluxe / Executive / Presidential)
                     └────────┬─────────┘
                              │
          ┌───────────────────┴───────────────────┐
          ▼                                       ▼
┌──────────────────┐                    ┌──────────────────┐
│  AMBIANCE MODE   │                    │  FEATURE FOCUS   │
│  (Day / Night)   │                    │ (Overview/Bath/  │
└──────────────────┘                    │  Balcony)        │
                                        └──────────────────┘
```

1. **Horizontal Dimension (Rooms):** Switching between Deluxe, Executive, and Presidential.
2. **Temporal Dimension (Lighting):** Switching between Day (sunlight, open vistas) and Night (ambient interior glow, city lights).
3. **Focal Dimension (Zones):** Inspecting the main sleeping area, the bath/soaking tub, or the balcony terrace.

---

## 17. Booking Flow Semantics

The booking process is intentionally frictionless and conversational:

1. **Trigger:** Guest says *"Book it"*, *"I'll take this one"*, or *"Reserve the suite for John"*.
2. **Parameter Check:**
   - Room: Active room in viewport (or explicitly stated room).
   - Guest Name: Extracted from speech (or prompted once: *"May I have the name for the reservation?"*).
   - Nights: Default to 1 night if unspecified.
3. **Deterministic Execution:**
   - Call `create_booking({ roomId: "executive-suite", guestName: "John", nights: 1 })`.
   - Backend creates record:
     ```json
     {
       "booking_id": "AUR-2026-8842",
       "room_id": "executive-suite",
       "room_name": "Executive Suite",
       "guest_name": "John",
       "nights": 1,
       "price_per_night": 145000,
       "total_price": 145000,
       "currency": "NGN",
       "status": "CONFIRMED",
       "created_at": "2026-09-24T12:00:00Z"
     }
     ```
4. **State Transition:** UI shifts to confirmed state and triggers Key generation.

---

## 18. Digital Key Semantics

The Digital Key is an interactive demonstration artifact proving complete transactional closure:

* **Key Payload Elements:**
  - **Property:** AURELIA HOTEL
  - **Room Number:** Extracted from room catalog (e.g., `Suite 304`).
  - **Guest Name:** As provided (e.g., `John`).
  - **Booking ID:** Authoritative reference (e.g., `AUR-2026-8842`).
  - **Access Token:** Deterministic HMAC demonstration hash (e.g., `key_live_98a7f01c`).
  - **Dynamic Visuals:** Simulated pulsing NFC ring / high-density QR code.
* **Honesty & Safety Disclaimer:**
  - The key interface explicitly carries an understated micro-label:  
    *“Demonstration Stay Pass • Non-physical lock credential”*.  
  - It does NOT pretend to integrate with Assa Abloy, Salto, or physical smart locks.

---

## 19. Error & Edge States

| Scenario | System Behavior | UI Communication |
| :--- | :--- | :--- |
| **Microphone Permission Denied** | Instantly falls back to text input dock. | Understated banner: *"Microphone access denied. Keyboard controls active."* |
| **Noisy / Indecipherable Speech** | AI asks for clarification without breaking room view. | *"I didn't quite catch that. Could you repeat the room or feature you'd like to see?"* |
| **Budget Too Low (< ₦85,000)** | AI factually informs user of minimum tier. | *"Our most accessible room is the Deluxe at ₦85,000. Would you like me to show you that?"* |
| **Conflicting Amenities (e.g. Deluxe + Balcony)** | AI resolves conflict against inventory truth. | *"The Deluxe Room does not feature a balcony. Our Executive Suite offers a private sunset balcony for ₦145,000."* |
| **AI Backend Timeout (> 4.0s)** | Client watchdog trips, reveals manual quick-action buttons. | Toast: *"Voice connection slow. Select your suite directly below."* |
| **Duplicate Booking Command** | System checks active booking ID; does not create second reservation. | *"You already have confirmed access to Suite 304 under booking AUR-2026-8842."* |

---

## 20. Accessibility (WCAG 2.1 AA Compliance)

1. **Keyboard Operability:**
   - Spacebar toggles voice listening (when text field unfocused).
   - Arrow keys (`Left`/`Right`) cycle through room carousel.
   - Key `D` toggles Day mode; Key `N` toggles Night mode.
   - Key `B` initiates booking for the active room.
   - Escape closes the Key card or cancels active voice prompt.
2. **Visible Focus & Contrast:**
   - All interactive elements possess a 2px gold focus ring (`outline: 2px solid #D4AF37; outline-offset: 2px`).
   - Text contrast ratio exceeds 4.5:1 against dark backgrounds (optical white `#F8F9FA` on `#0B0C0E`).
3. **Screen Reader Parity:**
   - Live subtitles and state changes announce via `aria-live="polite"` regions.
   - Digital key card contains complete semantic text readout for assistive devices.
4. **`prefers-reduced-motion`:**
   - When enabled, camera glides and scaling animations are disabled; transitions become instant, soft crossfades (150ms).

---

## 21. Responsive Behavior

| Screen Size | Canvas Composition | Navigation & Controls |
| :--- | :--- | :--- |
| **Desktop (> 1024px)** | Full-bleed hero landscape. Split view with floating glass spec dock on right. | Floating central voice HUD with persistent subtitle overlay. |
| **Tablet (768px – 1023px)** | Full-bleed hero. Spec dock shifts to bottom sheet drawer. | Voice trigger anchored at bottom center with expandable text drawer. |
| **Mobile (< 768px)** | Vertical framing of rooms. Room details collapse into an expandable micro-pill. | Full-width bottom control bar with prominent microphone button and text toggle. |

---

## 22. Out of Scope (Explicitly Cut)

To maintain disciplined focus on the core proof of concept, the following are strictly excluded:

* **No Payment Gateways (Stripe, Paystack):** Adds webhook latency, external redirect drops, and card entry friction without proving conversational UI.
* **No Real Hotel PMS Integration (Opera, Cloudbeds):** Pure local deterministic data model is used.
* **No Multi-Property Search:** Single hotel (*Aurelia Hotel*) only.
* **No Ancillary Booking Services:** No restaurant reservations, spa treatments, or airport car bookings.
* **No Authentication / User Accounts:** Guest name captured in session is sufficient for the MVP pass.
* **No Physical Lock Protocols:** No Apple Wallet PassKit or physical RFID/NFC door lock bridges.
* **No Autonomous Web Crawlers / Arbitrary DOM Agents:** AI emits structured event objects; client code renders everything.

---

## 23. Definition of Done (PoC Acceptance)

The PRD is complete and verified when:

1. [ ] A guest can speak a budget and occasion, and the screen reorients to the Executive Suite within 1.5 seconds.
2. [ ] A guest can ask for "night view", and the ambient lighting transitions from day to night.
3. [ ] A guest can ask to "see the bathtub", and the visual focus shifts to the soaking tub detail.
4. [ ] A guest can say "Book it for John", and an authoritative booking record is created in storage.
5. [ ] The Digital Key card renders automatically from that booking record with matching name, suite number, and booking reference.
6. [ ] The entire sequence can be completed identically using keyboard/text input.
7. [ ] Zero factual hallucinations exist in any spoken or displayed copy.

---

## 24. Demo Requirements (60–90 Second Script)

| Time | Action | Visual Reaction | Spoken Audio / Narration |
| :--- | :--- | :--- | :--- |
| **0:00–0:15** | Speaker arrives, holds mic button. | Ambient hotel exterior gently glides into Deluxe overview. | *"I'm coming with my wife for our anniversary. We want somewhere quiet with a balcony, around ₦150,000 a night."* |
| **0:15–0:35** | System parses criteria. | Viewport glides smoothly to **Executive Suite**. Price tag `₦145,000` and Balcony badge spotlighted. | AI: *"Welcome to Aurelia. I've brought up our Executive Suite. At ₦145,000, it features a private sunset balcony and quiet acoustic insulation."* |
| **0:35–0:50** | Speaker asks for night scene. | Scene crossfades to warm dusk/night architectural lighting. | *"Show me what it looks like at night."* / AI: *"Here is the suite under evening ambiance."* |
| **0:50–1:15** | Speaker confirms booking. | Spec dock transitions to confirmed state; background frosts into deep blur. | *"Book it for John."* / AI: *"Reserving your suite now, John. Your booking is confirmed."* |
| **1:15–1:30** | Climax: Key Card reveal. | Embossed Digital Room Key animates into center screen with QR and Suite 304. | Show finished pass. *"Your room is ready."* |

---

### PRD Sign-Off & Status
* **Document Status:** `status: approved`
* **Workflow Position:** Completed `3-prd`. Ready for handoff to `4-spec`.
