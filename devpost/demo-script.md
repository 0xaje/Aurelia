# ORA / AURELIA

## Final 3-Minute Demo Script

**Target runtime:** 2:35–2:50  
**Hard maximum:** 3:00  
**Format:** real product interaction, screen recording + voice narration  
**Primary thesis:** ORA lets products become conversationally controllable.  

---

## 0:00–0:12 — OPENING HOOK

### Screen
Start already inside the AURELIA experience.  
Show the strongest cinematic view of the property. Do not begin with the GitHub repository, architecture diagram, documentation, or landing-page explanation.  
Let the visual breathe for 2–3 seconds.

### Voice
> “Most digital products make you navigate them.  
> ORA lets you talk to them.”

Pause briefly.

> “Let me show you.”

### Action
Immediately activate ORA.

---

## 0:12–0:45 — INTERACTION 1: EXPLORE

### User says
> **“Ora, give me a full tour.”**

### Screen
Let the actual Grand Tour run.  
Show several spaces naturally:
* Exterior
* Entrance
* Living room
* Kitchen
* Master bedroom
* Infinity pool

Do **not** manually jump between spaces.  
The point is that the user gave one conversational instruction and ORA orchestrated the experience.

### Voiceover
Keep narration minimal while the tour runs.
> “Instead of searching through a menu, I can simply ask ORA to show me the property.”

Then let the product speak for itself.

### Important
Do not explain the technical implementation here. The judge needs to **see the behavior first**.

---

## 0:45–1:15 — INTERACTION 2: CONTROL THE EXPERIENCE

When the tour finishes, say:
> **“Show me the infinity pool at sunset.”**

### Screen
Show the actual transition:
* navigation to infinity pool
* sunset lighting state
* corresponding visual atmosphere

If the ambient sound changes, let it be audible.

### Voiceover
> “ORA understands the place I'm talking about and changes the experience around it.”

*(If barge-in is stable during rehearsal, demonstrate interruption: “Actually, take me to the master bedroom.” If there is any network variability, skip barge-in to keep the core narrative pristine).*

---

## 1:15–2:00 — INTERACTION 3: FROM CONVERSATION TO ACTION

Now move from exploration to an actual transaction.

### User says
> **“I'd like to stay from October 9th to October 11th. The guest name is John.”**

### Screen
Let ORA process the request.  
The Reservation Pass should appear naturally.

Show:
* AURELIA Sanctuary
* guest name: John
* check-in: October 9, 2026
* check-out: October 11, 2026
* stay duration: 2 nights
* shortlet nightly rate: $1,850 USD / night
* estimated total: $3,700 USD
* request reference: AUR-YYYY-XXXX
* status pill: `READY FOR HANDOFF`

Do not immediately click anything. Give the judge a moment to read the pass.

### Voiceover
> “And the conversation doesn't stop at information.”

Pause.

> “ORA can turn that conversation into a real reservation request.”

Then:

> “It doesn't pretend the booking is confirmed.”

Point visually to the reservation status/disclaimer:

> “It prepares the request with the details the property needs.”

### Critical wording
* Never say: “Your booking is confirmed.”
* Never say: “ORA booked the property.”
* Never say: “The reservation has been sent.”
* The actual state is a **reservation request ready for handoff**.

---

## 2:00–2:25 — WHATSAPP HANDOFF

### Screen
Click:
> **Continue on WhatsApp**

The real WhatsApp deep link opens (`https://wa.me/?text=...`).  
Show the prefilled message. Let the judge see that the message contains the actual reservation information.

### Voiceover
> “From there, ORA hands the prepared request to WhatsApp so the guest can continue with the property.”

Do not claim that the message has already been delivered.  
Do not claim that WhatsApp is directly integrated with the backend.  
The important point is the **handoff**.

---

## 2:25–2:50 — THE PRODUCT THESIS

Return visually to AURELIA.  
Ideally show a beautiful property view rather than the WhatsApp screen.

### Voice
> “AURELIA is the reference environment.”

Pause.

> “ORA is the intelligence layer underneath it.”

Then:

> “The idea is simple: instead of putting another chatbot beside a product, ORA lets the product itself become conversationally controllable.”

Final line:
> **“That's ORA.”**

End.

---

## FINAL SHOT

Hold the strongest AURELIA visual for approximately 2 seconds.  
Do not end on:
* terminal
* GitHub
* code
* test results
* architecture diagram
* browser error
* WhatsApp loading screen

End on the **product**.

---

## EXACT RECORDING CHOREOGRAPHY

| Shot | Timecode | Screen Action | Spoken Instruction / Voiceover |
| :--- | :--- | :--- | :--- |
| **1** | 0:00–0:12 | Exterior cinematic hero resting | *“Most digital products make you navigate them. ORA lets you talk to them. Let me show you.”* |
| **2** | 0:12–0:15 | Tap ORA living presence | *“Ora, give me a full tour.”* |
| **3** | 0:15–0:45 | Autonomous Grand Tour sequence running across spaces | *“Instead of searching through a menu, I can simply ask ORA to show me the property.”* |
| **4** | 0:45–0:50 | Tour completes | *“Show me the infinity pool at sunset.”* |
| **5** | 0:50–1:15 | Smooth transition to pool detail & warm sunset lighting | *“ORA understands the place I'm talking about and changes the experience around it.”* |
| **6** | 1:15–1:30 | Conversational booking prompt | *“I'd like to stay from October 9th to October 11th. The guest name is John.”* |
| **7** | 1:30–2:00 | Reservation Pass emerges with dynamic fields | *“And the conversation doesn't stop at information. ORA can turn that conversation into a real reservation request. It doesn't pretend the booking is confirmed. It prepares the request with the details the property needs.”* |
| **8** | 2:00–2:25 | Click “Continue on WhatsApp” → `wa.me` opens | *“From there, ORA hands the prepared request to WhatsApp so the guest can continue with the property.”* |
| **9** | 2:25–2:50 | Return to AURELIA cinematic scene | *“AURELIA is the reference environment. ORA is the intelligence layer underneath it. The idea is simple: instead of putting another chatbot beside a product, ORA lets the product itself become conversationally controllable. That's ORA.”* |

---

## WHAT NOT TO SHOW
* GitHub repository
* Source code or IDE
* Planning documents (`scope.md`, `prd.md`, `spec.md`)
* Terminal / test output
* Architecture diagrams
* Dependency lists
* Unused UI panels

## WHAT THE JUDGE SHOULD UNDERSTAND
1. **What ORA is:** A conversational intelligence/action layer for products.
2. **Real behavior:** User speaks naturally and the product responds.
3. **Beyond a chatbot:** ORA controls the spatial/environmental product experience directly.
4. **Real action:** Conversation becomes a structured, pricing-verified reservation request.
5. **Real handoff:** The request cleanly bridges to WhatsApp for real-world host conversation.
6. **AURELIA's role:** The luxury shortlet reference implementation demonstrating ORA.

---

## THE ONE-SENTENCE POSITIONING
> **ORA is a conversational intelligence layer that lets products understand natural language, control their experience, and turn conversations into real actions.**  
> *AURELIA is the reference implementation demonstrating that architecture.*

---

## CORE STORY ARC
**Talk → Explore → Control → Act → Handoff**
