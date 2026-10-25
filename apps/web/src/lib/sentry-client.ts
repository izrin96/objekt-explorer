// The only parts of the SDK the app uses. Importing `@sentry/react` as a whole keeps Replay,
// Feedback and the router integrations in the chunk even though nothing references them.
export { init, captureException, setUser, reactErrorHandler } from "@sentry/react";
