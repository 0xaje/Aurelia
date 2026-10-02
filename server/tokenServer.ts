import http from "node:http";
import { handleTokenRequest } from "./tokenHandler";

const PORT = parseInt(process.env.PORT || "3001", 10);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  if (url.pathname === "/api/assemblyai/token" || url.pathname === "/api/token") {
    await handleTokenRequest(req, res);
  } else if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", service: "aurelia-token-server" }));
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`[AureliaTokenServer] Listening on http://localhost:${PORT}`);
  });
}

export { server };
