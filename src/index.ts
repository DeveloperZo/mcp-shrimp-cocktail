import "dotenv/config";

// Import application constants
import { ENV_KEYS } from "./utils/constants.js";

// Import server modules
import {
  createExpressApp,
  startExpressServer,
  setupShutdownHandlers,
  startMcpServer
} from "./server/index.js";

async function main() {
  try {
    const ENABLE_GUI = process.env[ENV_KEYS.ENABLE_GUI] === "true";

    if (ENABLE_GUI) {
      // Create Express application
      const app = createExpressApp();

      // Start Express server
      const { httpServer, port } = await startExpressServer(app);

      // Set up graceful shutdown handlers
      setupShutdownHandlers(httpServer);
    }

    // Start MCP server
    await startMcpServer();
    
    // Server started successfully - no logging for MCP compatibility
  } catch (error) {
    // Server startup failed - exit silently for MCP compatibility
    process.exit(1);
  }
}

main().catch(() => process.exit(1));
