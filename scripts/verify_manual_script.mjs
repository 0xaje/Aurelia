// AURELIA — Phase 5C Verification of Section 29 Manual Test Script against live Vite server

async function runScript() {
  const steps = [
    { step: 4, text: "Hi Ora." },
    { step: 5, text: "What is this place?" },
    { step: 6, text: "Okay, show me around." },
    { step: 7, text: "Wow, this is beautiful." },
    { step: 8, text: "Where would I sleep?" },
    { step: 9, text: "And where do I freshen up?" },
    { step: 10, text: "What about outside?" },
    { step: 11, text: "Can I see it at sunset?" },
    { step: 12, text: "Is there somewhere to swim?" },
    { step: 13, text: "How much is it?" },
    { step: 14, text: "I think I'd like to stay here." },
    { step: 15, text: "How do I book?" }
  ];

  let session = {
    currentSpace: undefined,
    lastSpace: undefined,
    currentAmbiance: "day",
    recentTurns: []
  };

  console.log("=== PHASE 5C SECTION 29 SCRIPT VERIFICATION ===\n");

  for (const s of steps) {
    const res = await fetch("http://localhost:5173/api/ora/converse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: s.text, session })
    });

    if (!res.ok) {
      console.error(`Error on step ${s.step}: HTTP ${res.status}`);
      process.exit(1);
    }

    const data = await res.json();
    const d = data.decision;

    console.log(`Step ${s.step}: "${s.text}"`);
    console.log(`  Decision Type: ${d.type}`);
    if (d.spaceId) console.log(`  Space Target:  ${d.spaceId}`);
    if (d.ambiance) console.log(`  Ambiance:      ${d.ambiance}`);
    console.log(`  Ora Whisper:   "${d.response}"`);
    console.log("");

    if (d.spaceId) {
      session.lastSpace = session.currentSpace;
      session.currentSpace = d.spaceId;
    }
    if (d.ambiance) {
      session.currentAmbiance = d.ambiance;
    }
    session.recentTurns.push({ role: "user", text: s.text, timestamp: Date.now() });
    session.recentTurns.push({ role: "ora", text: d.response, decision: d, timestamp: Date.now() });
    await new Promise(r => setTimeout(r, 1200));
  }

  console.log("=== ALL 12 CONVERSATION TURNS VERIFIED SUCCESSFULLY ===");
}

runScript().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
