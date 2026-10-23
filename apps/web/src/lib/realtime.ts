import type * as CentrifugeLibrary from "centrifuge";
import type { Centrifuge } from "centrifuge";

import { client } from "@/lib/orpc";

import { clientEnv } from "./env/client";
import { isUnauthorized } from "./orpc-error";

// loaded on first use, so the client stays out of the entry chunk
let library: typeof CentrifugeLibrary | undefined;
let instance: Promise<Centrifuge> | undefined;
let consumers = 0;
/** Whether the connection holds a token for a signed-in user, rather than none. */
let authenticated = false;

function endpoint() {
  const configured = clientEnv.VITE_CENTRIFUGO_URL;
  if (configured) return configured;
  return `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/connection/websocket`;
}

/**
 * Signed out has no token and connects anonymously, which only the public activity feed accepts.
 * A signed-in connection whose renewal is refused has lost its session, and ends for good.
 */
async function getToken({ UnauthorizedError }: typeof CentrifugeLibrary) {
  try {
    const { token } = await client.realtime.token();
    authenticated = true;
    return token;
  } catch (error) {
    if (!isUnauthorized(error)) throw error;
    if (authenticated) throw new UnauthorizedError("session ended");
    return "";
  }
}

/** One connection per tab, created on first use. */
export function realtime() {
  instance ??= import("centrifuge").then(
    (loaded) => {
      library = loaded;
      return new loaded.Centrifuge(endpoint(), { getToken: () => getToken(loaded) });
    },
    (error: unknown) => {
      // a chunk that failed to load is tried again on next use
      instance = undefined;
      throw error;
    },
  );
  return instance;
}

/** Whether a disconnect means the session is gone, so a retry would only be refused. */
export function isUnauthorizedDisconnect(code: number) {
  return code === library?.disconnectedCodes.unauthorized;
}

/**
 * Holds the connection open while something listens. `signedIn` is the user feed: it needs a
 * token, so a connection opened anonymously reconnects to get one, and it goes back to
 * anonymous when the user feed lets go while another consumer still listens.
 */
export function acquireRealtime(connection: Centrifuge, { signedIn }: { signedIn: boolean }) {
  consumers += 1;
  if (signedIn && !authenticated && connection.state === "connected") connection.disconnect();
  connection.connect();

  return () => {
    consumers -= 1;
    if (consumers <= 0) {
      consumers = 0;
      connection.disconnect();
      authenticated = false;
    } else if (signedIn) {
      authenticated = false;
      connection.disconnect();
      connection.connect();
    }
  };
}
