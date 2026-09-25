---
doc: motion-language
status: draft
---

# AURELIA — Motion Language & Choreography Specification

> **Design Intelligence Gate — Phase 6 & Phase 12**  
> Defining how the hotel environment moves, breathes, and transforms in direct synchronization with conversational voice states.

---

## 1. Motion Philosophy: "The Hotel as a Living Lens"

In typical web applications, motion is decorative: elements slide onto the screen to announce themselves, buttons pop on hover, and loaders spin frantically. 

In **AURELIA**, motion has a singular responsibility: **to communicate spatial and transactional state**.
* When the guest speaks of a room, the viewport does not switch pages; the virtual camera **glides through the property**.
* When the guest asks to see a balcony or bathroom, the camera **pushes forward with focused intent**.
* When the guest asks for evening ambiance, the lighting **dissolves softly across the architecture**.
* When a booking is confirmed, the digital key card **rises with physical weight and permanence**.

Every transition must feel calm, deliberate, and high-end—mirroring the serene pacing of a five-star hotel arrival.

---

## 2. The 4 Camera Movement Primitives

AURELIA uses 4 hardware-accelerated CSS transformation primitives rather than heavy 3D game engines:

```text
1. LATERAL GLIDE (Suite to Suite)
   [ Deluxe ] ──( 550ms Smooth Glide )──> [ Executive Suite ]
   transform: translateX(-100vw)

2. FOCUSED PUSH (Overview to Architectural Feature)
   [ Suite Overview ] ──( 450ms Dolly-In )──> [ Balcony / Tub ]
   transform: scale(1.06) translateY(-1.5%)

3. ATMOSPHERIC DISSOLVE (Day to Night Lighting)
   [ Daylight Layer ] ──( 600ms Cross-Fade )──> [ Evening Mood Layer ]
   opacity: 0 -> 1

4. PHYSICAL ELEVATION (Booking Closure to Digital Key)
   [ Viewport Blur (8px) ] ──( 500ms Spring )──> [ Embossed Key Pass ]
   transform: translateY(16px) -> translateY(0)
```

### Primitive A: Lateral Architectural Glide (`translateX`)
* **When triggered:** User switches rooms (e.g., "Show me the Presidential Suite").
* **Properties:** `transform: translateX(-[index * 100]vw)`
* **Duration:** `550ms`
* **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (Spring-damped deceleration).
* **Sensory Feel:** A smooth tracking shot across adjoining suites. Zero hard cuts.

### Primitive B: Focused Dolly-In (`scale` + `translateY`)
* **When triggered:** User inspects a specific detail (e.g., "Show me the balcony", "Show me the bathroom").
* **Properties:** `transform: scale(1.06) translateY(-1.5%)`
* **Duration:** `450ms`
* **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)`
* **Sensory Feel:** The guest stepping forward to peer over the balcony rail or inspect the soaking tub.

### Primitive C: Atmospheric Dissolve (`opacity`)
* **When triggered:** User requests night view or clicks day/night toggle.
* **Properties:** `opacity: 0 -> 1` on the `.night-layer` while `.day-layer` transitions `1 -> 0`.
* **Duration:** `600ms`
* **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` (Natural linear-to-soft deceleration).
* **Sensory Feel:** Architectural dimming switches fading down daylight while warm interior downlights and city skyline lights awaken.

### Primitive D: Dimensional Elevation (`translateY` + `backdrop-filter`)
* **When triggered:** FSM state moves from `BOOKING` to `KEY_ISSUED`.
* **Properties:** Background stage blurs to `blur(12px)` with a 40% darker scrim; digital key pass slides from `translateY(24px)` to `translateY(0)` with `opacity: 0 -> 1`.
* **Duration:** `500ms`
* **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)`
* **Sensory Feel:** An embossed, heavyweight physical key card being handed across a polished obsidian concierge desk.

---

## 3. Timing, Curves & Token Hierarchy

All timings and curves are centralized in `src/styles/tokens.css` to prevent arbitrary animation sprawl:

| Token Name | Value | Purpose |
|---|---|---|
| `--ease-spring` | `cubic-bezier(0.16, 1, 0.3, 1)` | Camera movement, HUD transitions, Key card arrival |
| `--ease-smooth` | `cubic-bezier(0.4, 0, 0.2, 1)` | Lighting cross-fades, atmospheric scrim transitions |
| `--duration-room` | `550ms` | Lateral camera track between suites |
| `--duration-ambiance` | `600ms` | Day-to-night dissolve |
| `--duration-feature` | `450ms` | Detail zoom to balcony or tub |
| `--duration-hud` | `250ms` | State badge pulse, pill selection, button active states |

---

## 4. Anti-Patterns: What We Forbid in AURELIA Motion

1. **NO Bouncy/Cartoony Springs:** Zero elastic overshoot (`cubic-bezier` values exceeding `1.0` on the y-axis). A luxury hotel is dignified; it does not bounce like a mobile game.
2. **NO Generic Page-Flip or Carousel Slides:** No card carousels with arrow flickers. Movement must feel like camera displacement across physical architecture.
3. **NO Continuous Mouse-Jitter Parallax:** Do not tie aggressive 3D card tilt to the mouse cursor. It causes motion sickness and cheapens the interface.
4. **NO Arbitrary Particle Effects:** No glowing dust motes, fireflies, or confetti.
5. **NO Spinners:** When the AI is listening or understanding, the state dot pulses with warm bronze luminescence (`--color-bronze-glow`), and the HUD bar glows softly. No spinning circular loaders.

---

## 5. Reduced-Motion Architecture (`prefers-reduced-motion`)

For guests sensitive to motion or vestibular disorders:
* When `prefers-reduced-motion: reduce` is detected:
  * Camera zooms and lateral glides are replaced with **instant cross-fades (`150ms opacity`)**.
  * The digital key card fades in without spatial translation.
  * Pulsing animations are replaced with static high-contrast state indicators.
  * Full accessibility is preserved without degrading data fidelity or conversational response.
