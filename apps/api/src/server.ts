import "./env.js";
import { createMcpFastifyApp } from "@modelcontextprotocol/fastify";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { CedarService } from "./cedar/CedarService.js";
import { createPolicyMcpServer } from "./mcp/PolicyMcpServer.js";

const cedar = new CedarService();

const handler = createMcpHandler(
  () => createPolicyMcpServer(cedar)
);

// Full browser origins permitted to make cross-origin calls to /mcp.
const corsOrigins = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const app = createMcpFastifyApp({
  host: "0.0.0.0",
  allowedHosts: ["localhost", "127.0.0.1"],
  // The MCP app matches on hostname only, so ports are not included here.
  allowedOrigins: ["localhost", "127.0.0.1"]
});

const nodeHandler = toNodeHandler(handler);

// CORS headers are written to reply.raw, not via reply.header(), because the
// MCP node handler owns the raw socket and never flushes Fastify's reply.
app.all("/mcp", async (request, reply) => {
  const origin = request.headers.origin;
  if (origin && corsOrigins.includes(origin)) {
    reply.raw.setHeader("Access-Control-Allow-Origin", origin);
    reply.raw.setHeader("Vary", "Origin");
    reply.raw.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID"
    );
    reply.raw.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    reply.raw.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
    reply.raw.setHeader("Access-Control-Max-Age", "86400");
  }

  if (request.method === "OPTIONS") {
    reply.raw.statusCode = 204;
    reply.raw.end();
    reply.hijack();
    return;
  }

  await nodeHandler(request.raw, reply.raw, request.body);
});

await app.listen({
  port: Number(process.env.PORT || 3001),
  host: "0.0.0.0"
});
