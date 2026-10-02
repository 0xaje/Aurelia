import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.nextId = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method) {
        const listeners = this.eventListeners.get(msg.method) || [];
        listeners.forEach((fn) => fn(msg.params));
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, callback) {
    if (!this.eventListeners.has(method)) {
      this.eventListeners.set(method, []);
    }
    this.eventListeners.get(method).push(callback);
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }

  async evaluate(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || "Evaluation error");
    }
    return res.result?.value;
  }

  async waitForSelector(selector, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const exists = await this.evaluate(`!!document.querySelector('${selector}')`);
        if (exists) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  }
}

async function spawnChrome(audioWavPath) {
  const chrome = spawn(
    "/usr/bin/google-chrome",
    [
      "--headless=new",
      "--remote-debugging-port=9222",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      `--use-file-for-fake-audio-capture=${audioWavPath}`,
      "http://localhost:5173/"
    ],
    { stdio: "ignore" }
  );

  let targetWsUrl = null;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const res = await fetch("http://127.0.0.1:9222/json/list");
      if (res.ok) {
        const pages = await res.json();
        const appPage = pages.find((p) => p.url.includes("localhost:5173"));
        if (appPage) {
          targetWsUrl = appPage.webSocketDebuggerUrl;
          break;
        }
      }
    } catch {}
  }

  if (!targetWsUrl) {
    chrome.kill("SIGKILL");
    throw new Error("Could not find AURELIA page target in Chrome");
  }

  const client = new CDPClient(targetWsUrl);
  await client.connect();

  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Network.enable");

  return { chrome, client };
}

async function runSession1LivingRoom() {
  console.log("\n========================================================");
  console.log("TEST 1: Real Voice Command 'Show me the living room.'");
  console.log("========================================================");

  const wavPath = path.resolve("living_room.wav");
  const { chrome, client } = await spawnChrome(wavPath);

  const networkEvents = {
    tokenRequests: [],
    tokenResponses: [],
    webSockets: [],
    wsFramesSent: 0,
    wsFramesReceived: []
  };

  client.on("Runtime.consoleAPICalled", (params) => {
    const text = params.args.map((a) => a.value ?? a.description).join(" ");
    console.log("[Browser Console]", text);
  });

  client.on("Runtime.exceptionThrown", (params) => {
    console.error("[Browser Error]", params.exceptionDetails.text, params.exceptionDetails.exception?.description);
  });

  client.on("Network.requestWillBeSent", (params) => {
    if (params.request.url.includes("/api/assemblyai/token")) {
      console.log("[Network] Request to token endpoint:", params.request.url);
      networkEvents.tokenRequests.push(params.request);
    }
  });

  client.on("Network.responseReceived", (params) => {
    if (params.response.url.includes("/api/assemblyai/token")) {
      console.log("[Network] Token response status:", params.response.status);
      networkEvents.tokenResponses.push(params.response);
    }
  });

  client.on("Network.webSocketCreated", (params) => {
    console.log("[Network] WebSocket created:", params.url);
    networkEvents.webSockets.push(params.url);
  });

  client.on("Network.webSocketFrameSent", () => {
    networkEvents.wsFramesSent++;
    if (networkEvents.wsFramesSent % 20 === 0) {
      console.log(`[Audio Streaming] Sent ${networkEvents.wsFramesSent} chunks (approx ${networkEvents.wsFramesSent * 100}ms)`);
    }
  });

  client.on("Network.webSocketFrameReceived", (params) => {
    try {
      const data = JSON.parse(params.response.payloadData);
      console.log("[WebSocket Received]", data.type, JSON.stringify(data).slice(0, 150));
      networkEvents.wsFramesReceived.push(data);
    } catch {
      console.log("[WebSocket Received raw]", params.response.payloadData.slice(0, 100));
    }
  });

  try {
    // Wait for page to initialize and Ora anchor to mount
    await new Promise((r) => setTimeout(r, 1000));
    await client.waitForSelector(".ora-presence-anchor");

    const initialFrame = await client.evaluate("window.aureliaCamera ? window.aureliaCamera.getCurrentFrame() : null");
    console.log("1. Initial camera frame:", initialFrame);

    // Click Ora presence anchor to open surface
    console.log("2. Clicking Ora anchor to reveal input surface...");
    await client.evaluate(`
      const anchor = document.querySelector('.ora-presence-anchor');
      anchor.click();
    `);
    await client.waitForSelector(".ora-surface-mic");

    // Click mic button
    console.log("3. Clicking Ora microphone button in UI...");
    await client.evaluate(`
      const micBtn = document.querySelector('.ora-surface-mic');
      micBtn.click();
    `);

    // Monitor voice session progression
    console.log("4. Listening and streaming real audio to AssemblyAI...");
    let finalReceived = false;
    let finalTranscript = "";
    let interimActionsTriggered = 0;

    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 250));

      const status = await client.evaluate(`({
        voiceState: window.aureliaVoice.getState(),
        transcript: window.aureliaVoice.getTranscript(),
        oraState: window.aureliaOra.getState(),
        userMessages: (window.aureliaOra.getSession()?.history || []).filter(m => m.sender === "user"),
        currentFrame: window.aureliaCamera.getCurrentFrame(),
        isNavigating: window.aureliaCamera.isNavigating(),
        whisperText: document.querySelector('.ora-whisper-text')?.textContent
      })`);

      // If actions happened while still listening/partial without final utterance, mark violation
      if (status.voiceState === "listening" && status.userMessages.length > 0) {
        interimActionsTriggered++;
      }

      if (status.userMessages.length > 0) {
        finalReceived = true;
        finalTranscript = status.userMessages[status.userMessages.length - 1]?.text || "";
        console.log(`\n>> Final transcript received: "${finalTranscript}"`);
        console.log(">> Session history user messages:", status.userMessages.length);
        console.log(">> Whisper response displayed:", status.whisperText);
        console.log(">> Camera moving? ", status.isNavigating, " Current frame:", status.currentFrame);
        break;
      }
    }

    if (!finalReceived) {
      throw new Error("Timed out waiting for AssemblyAI final transcript and Ora execution");
    }

    // Wait for camera to finish navigating to landmark
    console.log("5. Waiting for camera animation to settle at landmark...");
    let settledFrame = 0;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const cam = await client.evaluate(`({
        frame: window.aureliaCamera.getCurrentFrame(),
        navigating: window.aureliaCamera.isNavigating()
      })`);
      settledFrame = cam.frame;
      if (!cam.navigating && cam.frame === 170) {
        break;
      }
    }
    console.log("6. Camera settled at frame:", settledFrame);

    // Verify microphone is closed / stopped
    const micCapturing = await client.evaluate(`
      window.aureliaVoice.getState() !== "listening"
    `);
    console.log("7. Voice session returned from listening? ", micCapturing);

    // Verify network events
    console.log("8. Network audit:");
    console.log("   - Token request count:", networkEvents.tokenRequests.length);
    console.log("   - WebSockets created:", networkEvents.webSockets.length, networkEvents.webSockets[0]);
    console.log("   - Audio chunks sent:", networkEvents.wsFramesSent);
    const serverMsgTypes = networkEvents.wsFramesReceived.map((m) => m.type);
    console.log("   - AssemblyAI server message types received:", [...new Set(serverMsgTypes)]);

    // Check pass/fail for Test 1
    const test1Pass =
      networkEvents.tokenRequests.length >= 1 &&
      networkEvents.webSockets.some((u) => u.startsWith("wss://streaming.assemblyai.com/v3/ws")) &&
      networkEvents.wsFramesSent > 0 &&
      finalTranscript.toLowerCase().includes("living room") &&
      settledFrame === 170 &&
      interimActionsTriggered === 0;

    return {
      pass: test1Pass,
      transcript: finalTranscript,
      settledFrame,
      networkEvents,
      interimActionsTriggered
    };
  } finally {
    client.close();
    chrome.kill("SIGTERM");
  }
}

async function runSession2PoolSunset() {
  console.log("\n========================================================");
  console.log("TEST 2: Real Voice Command 'Show me the pool at sunset.'");
  console.log("========================================================");

  const wavPath = path.resolve("pool_sunset.wav");
  const { chrome, client } = await spawnChrome(wavPath);

  client.on("Runtime.consoleAPICalled", (params) => {
    const text = params.args.map((a) => a.value ?? a.description).join(" ");
    console.log("[Browser Console S2]", text);
  });

  client.on("Network.webSocketFrameReceived", (params) => {
    try {
      const data = JSON.parse(params.response.payloadData);
      console.log("[WebSocket S2 Received]", data.type || "Turn", JSON.stringify(data).slice(0, 150));
    } catch {}
  });

  try {
    await new Promise((r) => setTimeout(r, 1000));
    await client.waitForSelector(".ora-presence-anchor");

    // Click Ora presence anchor to open surface
    await client.evaluate(`
      const anchor = document.querySelector('.ora-presence-anchor');
      anchor.click();
    `);
    await client.waitForSelector(".ora-surface-mic");

    // Click mic button
    console.log("1. Clicking Ora microphone button for pool at sunset...");
    await client.evaluate(`
      const micBtn = document.querySelector('.ora-surface-mic');
      micBtn.click();
    `);

    // Wait for execution
    let finalTranscript = "";
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const status = await client.evaluate(`({
        userMessages: (window.aureliaOra.getSession()?.history || []).filter(m => m.sender === "user"),
        oraState: window.aureliaOra.getState()
      })`);

      if (status.userMessages.length > 0) {
        finalTranscript = status.userMessages[status.userMessages.length - 1]?.text || "";
        console.log(`>> Final transcript received: "${finalTranscript}"`);
        break;
      }
    }

    if (!finalTranscript) {
      throw new Error("Timed out waiting for AssemblyAI final transcript for pool at sunset");
    }

    // Wait for ambiance and detail space to update
    await new Promise((r) => setTimeout(r, 800));

    const result = await client.evaluate(`({
      spaceDisplayName: document.querySelector('.space-display-name')?.textContent,
      activeNavBtn: document.querySelector('.space-nav-btn.active')?.textContent,
      whisperText: document.querySelector('.ora-whisper-text')?.textContent
    })`);

    console.log("2. Combined execution result:", result);

    const test2Pass =
      finalTranscript.toLowerCase().includes("pool") &&
      finalTranscript.toLowerCase().includes("sunset") &&
      (result.spaceDisplayName?.includes("Pool") || result.activeNavBtn?.includes("Pool"));

    return {
      pass: test2Pass,
      transcript: finalTranscript,
      result
    };
  } finally {
    client.close();
    chrome.kill("SIGTERM");
  }
}

async function runSession3StopAndText() {
  console.log("\n========================================================");
  console.log("TEST 3: Manual Microphone Stop & Text Input Verification");
  console.log("========================================================");

  const wavPath = path.resolve("living_room.wav");
  const { chrome, client } = await spawnChrome(wavPath);

  try {
    await new Promise((r) => setTimeout(r, 1000));
    await client.waitForSelector(".ora-presence-anchor");

    // Test 3A: Start and immediately stop microphone
    console.log("1. Testing manual microphone stop button...");
    await client.evaluate(`
      const anchor = document.querySelector('.ora-presence-anchor');
      anchor.click();
    `);
    await client.waitForSelector(".ora-surface-mic");

    await client.evaluate(`
      document.querySelector('.ora-surface-mic')?.click();
    `);
    await new Promise((r) => setTimeout(r, 300));

    const stateWhileListening = await client.evaluate("window.aureliaVoice.getState()");
    console.log("   - State while listening:", stateWhileListening);

    // Click stop
    await client.evaluate(`
      document.querySelector('.ora-surface-mic')?.click();
    `);
    await new Promise((r) => setTimeout(r, 300));

    const stateAfterStop = await client.evaluate("window.aureliaVoice.getState()");
    console.log("   - State after manual stop:", stateAfterStop);

    // Test 3B: Text Input still works unchanged
    console.log("2. Testing text input form submission...");
    await client.evaluate(`
      const input = document.querySelector('.ora-surface-input');
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, "Show me the kitchen.");
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const submitBtn = document.querySelector('.ora-surface-submit');
      if (submitBtn && !submitBtn.disabled) {
        submitBtn.click();
      } else {
        const form = document.querySelector('.ora-input-surface');
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    `);

    let settledFrame = 0;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      const cam = await client.evaluate(`({
        frame: window.aureliaCamera.getCurrentFrame(),
        navigating: window.aureliaCamera.isNavigating()
      })`);
      settledFrame = cam.frame;
      if (!cam.navigating && cam.frame === 245) {
        break;
      }
    }
    console.log("   - Text command settled camera at frame:", settledFrame);

    return {
      manualStopPass: stateWhileListening === "listening" && stateAfterStop !== "listening",
      textInputPass: settledFrame === 245
    };
  } finally {
    client.close();
    chrome.kill("SIGTERM");
  }
}

async function runSecurityAudit() {
  console.log("\n========================================================");
  console.log("SECURITY & API KEY EXPOSURE AUDIT");
  console.log("========================================================");

  const envContent = fs.readFileSync(".env", "utf8");
  const rawKey = envContent.match(/ASSEMBLYAI_API_KEY=([^\s]+)/)?.[1];
  if (!rawKey) {
    throw new Error("Could not find ASSEMBLYAI_API_KEY in .env");
  }

  // 1. Audit client source files in src/
  const srcFiles = [];
  function scan(dir) {
    fs.readdirSync(dir).forEach((file) => {
      const full = path.join(dir, file);
      if (fs.statSync(full).isDirectory()) scan(full);
      else if (/\.(ts|tsx|js|jsx|html|css|json)$/.test(file)) srcFiles.push(full);
    });
  }
  scan("src");

  let leakedInSrc = false;
  for (const f of srcFiles) {
    const text = fs.readFileSync(f, "utf8");
    if (text.includes(rawKey)) {
      console.error(`LEAK DETECTED in source file: ${f}`);
      leakedInSrc = true;
    }
  }

  // 2. Audit production bundle in dist/
  let leakedInDist = false;
  if (fs.existsSync("dist")) {
    const distFiles = [];
    function scanDist(dir) {
      fs.readdirSync(dir).forEach((file) => {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) scanDist(full);
        else distFiles.push(full);
      });
    }
    scanDist("dist");

    for (const f of distFiles) {
      const text = fs.readFileSync(f, "utf8");
      if (text.includes(rawKey)) {
        console.error(`LEAK DETECTED in dist bundle: ${f}`);
        leakedInDist = true;
      }
    }
  }

  // 3. Audit token endpoint response
  const tokenRes = await fetch("http://localhost:5173/api/assemblyai/token");
  const tokenData = await tokenRes.json();
  const leakedInTokenApi = JSON.stringify(tokenData).includes(rawKey);

  console.log("Security Audit Results:");
  console.log(" - Leaked in src files:", leakedInSrc);
  console.log(" - Leaked in dist bundle:", leakedInDist);
  console.log(" - Leaked in token API:", leakedInTokenApi);
  console.log(" - Ephemeral token minted successfully:", !!tokenData.token);

  return {
    pass: !leakedInSrc && !leakedInDist && !leakedInTokenApi && !!tokenData.token
  };
}

async function main() {
  const res1 = await runSession1LivingRoom();
  const res2 = await runSession2PoolSunset();
  const res3 = await runSession3StopAndText();
  const sec = await runSecurityAudit();

  console.log("\n========================================================");
  console.log("FINAL REPORT AGGREGATION");
  console.log("========================================================");
  console.log("Test 1 (Living Room):", res1.pass ? "PASS" : "FAIL");
  console.log("Test 2 (Pool at Sunset):", res2.pass ? "PASS" : "FAIL");
  console.log("Test 3 (Manual Stop):", res3.manualStopPass ? "PASS" : "FAIL");
  console.log("Test 3 (Text Input):", res3.textInputPass ? "PASS" : "FAIL");
  console.log("Security Audit:", sec.pass ? "PASS" : "FAIL");
}

main().catch((err) => {
  console.error("FATAL ERROR IN VERIFICATION:", err);
  process.exit(1);
});
