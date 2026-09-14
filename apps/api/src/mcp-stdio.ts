import "./env.js";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { CedarService } from "./cedar/CedarService.js";
import { createPolicyMcpServer } from "./mcp/PolicyMcpServer.js";

const cedar = new CedarService();
await serveStdio(() => createPolicyMcpServer(cedar));
