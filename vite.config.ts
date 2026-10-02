import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { handleTokenRequest } from "./server/tokenHandler";
import { handleConversationRequest } from "./server/conversationHandler";

function serverApiPlugin(): Plugin {
  return {
    name: "aurelia-server-api-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url === "/api/assemblyai/token" || url === "/api/token") {
          await handleTokenRequest(req, res);
        } else if (url === "/api/ora/converse" || url === "/api/converse") {
          await handleConversationRequest(req, res);
        } else {
          next();
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url === "/api/assemblyai/token" || url === "/api/token") {
          await handleTokenRequest(req, res);
        } else if (url === "/api/ora/converse" || url === "/api/converse") {
          await handleConversationRequest(req, res);
        } else {
          next();
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  if (env.ASSEMBLYAI_API_KEY) {
    process.env.ASSEMBLYAI_API_KEY = env.ASSEMBLYAI_API_KEY;
  }
  if (env.LLM_PROVIDER) {
    process.env.LLM_PROVIDER = env.LLM_PROVIDER;
  }
  if (env.OLLAMA_BASE_URL) {
    process.env.OLLAMA_BASE_URL = env.OLLAMA_BASE_URL;
  }
  if (env.OLLAMA_MODEL) {
    process.env.OLLAMA_MODEL = env.OLLAMA_MODEL;
  }
  if (env.OPENROUTER_API_KEY) {
    process.env.OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;
  }
  if (env.OPENROUTER_MODEL) {
    process.env.OPENROUTER_MODEL = env.OPENROUTER_MODEL;
  }

  return {
    plugins: [react(), serverApiPlugin()],
    server: {
      port: 5173,
      cors: true
    }
  };
});

