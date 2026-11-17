import { createCommandEncoder, matchReply, renderKeyFrom, type CdpReply } from "../cdp";
import { CosmoSessionError } from "./shop";

// A fixed page, never input: no user value reaches the browser
const LOGIN_PAGE = "https://shop.cosmo.fans/en/login/landing";
// measured 18 s through the VPS proxy on 2026-11-17
const TOTAL_MS = 45_000;
const GRECAPTCHA_WAIT_MS = 25_000;
const POLL_MS = 250;

type Pending = { sessionId?: string; resolve: (reply: CdpReply) => void };

/**
 * Mints a reCAPTCHA v3 `login` token on Cosmo's own login page, in the browser container at
 * `browserUrl` (a ws URL that may carry `?token=`: it never reaches an error). Cosmo refuses a
 * token minted on any other origin.
 *
 * Throws `CosmoSessionError`: `busy` when the container's queue is full (it answers the connect
 * with 429), `unavailable` for anything else.
 */
export async function mintRecaptchaToken(
  browserUrl: string,
  proxy = process.env.COSMO_PROXY,
): Promise<string> {
  const encode = createCommandEncoder();
  const pending = new Map<number, Pending>();
  let ws: WebSocket | undefined;
  let targetId: string | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let fail: ((err: CosmoSessionError) => void) | undefined;
  // set once the race is lost: a socket that opens late must not go on to open a tab or mint a token
  let aborted = false;
  const alive = () => {
    if (aborted) throw new CosmoSessionError("unavailable");
  };

  const run = async (): Promise<string> => {
    try {
      // Cosmo refuses the server's own IP, so the browser leaves through the same proxy as
      // every other Cosmo call (a browserless launch argument)
      const url = new URL(browserUrl);
      if (proxy) url.searchParams.set("--proxy-server", proxy);
      ws = new WebSocket(url);
    } catch {
      throw new CosmoSessionError("unavailable");
    }
    const socket = ws;
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
      socket.addEventListener(
        "error",
        (event) => {
          // Bun's message holds the URL, token included: read the status, keep nothing else
          const message = (event as { message?: unknown }).message;
          const status = /Expected 101 status code: (\d+)/.exec(
            typeof message === "string" ? message : "",
          )?.[1];
          reject(
            status === "429"
              ? new CosmoSessionError("busy", 429)
              : new CosmoSessionError("unavailable"),
          );
        },
        { once: true },
      );
    });
    alive();
    socket.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      for (const [id, entry] of pending) {
        const reply = matchReply(event.data, id, entry.sessionId);
        if (reply) {
          pending.delete(id);
          entry.resolve(reply);
          return;
        }
      }
    });
    socket.addEventListener("close", () => fail?.(new CosmoSessionError("unavailable")), {
      once: true,
    });

    const send = (method: string, params?: object, sessionId?: string) =>
      new Promise<unknown>((resolve, reject) => {
        const { id, frame } = encode(method, params, sessionId);
        pending.set(id, {
          sessionId,
          resolve: (reply) =>
            reply.error ? reject(new CosmoSessionError("unavailable")) : resolve(reply.result),
        });
        socket.send(frame);
      });

    const evaluate = async (sessionId: string, expression: string, awaitPromise = false) => {
      const result = (await send(
        "Runtime.evaluate",
        { expression, returnByValue: true, awaitPromise },
        sessionId,
      )) as { result?: { value?: unknown }; exceptionDetails?: unknown };
      if (result.exceptionDetails) throw new CosmoSessionError("unavailable");
      return result.result?.value;
    };

    const created = (await send("Target.createTarget", { url: "about:blank" })) as {
      targetId?: string;
    };
    targetId = created.targetId;
    alive();
    const attached = (await send("Target.attachToTarget", { targetId, flatten: true })) as {
      sessionId?: string;
    };
    alive();
    const sessionId = attached.sessionId;
    if (!targetId || !sessionId) throw new CosmoSessionError("unavailable");

    await send("Page.navigate", { url: LOGIN_PAGE }, sessionId);
    alive();

    const deadline = Date.now() + GRECAPTCHA_WAIT_MS;
    for (;;) {
      const ready = await evaluate(
        sessionId,
        "typeof window.grecaptcha === 'object' && typeof window.grecaptcha.execute === 'function'",
      );
      alive();
      if (ready === true) break;
      if (Date.now() >= deadline) throw new CosmoSessionError("unavailable");
      await Bun.sleep(POLL_MS);
      alive();
    }

    const srcs = await evaluate(sessionId, "Array.from(document.scripts, (s) => s.src)");
    alive();
    const key = renderKeyFrom(Array.isArray(srcs) ? srcs.filter((s) => typeof s === "string") : []);
    if (!key) throw new CosmoSessionError("unavailable");

    const token = await evaluate(
      sessionId,
      `new Promise((resolve, reject) => grecaptcha.ready(() => grecaptcha.execute(${JSON.stringify(key)}, { action: "login" }).then(resolve, reject)))`,
      true,
    );
    alive();
    if (typeof token !== "string" || !token) throw new CosmoSessionError("unavailable");
    return token;
  };

  try {
    return await Promise.race([
      run(),
      new Promise<never>((_, reject) => {
        fail = reject;
        timer = setTimeout(() => reject(new CosmoSessionError("unavailable")), TOTAL_MS);
      }),
    ]);
  } catch (err) {
    // whatever the browser or the socket threw may hold the URL
    throw err instanceof CosmoSessionError ? err : new CosmoSessionError("unavailable");
  } finally {
    aborted = true;
    clearTimeout(timer);
    fail = undefined;
    if (ws) {
      if (ws.readyState === WebSocket.OPEN && targetId) {
        try {
          ws.send(encode("Target.closeTarget", { targetId }).frame);
        } catch {
          // the socket close below ends the browser's side of it anyway
        }
      }
      // whatever its state: closing a connecting socket is allowed and stops it opening later
      try {
        ws.close();
      } catch {
        // already closed
      }
    }
  }
}
