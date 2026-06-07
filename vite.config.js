import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// During `vite dev`, proxy /api/* to a tiny local handler so the Groq
// serverless function (which Vercel runs in production) also works locally.
// We load it lazily inside the middleware to avoid bundling server code.
function localApiPlugin() {
  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use("/api/groq", async (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        try {
          const mod = await server.ssrLoadModule("/api/groq.js");
          const handler = mod.default;
          // Collect body
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const raw = Buffer.concat(chunks).toString("utf8");
          req.body = raw ? JSON.parse(raw) : {};
          // Minimal Vercel-style res shim
          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (obj) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(obj));
            return res;
          };
          await handler(req, res);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Local API error: " + err.message }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // Load .env files and expose GROQ_API_KEY to process.env so the local
  // /api/groq middleware (run via ssrLoadModule) can read it, exactly as the
  // Vercel serverless function does in production.
  const env = loadEnv(mode, process.cwd(), "");
  if (env.GROQ_API_KEY) process.env.GROQ_API_KEY = env.GROQ_API_KEY;

  return {
    plugins: [react(), localApiPlugin()],
    server: { port: 5173 },
  };
});
