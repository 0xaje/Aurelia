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
  if (env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }

  return {
    plugins: [react(), serverApiPlugin()],
    server: {
      port: 5173,
      cors: true
    }
  };
});

