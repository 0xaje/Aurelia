---
doc: checklist
status: complete
---

# Build Checklist — ORA & AURELIA

Build mode: fast (disciplined, verified slices)

## Implementation Phases

- [x] **PHASE 1 — Product Truth & Documentation Reconciliation**
  - **Becomes usable:** All planning and technical specifications (`scope.md`, `prd.md`, `spec.md`, `checklist.md`) truthfully reflect ORA as the product and AURELIA Sanctuary as the luxury shortlet reference implementation.
  - **Why now:** Eliminates all discrepancies between documented claims and active code.
  - **Verify (mechanical):** Documents contain zero references to hotel rooms or PMS inventory; all 210 existing tests pass.
  - **Status:** Complete.

- [x] **PHASE 2 — Minimal ORA / Product Adapter Boundary**
  - **Becomes usable:** ORA Core is formally decoupled from Aurelia via the `ProductAdapter` contract; pure fast-path spatial logic is extracted into a shared client/server module without dynamic server imports.
  - **Why now:** Establishes ORA as the reusable intelligence layer while preserving 100% of existing spatial, audio, and voice capabilities.
  - **Files:** `src/ora/productAdapter.ts`, `src/ora/aureliaAdapter.ts`, `src/ora/fastPath.ts`.
  - **Verify (mechanical):** 10 adapter unit tests pass; `npm run build` succeeds; zero TypeScript errors.
  - **Status:** Complete.

- [x] **PHASE 3 — Transaction Intent & Real Shortlet Reservation Request Flow**
  - **Becomes usable:** Speaking *"Ora, I’d like to reserve AURELIA for John from October 9th to October 11th"* extracts guest name and stay dates, calculates verified pricing ($1,850/night × 2 = $3,700), generates an `AUR-YYYY-XXXX` reference, transitions status to `READY_FOR_HANDOFF`, and displays the glassmorphic Reservation Pass. Incomplete requests remain `DRAFT` and ask for missing details.
  - **Why now:** Moves ORA beyond passive spatial exploration into verified business transactions.
  - **Files:** `src/domain/reservationTypes.ts`, `src/domain/reservationConfig.ts`, `src/domain/reservationLogic.ts`, `src/domain/reservationStore.ts`, `src/domain/reservationExtractor.ts`, `src/components/ReservationPass/ReservationPass.tsx`, `src/components/ReservationPass/ReservationPass.css`.
  - **Verify (mechanical):** 17 reservation tests pass (237/237 total); `npm run build` succeeds in ~3s.
  - **Status:** Complete.

- [x] **PHASE 4 — Visual Reservation Pass & Real WhatsApp Handoff**
  - **Becomes usable:** Clicking *"Continue on WhatsApp"* on the Reservation Pass opens a genuine prefilled `https://wa.me/?text=...` URI delivering the reservation request; status transitions to `HANDOFF_OPENED`.
  - **Why now:** Completes the end-to-end customer journey from spoken exploration to mobile transaction handoff.
  - **Files:** `src/domain/reservationHandoff.ts`, `src/components/ReservationPass/ReservationPass.tsx`, `src/components/ReservationPass/ReservationPass.css`, `src/ora/aureliaAdapter.ts`, `tests/handoff.test.ts`.
  - **Verify (mechanical):** 13 handoff tests pass (250/250 total); `npm run build` succeeds in ~2s.
  - **Status:** Complete.

- [x] **PHASE 5 — Final Architecture Cleanup & Repository Readiness**
  - **Becomes usable:** Orphaned prototype files (`VoiceHUD.tsx`, `SpecDock.tsx`, `CinematicStage.tsx`, `hud.css`, `stage.css`) safely removed; client/server boundary cleanly decoupled (no server engine in client bundle); metadata updated to truthful shortlet sanctuary language.
  - **Why now:** Ensures the codebase is pristine, maintainable, defensible, and verified for judging.
  - **Verify (mechanical):** 252/252 tests pass; production build succeeds in ~1.5s with zero externalized server modules or server engine bundles.
  - **Status:** Complete.
