// Pure parts of the Chrome DevTools Protocol client (no network), so they can be tested.

export type CdpReply = {
  id: number;
  sessionId?: string;
  result?: unknown;
  error?: { code: number; message: string };
};

/** A counter for command ids, one per connection. */
export function createCommandEncoder() {
  let next = 0;
  return function encode(method: string, params?: object, sessionId?: string) {
    const id = ++next;
    const frame = JSON.stringify({ id, method, params, sessionId });
    return { id, frame };
  };
}

/**
 * The reply to command `id` sent on `sessionId` (none for the browser itself), or null for an
 * event, a reply to another command, a reply on another session, or a frame that is not JSON.
 */
export function matchReply(raw: string, id: number, sessionId?: string): CdpReply | null {
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof msg !== "object" || msg === null) return null;
  const reply = msg as CdpReply;
  if (reply.id !== id || reply.sessionId !== sessionId) return null;
  return reply;
}

/**
 * The site key in the `render=` of the reCAPTCHA script URLs: the first one that carries a key.
 * `render=explicit` means no key in the URL.
 */
export function renderKeyFrom(scriptSrcs: string[]): string | null {
  for (const src of scriptSrcs) {
    let url: URL;
    try {
      url = new URL(src);
    } catch {
      continue;
    }
    if (!url.pathname.includes("/recaptcha/")) continue;
    const key = url.searchParams.get("render");
    if (key && key !== "explicit") return key;
  }
  return null;
}
