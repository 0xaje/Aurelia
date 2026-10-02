/**
 * AURELIA — Server-side Conversational API Endpoint Handler (Phase 5C)
 * 
 * Handles POST /api/ora/converse requests.
 * Securely executes Ora conversational intelligence without exposing keys to the browser client.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { executeServerOraConversation } from "./oraConversationEngine";
import { PropertyContext } from "../src/ora/oraTypes";

let cachedPropertyContext: PropertyContext | null = null;

function ensureEnvironmentLoaded(): void {
  if (!process.env.GEMINI_API_KEY) {
    try {
      const envPath = path.resolve(process.cwd(), ".env");
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, "utf-8");
        const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
        if (match && match[1]) {
          const key = match[1].trim().replace(/^["']|["']$/g, "");
          if (key && !key.includes("your_gemini_api_key_here")) {
            process.env.GEMINI_API_KEY = key;
          }
        }
      }
    } catch {
      // Ignore
    }
  }
}

function loadPropertyContext(): PropertyContext {
  if (cachedPropertyContext) return cachedPropertyContext;

  try {
    const filePath = path.resolve(process.cwd(), "data/shortlet.json");
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(raw);
      cachedPropertyContext = {
        id: data.property.id,
        name: data.property.name,
        tagline: data.property.tagline,
        type: data.property.type,
        currency: data.property.currency,
        spaces: data.property.spaces.map((s: any) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          representation: s.representation,
          description: s.description,
          architecturalFeatures: s.architecturalFeatures || [],
          aliases: []
        }))
      };
      return cachedPropertyContext!;
    }
  } catch {
    // Fallback if file read fails
  }

  return {
    id: "aurelia-sanctuary",
    name: "Aurelia Sanctuary",
    tagline: "A secluded modernist retreat nestled above the highland valley",
    type: "private_shortlet_estate",
    currency: "USD",
    spaces: []
  };
}

/**
 * Handles incoming POST /api/ora/converse HTTP requests.
 */
export async function handleConversationRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // CORS & Security headers
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ error: "Method not allowed. Use POST." }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
    // Guard against oversized payload (max 64KB)
    if (body.length > 65536) {
      req.destroy();
    }
  });

  req.on("end", async () => {
    try {
      ensureEnvironmentLoaded();
      const payload = body ? JSON.parse(body) : {};
      const transcript = typeof payload.transcript === "string" ? payload.transcript : "";
      const session = payload.session || {};
      const mode = payload.mode;

      const propertyContext = loadPropertyContext();
      const decision = await executeServerOraConversation(
        transcript,
        propertyContext,
        session,
        { mode }
      );

      // Expose debug info in development (Section 22)
      const isDev = process.env.NODE_ENV !== "production";
      const debug = isDev
        ? {
            engine: decision.engineMode ? decision.engineMode.toUpperCase() : "CONVERSATIONAL",
            provider: decision.engineMode === "conversational"
              ? "Google Gemini (gemini-1.5-flash)"
              : decision.engineMode === "error"
              ? "None (API Key missing or connection error)"
              : "Deterministic Semantic Engine",
            request: "POST /api/ora/converse",
            decision: decision.type,
            fallback: Boolean(decision.fallback)
          }
        : undefined;

      res.writeHead(200);
      res.end(JSON.stringify({ decision, debug }));
    } catch {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          decision: {
            type: "PROPERTY_ANSWER",
            response: "I'm having trouble understanding that right now. You can try asking again.",
            engineMode: "error",
            fallback: false
          }
        })
      );
    }
  });
}
