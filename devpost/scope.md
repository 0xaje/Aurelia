---
doc: scope
status: approved
---

# AURELIA

A conversational hotel interface where the hotel website becomes the visual body of the AI conversation.

## The Unique Kernel
Instead of an AI chatbot floating in a corner widget or a blind voice assistant, the application viewport dynamically shifts its visual focus, ambient environment, and room state in real-time response to the guest's natural spoken conversation, closing the loop with a deterministic booking record and digital key transition.

## Who It's For
A traveler or guest (e.g. planning an anniversary or retreat) who knows what they want in natural human terms ("quiet with a balcony, around ₦150k") rather than navigating complex filter dropdowns, date pickers, and disconnected modal popups.

## The Core Loop
1. **SPEAK**: The guest speaks natural preferences, questions, or instructions into the microphone.
2. **UNDERSTAND**: The AI parses conversational intent, resolves ambiguity, and triggers deterministic tool calls.
3. **EXPLORE**: The hotel viewport visibly responds: smooth camera/focus transitions bring the matching room into view, reveals requested amenities (e.g. bathtub, balcony), or adjusts scene ambience (e.g. evening view).
4. **DECIDE**: The guest verifies the room details through conversational Q&A grounded exclusively in factual hotel data.
5. **BOOK**: The guest states "Book it", prompting a single confirmation and creating an immutable backend booking record.
6. **KEY**: The interface transitions into an access/confirmed state, rendering an active digital booking pass / room key.

## Inspiration & Identity
- **Mood & Tone**: Modern luxury boutique hotel — warm dark obsidian tones, warm gold/bronze accents, architectural typography, glassmorphism, seamless layout transitions.
- **Motion Principle**: Motion communicates application state, not decorative distraction. Shifting focus, spotlighting amenities, crossfading lighting from day to dusk/night, and morphing the room card into a digital access credential.
- **References**: High-end boutique hospitality portfolios (e.g. Aman, Edition) paired with dynamic spatial interfaces.

## Why This Matters to the Learner
To break out of the standard "chatbot wrapper" pattern and prove a native conversational architecture where voice dialogue directly drives reactive application state, deterministic business logic, and visual immersion.

## What "Working" Looks Like
A live, interactive web application where a user can press-to-talk (or speak via live audio stream), state a multi-faceted room preference in Nigerian Naira (₦), watch the screen smoothly orient to the matching suite, ask a visual amenity question ("What does it look like at night?" or "Does it have a bathtub?"), confirm the reservation with "Book it", and watch the viewport morph into a confirmed stay pass with an issued Booking ID and digital room key — with zero hallucinated inventory or pricing.

## The POC Boundary
- **In Scope**:
  - Single fictional property: "Aurelia Hotel".
  - Exactly 3 distinct, curated rooms (Deluxe Room @ ₦85,000, Executive Suite @ ₦145,000, Presidential Suite @ ₦280,000).
  - Explicit deterministic room inventory schema (amenities, high-res curated imagery, daylight/night variants, exact pricing).
  - Constrained frontend state machine driven by structured tool events (`show_room`, `show_amenity`, `change_scene`, `create_booking`, `show_key`).
  - Voice input pipeline (AssemblyAI Voice Agent or Realtime STT + LLM tool loop) with text fallback for testing and grading reliability.
  - In-memory deterministic booking store and digital key issuance.
- **Later**:
  - Multi-property search, custom date range pricing multipliers, real PMS integration, user accounts, SMS/WhatsApp confirmation dispatch.

## Explicitly Cut
- **Payment Gateway (Stripe/Paystack)**: Adds webhook complexity, credential overhead, and drop-off risk without proving the conversational UI thesis.
- **Arbitrary DOM/Agent Browser Control**: Replaced with a strictly typed event/action bus to ensure deterministic, snappy, bulletproof UI transitions.
- **Multi-Agent Architectures**: Adds non-deterministic orchestration latency and debugging fragility to an MVP that needs instantaneous sub-second visual responses.
- **Ancillary Booking (Spa, Dining, Airport Transfer)**: Distracts from the primary guest room booking and key issuance loop.
- **Phone / Twilio Call In**: Keeps the focus on the synchronized visual viewport on the web screen.
