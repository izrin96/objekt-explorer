/**
 * TanStack Start Production Server with Bun
 *
 * A high-performance production server for TanStack Start applications that
 * implements intelligent static asset loading with configurable memory management.
 *
 * Features:
 * - Hybrid loading strategy (preload small files, serve large files on-demand)
 * - Configurable file filtering with include/exclude patterns
 * - Memory-efficient response generation
 * - Production-ready caching headers
 *
 * Environment Variables:
 *
 * PORT (number)
 *   - Server port number
 *   - Default: 3000
 *
 * ASSET_PRELOAD_MAX_SIZE (number)
 *   - Maximum file size in bytes to preload into memory
 *   - Files larger than this will be served on-demand from disk
 *   - Default: 5242880 (5MB)
 *   - Example: ASSET_PRELOAD_MAX_SIZE=5242880 (5MB)
 *
 * ASSET_PRELOAD_INCLUDE_PATTERNS (string)
 *   - Comma-separated list of glob patterns for files to include
 *   - If specified, only matching files are eligible for preloading
 *   - Patterns are matched against filenames only, not full paths
 *   - Example: ASSET_PRELOAD_INCLUDE_PATTERNS="*.js,*.css,*.woff2"
 *
 * ASSET_PRELOAD_EXCLUDE_PATTERNS (string)
 *   - Comma-separated list of glob patterns for files to exclude
 *   - Applied after include patterns
 *   - Patterns are matched against filenames only, not full paths
 *   - Example: ASSET_PRELOAD_EXCLUDE_PATTERNS="*.map,*.txt"
 *
 * ASSET_PRELOAD_VERBOSE_LOGGING (boolean)
 *   - Enable detailed logging of loaded and skipped files
 *   - Default: false
 *   - Set to "true" to enable verbose output
 *
 * ASSET_PRELOAD_ENABLE_ETAG (boolean)
 *   - Enable ETag generation for preloaded assets
 *   - Default: true
 *   - Set to "false" to disable ETag support
 *
 * ASSET_PRELOAD_ENABLE_GZIP (boolean)
 *   - Enable Gzip compression for eligible assets, and for dynamic responses
 *     (SSR HTML, /api, /rpc), which also follow the size and MIME settings below
 *   - Default: true
 *   - Set to "false" to disable Gzip compression
 *
 * ASSET_PRELOAD_GZIP_MIN_SIZE (number)
 *   - Minimum file size in bytes required for Gzip compression
 *   - Files smaller than this will not be compressed
 *   - Default: 1024 (1KB)
 *
 * ASSET_PRELOAD_GZIP_MIME_TYPES (string)
 *   - Comma-separated list of MIME types eligible for Gzip compression
 *   - Supports partial matching for types ending with "/"
 *   - Default: text/,application/javascript,application/json,application/xml,image/svg+xml
 *
 * Usage:
 *   bun run server.ts
 */

import { archiveAssets, serveArchivedAsset } from "./bun-server/asset-archive";
import { compressResponse } from "./bun-server/compress";
import {
  ASSET_ARCHIVE_DIR,
  CLIENT_DIRECTORY,
  log,
  SERVER_ENTRY_POINT,
  SERVER_PORT,
} from "./bun-server/config";
import { initializeStaticRoutes } from "./bun-server/static-routes";

/**
 * Initialize the server
 */
async function initializeServer() {
  log.header("Starting Production Server");

  // Load TanStack Start server handler
  // `flush` sends queued error reports (src/server.ts)
  type Handler = {
    fetch: (request: Request) => Response | Promise<Response>;
    flush?: () => Promise<void>;
  };
  let handler: Handler;
  try {
    const serverModule = (await import(SERVER_ENTRY_POINT)) as { default: Handler };
    handler = serverModule.default;
    log.success("TanStack Start application handler initialized");
  } catch (error) {
    log.error(`Failed to load server handler: ${String(error)}`);
    process.exit(1);
  }

  // Build static routes with intelligent preloading
  const { routes: staticRoutes } = await initializeStaticRoutes(CLIENT_DIRECTORY);
  if (ASSET_ARCHIVE_DIR) await archiveAssets(ASSET_ARCHIVE_DIR);

  // Create Bun server
  const server = Bun.serve({
    port: SERVER_PORT,

    async fetch(req) {
      const url = new URL(req.url);

      // Serve preloaded or on-demand static assets
      const staticHandler = staticRoutes[url.pathname];
      if (staticHandler) return staticHandler(req);
      if (ASSET_ARCHIVE_DIR) {
        const archived = await serveArchivedAsset(ASSET_ARCHIVE_DIR, url.pathname);
        if (archived) return compressResponse(req, archived);
      }

      // Fallback to TanStack Start handler for all other routes
      try {
        const response = await handler.fetch(req);
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.startsWith("text/html")) {
          response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
        }
        return compressResponse(req, response);
      } catch (error) {
        log.error(`Server handler error: ${String(error)}`);
        return new Response("Internal Server Error", { status: 500 });
      }
    },

    // Global error handler
    error(error) {
      log.error(`Uncaught server error: ${error instanceof Error ? error.message : String(error)}`);
      return new Response("Internal Server Error", { status: 500 });
    },
  });

  log.success(`Server listening on http://localhost:${String(server.port)}`);

  // Graceful shutdown
  async function shutdown(signal: string) {
    log.info(`Received ${signal}, shutting down gracefully...`);
    await server.stop();
    await handler.flush?.();
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Initialize the server
initializeServer().catch((error: unknown) => {
  log.error(`Failed to start server: ${String(error)}`);
  process.exit(1);
});
