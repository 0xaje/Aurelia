---
doc: visual-direction
status: draft
---

# AURELIA — Visual Experience & Design Intelligence Direction

> **Canonical Visual Direction Document for AURELIA**  
> Formulated during the Visual Experience Gate prior to Slice 3 (AssemblyAI Voice Agent).  
> Governs all visual styling, asset generation, spatial composition, and conversational UI choreography.

---

## 1. Executive Summary & Design Mission

**AURELIA is not a chatbot placed on top of a hotel website.**  
**The hotel itself is the interface.**

When a traveler speaks to AURELIA, the screen acts as an architectural viewport into a five-star sanctuary. The interface reorients visually in direct response to spoken desires: camera moves draw the eye across suites, ambient lighting dissolves from daylight to evening calm, authoritative specifications emerge as refined architectural placards, and reservations culminate in a tangible, embossed digital stay pass.

---

## 2. Design & Quality Skill Audit Matrix

Before formulating this direction, we inspected the available quality and anti-slop skills in the environment, along with established design frameworks:

| Skill / Framework | Primary Problem Solved | Role in AURELIA | When Used | Overlap / Conflict | Application to Hotel Experience |
|---|---|---|---|---|---|
| **`code-slop`** *(Installed)* | Detects qualitative AI code smells (narration comments, premature wrappers, mock-everything tests) | **Global Code Governor** | PR reviews, commit gates, and test audits | Complementary with quality metrics | Keeps codebase lean, human-crafted, and free of boilerplate bloat |
| **`apple-design`** *(Approved direction)* | Establishes spatial restraint, ergonomic glass docking, and direct manipulation | **UI Shell & Surface Governor** | SpecDock, VoiceHUD, and Digital Key card design | None; aligns with luxury calm | Prevents cheap consumer UI; delivers tactile, weighted interface surfaces |
| **`emil-design-eng`** *(Approved direction)* | High-performance CSS transforms, spring physics, and micro-interaction fluidity | **Motion Engine Governor** | Camera glides, zoom transitions, and FSM visual events | Extends CSS tokens cleanly | Ensures 60fps hardware-accelerated transforms without heavy 3D engine overhead |
| **`frontend-design`** *(Approved direction)* | Typographic hierarchy, visual weight balance, and responsive layout hygiene | **Visual Hierarchy Governor** | Typography scale, margin rhythms, and desktop/tablet breakpoints | Synergizes with Apple Design | Elevates aesthetic from generic template to curated editorial magazine |
| **`accessibility` (WCAG 2.2 AA)** | Ensures keyboard navigability, screen-reader parity, and high-contrast color ratios | **Inclusivity & Reliability Governor** | Focus rings, ARIA roles, live regions, reduced-motion overrides | Invariant; never overridden | Guarantees AURELIA is fully usable for all guests, including keyboard and low-vision users |
| **`interaction-design`** *(Approved direction)* | Closes feedback loops between user intent and interface response | **Conversational FSM Governor** | Mapping speech states (`LISTENING` → `UNDERSTANDING` → `EXPLORING`) | Harmonious with state machine | Eliminates confusing dead states and assures the guest the system heard them |

---

## 3. Brand Feeling & Emotional Arc

The visual identity must elicit five sequential emotional sensations as the guest interacts:

1. **Arrival (Calm Authority):** The initial dark obsidian atmosphere (`#0B0C0E`) and quiet serif typography immediately lower the guest’s pulse. No loud marketing popups, no flashing discounts.
2. **Attentiveness (Warm Reassurance):** When the guest speaks, the subtle bronze luminescence (`#D4AF37`) confirms the hotel is actively listening without jarring visual noise.
3. **Discovery (Cinematic Wonder):** As the camera glides into the matching suite and reveals requested amenities, the guest feels the thrill of stepping into their private retreat.
4. **Intimacy (Evening Atmosphere):** Transitioning to night mode evokes the romantic amber glow of an evening arrival—bedside lamps warm, terrace overlooking dusk.
5. **Permanence (Effortless Closure):** Issuing the digital key pass delivers the tactile satisfaction of an embossed room credential handed across the desk.

---

## 4. Composition & Spatial Hierarchy

The viewport operates as a **three-tier cinematic depth system**:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ BRAND HEADER: Minimalist Title (Left) ── Ambiance Toggle & FSM Badge (Right) │
│                                                                              │
│                                                                              │
│                         BACKGROUND / STAGE LAYER                             │
│                  Full-bleed Architectural Hotel Suite Scene                  │
│                     (2.5D Scale, Pan & Crossfade Depth)                      │
│                                                                              │
│                                                                              │
│ ┌────────────────────────┐                    ┌────────────────────────────┐ │
│ │ SPEC DOCK              │                    │ VOICE HUD                  │ │
│ │ • Suite Title & Price  │                    │ • Transcript Subtitle      │ │
│ │ • Curated Amenities    │                    │ • Quick Suggestion Chips   │ │
│ │ • Feature Selectors    │                    │ • Text Input Bar           │ │
│ └────────────────────────┘                    │ • Room Carousel & Mic Pill │ │
│                                               └────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

* **Desktop Layout Strategy (Width > 1320px):**
  * `SpecDock` docks firmly on the bottom-left (`max-width: 380px`), acting as an authoritative architectural plaque.
  * `VoiceHUD` docks in the bottom-center (`max-width: 500px`), centered beneath the suite view.
  * A guaranteed **72px+ negative space gap** separates them, preventing any visual collision.
* **Laptop / Medium Desktop (900px – 1320px):**
  * `SpecDock` docks on the bottom-left (`max-width: 320px`).
  * `VoiceHUD` offsets cleanly to the bottom-right (`max-width: 480px`).
  * The center of the architectural scene remains unobstructed.
* **Mobile / Tablet (< 900px):**
  * Vertically stacked with `SpecDock` elevated above the interaction dock.

---

## 5. Typography System

Typography must bridge classical architectural heritage and contemporary technical clarity:

| Role | Font Family | Size | Weight | Tracking | Usage |
|---|---|---|---|---|---|
| **Display Brand** | Cormorant Garamond / Serif | `1.85rem` | 400 | `0.2em` (caps) | Brand header ("A U R E L I A") |
| **Suite Title** | Cormorant Garamond / Serif | `2.25rem` | 400 | Normal | Suite headings ("Executive Suite") |
| **Price Hero** | Plus Jakarta Sans / Sans | `1.6rem` | 700 | Normal | Exact Naira rates ("₦145,000") |
| **Subtitles / Voice** | Plus Jakarta Sans / Sans | `0.88rem` | 400 | Normal | Real-time speech transcript ribbon |
| **Placard Metadata** | Plus Jakarta Sans / Sans | `0.72rem` | 700 | `0.2em` (caps) | Room tags, amenity pills, status badges |

---

## 6. Materials & Surface Palette

* **Obsidian Deep (`#08090B`):** The foundational void color behind all imagery and scrims.
* **Warm Obsidian (`#0B0C0E`):** The primary canvas ground.
* **Optical Smoked Glass:** `rgba(11, 12, 14, 0.85)` with `backdrop-filter: blur(28px)` and a subtle `1px solid rgba(255, 255, 255, 0.08)` hairline border.
* **Imperial Bronze (`#D4AF37`):** The primary accent for active states, pricing highlights, and microphone illumination.
* **Bronze Glow:** `rgba(212, 175, 55, 0.25)` for ambient state halos.
* **Pure Text White (`#F8F9FA`):** High-contrast readable typography (exceeding WCAG 2.2 AA 4.5:1 ratio).

---

## 7. Camera Language & Choreography

*(Full details documented in [devpost/motion-language.md](file:///home/oyeolorun/Aurelia/devpost/motion-language.md))*

* **Lateral Glide (Suite Switching):** `transform: translateX(...)` over `550ms` with `--ease-spring` (`cubic-bezier(0.16, 1, 0.3, 1)`).
* **Focused Dolly-In (Feature Zoom):** `transform: scale(1.06) translateY(-1.5%)` over `450ms`.
* **Atmospheric Dissolve (Day/Night Shift):** Dual-layer opacity crossfade over `600ms` with `--ease-smooth`.
* **Zero Bounce Policy:** No elastic overshoots. High-end architectural dignity throughout.

---

## 8. Mapping Visual States to the 8 FSM States

AURELIA's single, deterministic state machine directly coordinates the visual presentation:

```text
[IDLE]
  │  Visual: Calm architectural overview, amber breathing dot, quiet transcript.
  ▼
[LISTENING]
  │  Visual: Gold pulse ring expands around microphone; status badge: "• LISTENING".
  ▼
[UNDERSTANDING]
  │  Visual: Command bar pulses softly; status badge: "• UNDERSTANDING". AI extracts parameters.
  ▼
[VISUAL_TRANSITION]
  │  Visual: Camera glides laterally to matched suite or dollys in; lighting begins crossfade.
  ▼
[RESPONDING]
  │  Visual: Subtitle ribbon renders authoritative response; camera settles into new composition.
  ▼
[EXPLORING]
  │  Visual: Guest interacts with amenity pills, day/night toggles, or continues speech.
  ▼
[BOOKING]
  │  Visual: Viewport dims softly (30% darker scrim); confirmation summary placard centers.
  ▼
[KEY_ISSUED]
  │  Visual: Deep backdrop blur (12px); embossed Digital Stay Pass animates into center hero focus.
```

---

## 9. The AURELIA Signature Interaction

**The Defining Hackathon Moment:**
> A judge watches a guest speak naturally, and the entire hotel visually transforms in synchronized harmony without touching a dropdown.

### The 4-Step Sequence:
1. **Trigger A (Natural Request):**  
   Guest: *"I'm coming with my wife for our anniversary. Somewhere quiet, with a balcony, around ₦150k."*  
   *Visual:* Viewport glides smoothly from the Deluxe Room across to the **Executive Suite** (`₦145,000`). The balcony and soaking tub amenity tags illuminate.
2. **Trigger B (Detail Exploration):**  
   Guest: *"Show me the balcony."*  
   *Visual:* The camera executes a slow dolly-in (`scale(1.06)`), framing the westward sunset terrace.
3. **Trigger C (Atmospheric Transformation):**  
   Guest: *"What does it look like at night?"*  
   *Visual:* Over 600ms, daytime dissolves into evening architectural lighting—terrace lanterns glow, city skyline glimmers, mood warms.
4. **Trigger D (Factual Commitment):**  
   Guest: *"Book it for John."*  
   *Visual:* The stage softly blurs, and the embossed digital stay pass slides into center focus with room `#304` and verified reservation token.

---

## 10. Real DOM vs. Image Illusion Architecture

To achieve AAA visual fidelity without a 50MB 3D engine:

| Element | Layer Type | Implementation | Why Chosen |
|---|---|---|---|
| **Room Architecture & Views** | 2.5D Image Layer | High-resolution curated photographic plates | Instant load, zero GPU crash risk, photorealistic luxury |
| **Day / Night Lighting** | Dual-Layer Dissolve | CSS `opacity` crossfade between synchronized day/night renders | 60fps smooth lighting shift without shader recomputation |
| **Camera Movements** | CSS Transform Motion | `translateX`, `scale`, `will-change: transform` | Native GPU hardware acceleration, sub-millisecond response |
| **HUD, SpecDock, Badges** | Real DOM / CSS | Optical glassmorphism cards, semantic HTML | 100% accessible, crisp text rendering, screen-reader readable |
| **Digital Stay Pass** | Real DOM / SVG | Embossed card with QR matrix, gold foil gradients | Interactive, verifiable, copyable booking reference |

---

## 11. Asset Strategy & Generation Specifications

For the proof-of-concept, AURELIA requires **10 curated visual plates** sharing identical architectural DNA:

1. **Property Exterior (Arrival):** Monolithic dark concrete, warm vertical bronze louvers, cascading water feature, lush tropical foliage.
2. **Hotel Lobby (Sanctuary):** High-ceilinged double-height atrium, honed travertine stone floor, sculptural bronze reception desk.
3. **Deluxe Room (Day Overview):** King bed, warm minimalist wood paneling, floor-to-ceiling window overlooking gardens.
4. **Deluxe Room (Night Overview):** Same angle, warm recessed downlights, sheer curtains, night garden uplighting.
5. **Executive Suite (Day Overview):** Separate lounge seating, panoramic balcony doors, soaking tub visible through glass partition.
6. **Executive Suite (Night Overview):** Evening lighting, amber terrace lanterns, glowing city horizon.
7. **Executive Suite (Balcony Detail):** Private teakwood terrace, plush lounge chairs, westward sunset view.
8. **Executive Suite (Bathroom Detail):** Freestanding fluted stone soaking tub, rainfall shower, dark marble surfaces.
9. **Presidential Suite (Day Overview):** Double-width living expanse, dining area, wraparound terrace, sculptural fireplace.
10. **Presidential Suite (Night Overview):** Architectural perimeter lighting, evening skyline reflection, illuminated terrace pool.

---

## 12. Reusable Gemini Image Generation Prompt System

To ensure all generated scenes look like **the exact same luxury hotel**, use this structured prompt template:

```text
[SCENE]: {Luxury boutique hotel suite / bathroom / balcony / lobby}
[HOTEL IDENTITY]: Aurelia Hotel, contemporary African luxury boutique sanctuary
[ARCHITECTURE & MATERIALS]: Monolithic honed travertine marble, dark smoked oak paneling, warm brushed bronze metal trims, charcoal textured linen drapery, polished obsidian stone surfaces
[LIGHTING]: {Natural warm golden hour daylight through floor-to-ceiling glass / OR / Intimate evening architectural lighting with 2700K warm recessed downlights and glowing perimeter cove illumination}
[COMPOSITION]: Cinematic architectural photography, wide-angle 24mm tilt-shift lens, perfectly vertical architectural lines, serene negative space, eye-level perspective
[ATMOSPHERE]: Ultra-luxury sanctuary, serene, peaceful, uncluttered, immaculate five-star interior design, high acoustic calm
[NEGATIVE PROMPTS]: No people, no clutter, no distorted geometry, no text, no watermarks, no neon colors, no cheap hotel furniture, no fisheye distortion, no generic hotel chain aesthetics
```

---

## 13. Reusable Motion Prompt System

When animating still architectural plates into video or dynamic loops:

```text
[STARTING FRAME]: Synchronized high-resolution architectural image plate
[CAMERA MOVEMENT]: Slow, steady forward dolly-in (push) at 0.5 meters per second, perfectly locked horizontal horizon, zero roll, zero camera shake
[LIGHTING MOVEMENT]: Subtle ambient sunset glow slowly deepening; interior warm accent lights subtly reflecting off polished bronze
[ENVIRONMENTAL MOTION]: Sheer linen curtains moving with a faint, gentle evening breeze; subtle water ripples on balcony plunge pool
[CONSTRAINTS]: Strict geometric preservation — do not morph furniture, do not warp walls, do not hallucinate new objects, do not shift window frames
[DURATION]: 4.0 seconds seamless loop
```

---

## 14. Anti-Slop Visual Rules for AURELIA

Grounded in our `code-slop` inspection and design engineering discipline:

1. **No Generic SaaS Dashboard Cards:** Avoid rows of white metric boxes with arbitrary colored icons.
2. **No Chatbot Floating Bubble:** Never place a round chat avatar in the bottom-right corner.
3. **No Gratuitous Gradients:** Use dark obsidian tonal depth (`#08090B` to `#121417`), not loud purple/blue gradient meshes.
4. **No Milk-Glass Overkill:** Glass surfaces must have dark backing (`rgba(11, 12, 14, 0.85)`), never unreadable transparent white haze.
5. **No Cartoon Springs:** Easing curves must feel like precision German or Japanese camera lenses, not bouncing rubber balls.
6. **No Fake Inventory / No Hallucinations:** Every detail displayed on screen must come directly from `data/rooms.json`.
7. **No Cluttered Text:** Keep placards concise, factual, and scannable.

---

## 15. Frontend Gap Analysis (Slice 2 vs. Future Slices)

| Area | Current Implementation (Slice 2) | Desired State (Slices 3–4) | Required Action |
|---|---|---|---|
| **Audio Pipeline** | Manual mic toggle button | Live 24 kHz PCM streaming over WebSocket | Wire AssemblyAI Voice Agent in Slice 3 |
| **Visual Assets** | Static Unsplash photography | Custom Gemini-generated cohesive Aurelia asset suite | Generate and replace plates using Prompt System |
| **Room Glides** | Pure CSS `translateX` track | 2.5D CSS parallax + scale transition | Refine `CinematicStage` layer depth in Slice 3/4 |
| **Booking State** | Text response only | Dedicated `BOOKING` review card + `KEY_ISSUED` digital pass | Implement `DigitalKeyPass` component in Slice 4 |
| **Layout Polish** | SpecDock & VoiceHUD non-overlapping at 1440px | Dynamic responsive docking across all screen widths | Refinements already applied and verified in `hud.css` |
| **Focus Navigation** | Keyboard Arrow keys + Space | Complete voice + keyboard + screen reader parity | Accessible ARIA live regions already established |
