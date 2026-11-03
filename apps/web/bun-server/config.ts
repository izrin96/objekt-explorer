// Configuration
export const SERVER_PORT = Number(process.env.PORT ?? 3000);
export const CLIENT_DIRECTORY = "./dist/client";
export const SERVER_ENTRY_POINT = "./dist/server/server.js";

// Earlier deploys' hashed chunks, kept so a tab still on an old build can lazy-load its routes.
// Off unless set; the directory must outlive the container (a volume).
export const ASSET_ARCHIVE_DIR = process.env.ASSET_ARCHIVE_DIR;
export const ASSET_ARCHIVE_MAX_AGE_MS =
  Number(process.env.ASSET_ARCHIVE_MAX_AGE_DAYS ?? 7) * 24 * 60 * 60 * 1000;

// Logging utilities for professional output
export const log = {
  info: (message: string) => {
    console.log(`[INFO] ${message}`);
  },
  success: (message: string) => {
    console.log(`[SUCCESS] ${message}`);
  },
  warning: (message: string) => {
    console.log(`[WARNING] ${message}`);
  },
  error: (message: string) => {
    console.log(`[ERROR] ${message}`);
  },
  header: (message: string) => {
    console.log(`\n${message}\n`);
  },
};

// Preloading configuration from environment variables
export const MAX_PRELOAD_BYTES = Number(
  process.env.ASSET_PRELOAD_MAX_SIZE ?? 5 * 1024 * 1024, // 5MB default
);

// Verbose logging flag
export const VERBOSE = process.env.ASSET_PRELOAD_VERBOSE_LOGGING === "true";

// Optional ETag feature
export const ENABLE_ETAG = (process.env.ASSET_PRELOAD_ENABLE_ETAG ?? "true") === "true";

// Optional Gzip feature
export const ENABLE_GZIP = (process.env.ASSET_PRELOAD_ENABLE_GZIP ?? "true") === "true";
export const GZIP_MIN_BYTES = Number(process.env.ASSET_PRELOAD_GZIP_MIN_SIZE ?? 1024); // 1KB
export const GZIP_TYPES = (
  process.env.ASSET_PRELOAD_GZIP_MIME_TYPES ??
  "text/,application/javascript,application/json,application/xml,image/svg+xml"
)
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);
