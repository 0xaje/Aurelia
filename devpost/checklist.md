---
doc: checklist
status: approved
---

# Build Checklist — AURELIA

Build mode: fast

## Slices

- [x] **1. Visual foundation & deterministic stage state**
  Becomes usable: Running Vite + React + Vanilla CSS app showing responsive cinematic hotel interface with the 3 curated rooms, deterministic UI state machine, room focus transitions, feature focus, and day/night ambiance toggle.
  Why now: Establishes the visual body of the conversation before wiring speech or tool loops.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > The 8 Definitive Interface States`
  Spec ref: `spec.md > Frontend Architecture`, `spec.md > Components`, `spec.md > State Machine`
  Build: Scaffold project, configure TypeScript and Vanilla CSS tokens, build `CinematicStage`, `SpecDock`, `VoiceHUD` visual shell, and deterministic state machine with actions.
  Verify (mechanical): Dev server runs with zero errors; cycling rooms shifts camera glide; day/night toggle crossfades ambiance; spec dock shows exact Naira prices.
  Learner check: Verify the three rooms (Deluxe ₦85k, Executive ₦145k, Presidential ₦280k) render with distinct ambience and responsive motion.
  Commit: `build: establish aurelia visual foundation`

- [x] **2. Text command path & deterministic data engine**
  Becomes usable: The complete signature path works end-to-end via text input with zero microphone dependency.
  Why now: Proves the conversational reasoning, tool contracts, and state transitions reliably before adding audio streaming complexity.
  PRD ref: `prd.md > Primary User Journey`, `prd.md > Text Fallback`
  Spec ref: `spec.md > Tool Contracts`, `spec.md > Text Fallback Lifecycle`
  Build: Implement backend room query service, local text interpreter mapping natural language to `search_rooms` and `adjust_view`, and connect to typed UI action bus.
  Verify (mechanical): Typing anniversary query focuses Executive Suite; typing night view crossfades ambiance; zero hallucinations.
  Commit: `feat: add deterministic text command path`

- [ ] **3. AssemblyAI Voice Agent integration (Route A)**
  Becomes usable: Full spoken dialogue over WebSocket using server-minted ephemeral tokens, 24 kHz PCM16 audio streaming, neural turn detection, tool execution, and barge-in.
  Why now: Brings the hero voice capability into the already functioning visual stage.
  PRD ref: `prd.md > Voice Interaction Model`
  Spec ref: `spec.md > AssemblyAI Voice Agent Integration Protocol`
  Build: Implement backend `/api/voice/token`, browser AudioWorklet for 24 kHz PCM, WebSocket client handling `session.update`, `tool.call`, `reply.done`, and barge-in audio flushing.
  Verify (mechanical): Spoken commands stream audio, trigger tool calls, and update UI state; speaking during playback interrupts immediately.
  Commit: `build: integrate assemblyai voice agent`

- [ ] **4. Truthful booking persistence & digital stay pass**
  Becomes usable: Speaking "Book it for John" creates an immutable, mutex-serialized booking record on the server and reveals the embossed digital stay pass.
  Why now: Completes the final closure of the product loop: `DECIDE → BOOK → KEY`.
  PRD ref: `prd.md > Booking Flow Semantics`, `prd.md > Digital Key Semantics`
  Spec ref: `spec.md > Persistence Strategy`, `spec.md > Digital-Key Semantics`
  Build: Backend atomic booking writer with Promise mutex queue, `create_booking` tool execution, and `DigitalKeyPass` interactive card component.
  Verify (mechanical): Booking record written to `data/bookings.json`; survives reload; key displays correct reference and demonstration token.
  Commit: `build: implement truthful booking flow`

## Hands-on Checkpoints

- [x] Early usable behavior explored — Slice 1 visual stage and state transitions
- [x] Core journey verified via text mode (Slice 2)
- [ ] Voice agent and booking verified end-to-end (Slice 3 & 4)

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete
- [ ] `devpost/app-map.html` generated and verified

## Revisions
