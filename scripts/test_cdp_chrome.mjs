import { spawn } from "child_process";

async function run() {
  console.log("Spawning Chrome with fake audio capture...");
  const chrome = spawn("/usr/bin/google-chrome", [
    "--headless=new",
    "--remote-debugging-port=9222",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--use-file-for-fake-audio-capture=/home/oyeolorun/Aurelia/living_room.wav",
    "http://localhost:5173/"
  ], { stdio: "ignore" });

  let connected = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200));
    try {
      const res = await fetch("http://127.0.0.1:9222/json/version");
      if (res.ok) {
        const json = await res.json();
        console.log("Chrome CDP ready:", json.Browser);
        connected = true;
        break;
      }
    } catch {}
  }

  if (!connected) {
    console.error("Failed to connect to Chrome CDP");
    chrome.kill("SIGKILL");
    process.exit(1);
  }

  // Get pages
  const pagesRes = await fetch("http://127.0.0.1:9222/json/list");
  const pages = await pagesRes.json();
  console.log("Pages found:", pages.length, pages[0]?.url);

  chrome.kill("SIGTERM");
  console.log("Chrome closed cleanly.");
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
