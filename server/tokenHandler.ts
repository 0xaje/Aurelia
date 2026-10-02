import type { IncomingMessage, ServerResponse } from "node:http";

export interface TokenResponse {
  token?: string;
  error?: string;
}

export const ASSEMBLYAI_V3_TOKEN_URL = "https://streaming.assemblyai.com/v3/token";

/**
 * Mints an AssemblyAI Universal Streaming v3 temporary token using the server-side API key.
 * Security: The permanent ASSEMBLYAI_API_KEY is NEVER sent to the client.
 */
export async function mintAssemblyAiToken(
  apiKey?: string,
  expiresInSeconds = 60
): Promise<{ status: number; data: TokenResponse }> {
  const key = apiKey || process.env.ASSEMBLYAI_API_KEY;

  if (!key) {
    return {
      status: 500,
      data: { error: "ASSEMBLYAI_API_KEY is not configured on server" }
    };
  }

  try {
    const url = `${ASSEMBLYAI_V3_TOKEN_URL}?expires_in_seconds=${expiresInSeconds}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": key
      }
    });

    if (!res.ok) {
      return {
        status: res.status,
        data: { error: "Failed to generate AssemblyAI v3 streaming token from upstream provider" }
      };
    }

    const payload = (await res.json()) as { token?: string };
    if (!payload.token) {
      return {
        status: 502,
        data: { error: "Invalid token response from AssemblyAI v3" }
      };
    }

    return {
      status: 200,
      data: { token: payload.token }
    };
  } catch (err) {
    return {
      status: 502,
      data: { error: "Network error communicating with AssemblyAI v3 token service" }
    };
  }
}

/**
 * Node HTTP request handler for the /api/assemblyai/token endpoint.
 */
export async function handleTokenRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // CORS & Security headers
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const { status, data } = await mintAssemblyAiToken();
  res.writeHead(status);
  res.end(JSON.stringify(data));
}
