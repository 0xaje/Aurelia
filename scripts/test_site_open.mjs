import { spawn } from "child_process";

async function testSiteOpen() {
  console.log("=== VERIFYING SITE OPEN BEHAVIOR IN BROWSER ===");

  const chrome = spawn("/usr/bin/google-chrome", [
    "--headless=new",
    "--remote-debugging-port=9229",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--autoplay-policy=no-user-gesture-required",
    "http://localhost:5173/"
  ], { stdio: "ignore" });

  try {
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 200));
      try {
        const res = await fetch("http://127.0.0.1:9229/json/list");
        if (res.ok) break;
      } catch {}
    }

    const pages = await (await fetch("http://127.0.0.1:9229/json/list")).json();
    console.log("Pages available:", pages.map(p => ({ title: p.title, url: p.url })));
    const page = pages.find(p => p.url.includes("5173")) || pages[0];
    console.log("Connecting to:", page.url);
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    ws.send(JSON.stringify({ id: 999, method: "Runtime.enable" }));

    let callbackId = 1;
    const evaluate = (expr) => new Promise((resolve, reject) => {
      const id = callbackId++;
      const onMsg = (event) => {
        console.log("CDP recv:", event.data);
        const msg = JSON.parse(event.data);
        if (msg.method === "Runtime.consoleAPICalled") {
          console.log("[Browser Console]", ...msg.params.args.map(a => a.value || a.description));
        }
        if (msg.id === id) {
          ws.removeEventListener("message", onMsg);
          if (msg.result?.exceptionDetails) {
            reject(new Error(msg.result.exceptionDetails.text + " " + JSON.stringify(msg.result.exceptionDetails)));
          } else {
            resolve(msg.result?.result?.value);
          }
        }
      };
      ws.addEventListener("message", onMsg);
      ws.send(JSON.stringify({
        id,
        method: "Runtime.evaluate",
        params: { expression: expr, awaitPromise: true, returnByValue: true }
      }));
    });

    // Wait 800ms for site open effects to initialize
    await new Promise(r => setTimeout(r, 800));

    // Check 1: Atmosphere is playing and audible
    const atmoRaw = await evaluate(`JSON.stringify({
      state: window.aureliaAtmosphere?.getState(),
      volume: window.aureliaAtmosphere?.getVolume(),
      gain: window.aureliaAtmosphere?.getEffectiveGain()
    })`);
    const atmoCheck = JSON.parse(atmoRaw || "{}");
    console.log("1. Atmosphere on site open:", atmoCheck);

    // Check 2: Ora welcome greeting displayed
    const whisperRaw = await evaluate(`JSON.stringify({
      whisperText: document.querySelector(".ora-whisper-text")?.textContent,
      oraState: window.aureliaOra?.getState(),
      voiceState: window.aureliaVoice?.getState(),
      isContinuous: window.aureliaVoice?.isContinuous()
    })`);
    const whisperCheck = JSON.parse(whisperRaw || "{}");
    console.log("2. Ora Presence on site open:", whisperCheck);

    if (atmoCheck.state !== "playing") {
      throw new Error(`Atmosphere state is ${atmoCheck.state}, expected playing`);
    }

    if (!whisperCheck.whisperText?.includes("Welcome to Aurelia Sanctuary")) {
      throw new Error(`Whisper text did not contain welcome greeting: ${whisperCheck.whisperText}`);
    }

    console.log("=== SITE OPEN BEHAVIOR VERIFIED SUCCESSFULLY ===");
    ws.close();
  } finally {
    chrome.kill("SIGKILL");
  }
}

testSiteOpen().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
