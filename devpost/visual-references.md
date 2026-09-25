---
doc: visual-references
status: draft
---

# AURELIA — Curated Visual References & Case Studies

> **Design Intelligence Gate — Phase 4 Research Synthesis**  
> Curated benchmark references analyzing luxury hospitality, architectural presentation, cinematic camera choreography, and conversational visual stages.

---

## 1. Aman Resorts & Sanctuaries
* **Source:** Aman Global Digital Presence (*Nucleus / Matter Of Form*)
* **URL:** [https://www.aman.com](https://www.aman.com)
* **Category:** Luxury Hotel / Spatial Restraint
* **What is visually useful:**
  * The "Luxury of Silence": radical negative space, muted architectural framing, and patient visual pacing.
  * Absence of aggressive promotional badges, banner clutter, and popups.
  * Editorial typographic hierarchy pairing classical serif headings with whisper-quiet, tracked sans-serif metadata.
* **What AURELIA should learn from it:**
  * Treat the hotel environment as a physical sanctuary on screen. 
  * Information should appear as an authoritative architectural placard (like our `SpecDock`), not a frantic e-commerce checkout card.
  * The color balance between deep obsidian shadows and warm, soft natural light creates instant calm.
* **What AURELIA should NOT copy:**
  * Static, brochure-like navigation paradigms (dense nested hamburger menus).
  * Multi-step date-picker booking engine overlays that detach from the visual sanctuary.
* **Which part of AURELIA it informs:**
  * `SpecDock` typography, spacing tokens, and the initial `IDLE` state atmosphere.

---

## 2. Cheval Blanc Maisons (LVMH Hotel Management)
* **Source:** Cheval Blanc Official Digital Platform
* **URL:** [https://www.chevalblanc.com](https://www.chevalblanc.com)
* **Category:** Ultra-Luxury Hospitality Art Direction
* **What is visually useful:**
  * Warm, tactile materiality: textures of hand-plastered walls, woven linens, brushed bronze, and honed travertine marble.
  * Lighting that communicates time-of-day intimacy rather than clinical studio flashes.
  * Smooth cross-fades between high-resolution architectural vignettes that preserve physical spatial logic.
* **What AURELIA should learn from it:**
  * The lighting switch from Day to Night must not just dim the screen; it must cross-fade into intentional, amber architectural accent lighting (downlights, bedside lamps, glowing city horizons).
  * Suite descriptions must focus on physical tactile details ("deep freestanding soaking tub", "honed travertine terrace").
* **What AURELIA should NOT copy:**
  * Full-screen autoplay video backgrounds with loud soundtrack cues that overwhelm conversational audio.
  * Excessive decorative script fonts that degrade accessibility or reading speed.
* **Which part of AURELIA it informs:**
  * `CinematicStage` day/night ambiance cross-fades and material textures for Gemini image generation.

---

## 3. The Edition Hotels (Ian Schrager & Marriott Luxury)
* **Source:** The Edition Digital Identity
* **URL:** [https://www.editionhotels.com](https://www.editionhotels.com)
* **Category:** Modern Cosmopolitan Boutique
* **What is visually useful:**
  * Dark obsidian and charcoal atmosphere accented with warm, luminous champagne-gold highlights.
  * High-contrast chiaroscuro photography where furniture and architectural geometry emerge from velvety dark backgrounds.
  * Confident, restrained layout geometry that feels architectural rather than templated.
* **What AURELIA should learn from it:**
  * The `#0B0C0E` dark obsidian palette and `#D4AF37` bronze accent already present in AURELIA's tokens directly channel this world.
  * Dark mode is not an afterthought toggle; it is the default native skin of the hotel experience.
* **What AURELIA should NOT copy:**
  * Corporate Marriott reservation iframe widgets injected into the bottom of the page.
* **Which part of AURELIA it informs:**
  * Overall color tokens, glassmorphism boundaries, and ambient scrim gradients.

---

## 4. ERA Residence & Architectural Three.js Walkthroughs
* **Source:** Awwwards Site of the Day / Luxury Real Estate Visual Showcase
* **URL:** [https://www.awwwards.com/sites/era-residence](https://www.awwwards.com/sites/era-residence)
* **Category:** Architectural Camera Exploration
* **What is visually useful:**
  * Spatial camera moves: slow camera pushes (dolly-in) and smooth lateral glides that give the eye time to absorb depth.
  * A building treated as a single, coherent hero object rather than disconnected photo thumbnails.
  * The camera glides with spring-damped inertia rather than abrupt linear cuts.
* **What AURELIA should learn from it:**
  * When shifting between rooms or zooming into a balcony, use controlled scale (`transform: scale(1.06)`) and subtle lateral translation (`translateX(-3%)`) over 500–600ms with a custom cubic-bezier curve (`cubic-bezier(0.16, 1, 0.3, 1)`).
  * The user must feel that the virtual camera moved through the hotel, not that an image was swapped.
* **What AURELIA should NOT copy:**
  * Heavy, battery-draining WebGL 3D models with 50MB geometry downloads that stutter on mobile or slower devices.
  * Complex 3D orbit controls that force the user to navigate with a virtual joystick.
* **Which part of AURELIA it informs:**
  * `CinematicStage` motion transitions, camera glide timings, and the `VISUAL_TRANSITION` state.

---

## 5. Arun N.M. — Ambient Conversational Stage ("Chat Engine to Behaviour Engine")
* **Source:** Awwwards Nominee Portfolio & Experimental Case Study
* **URL:** [https://arunnm.com](https://arunnm.com)
* **Category:** Conversational Interface as Environmental Controller
* **What is visually useful:**
  * The conversation does not live in an isolated chat bubble; it acts as a conductor for the entire visual stage.
  * Dialogue lines trigger environmental state transitions: lighting dims, stage elements reposition, and focal typography updates smoothly.
  * Non-blocking HUD: the voice/text input is docked at the base as an elegant control instrument rather than an intrusive overlay.
* **What AURELIA should learn from it:**
  * The core architectural proof: Speech input emits an intent event → state engine updates → visual stage transitions.
  * The AI's spoken words are paired with a clean, subtitle-style transcript ribbon that breathes with the speech.
* **What AURELIA should NOT copy:**
  * Playful, whimsical animations (floating bouncy spheres, neon gradients) that contradict luxury hospitality calm.
  * Flashing interactive novelties that distract from hotel credibility.
* **Which part of AURELIA it informs:**
  * The `VoiceHUD` dock design, transcript ribbon animation, and FSM synchronization.

---

## 6. Apple Design Awards — Spatial Continuity & Proactive Instruments
* **Source:** Apple Human Interface Guidelines & VisionOS Spatial Design Case Studies
* **URL:** [https://developer.apple.com/design/human-interface-guidelines](https://developer.apple.com/design/human-interface-guidelines)
* **Category:** System-Level Interface Restraint
* **What is visually useful:**
  * Proactive dock placement: floating glass controls docked at the ergonomic base of the viewport with subtle specular rim lighting (`rgba(255, 255, 255, 0.08)`).
  * Direct manipulation feel: physical objects (like our upcoming Digital Key Pass) have tangible weight, subtle corner radii (1.5rem), and crisp typography.
  * Accessible high-contrast focus rings (`:focus-visible` with 3px offset) and strict WCAG 2.2 AA text ratios.
* **What AURELIA should learn from it:**
  * Glassmorphism must be optically grounded (`backdrop-filter: blur(28px)`) with dark tinted backing, never washed-out milk glass.
  * Every control must have an accessible keyboard and screen-reader equivalent.
* **What AURELIA should NOT copy:**
  * iOS-style rounded switches or segmented pills that look like consumer mobile settings rather than a 5-star hotel concierge.
* **Which part of AURELIA it informs:**
  * `VoiceHUD` glass tokens, `SpecDock` badge layouts, and Digital Key Pass geometry.

---

## 7. Comparative Reference Matrix

| Reference | Core Value to AURELIA | Anti-Pattern to Avoid | Applied Feature in AURELIA |
|---|---|---|---|
| **Aman** | Unhurried spatial silence & editorial typography | Brochure-style dropdown complexity | `SpecDock` layout & `IDLE` atmosphere |
| **Cheval Blanc** | Tactile material textures & amber evening lighting | Overbearing soundtrack video | Day-to-Night cross-fade & asset prompt system |
| **The Edition** | Dark obsidian chiaroscuro & bronze specular warmth | Corporate hotel reservation iframe widgets | Color tokens & glass surface styling |
| **ERA Residence** | Camera dolly & lateral glide motion language | Heavy WebGL 3D asset downloads | 2.5D CSS parallax & scale camera transitions |
| **Arun N.M.** | Conversation as environmental state engine | Whimsical neon bounce effects | VoiceHUD subtitle ribbon & FSM event link |
| **Apple Design** | Optically grounded dark glass & accessibility discipline | Generic mobile consumer widget patterns | Surface tokens, focus rings, WCAG 2.2 compliance |
