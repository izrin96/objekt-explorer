/** Envelopes the tunnel accepts; one error event with its breadcrumbs stays well under it. */
export const MAX_ENVELOPE_BYTES = 64 * 1024;

/** How long a client may take to send its envelope. */
export const READ_DEADLINE_MS = 5000;

const NEWLINE = 0x0a;

type Dsn = { origin: string; publicKey: string; projectId: string };

/** `http://<key>@host:port/<projectId>`; null for anything else. */
export function parseDsn(value: unknown): Dsn | null {
  if (typeof value !== "string") return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const projectId = url.pathname.replace(/^\/+|\/+$/g, "");
  if (!url.username || !/^\d+$/.test(projectId)) return null;
  return { origin: url.origin, publicKey: url.username, projectId };
}

function parseJson(bytes: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

/**
 * Where to forward an envelope: GlitchTip's envelope endpoint for the configured DSN, and only
 * when the envelope's own header names that same host, project and key. The target always comes
 * from the configured DSN, never from the envelope.
 */
export function envelopeTarget(envelope: Uint8Array, configuredDsn: string): string | null {
  const allowed = parseDsn(configuredDsn);
  if (!allowed) return null;
  const newline = envelope.indexOf(NEWLINE);
  const header = parseJson(newline === -1 ? envelope : envelope.subarray(0, newline));
  if (header === null || typeof header !== "object") return null;
  const sent = parseDsn((header as { dsn?: unknown }).dsn);
  if (
    !sent ||
    sent.origin !== allowed.origin ||
    sent.projectId !== allowed.projectId ||
    sent.publicKey !== allowed.publicKey
  ) {
    return null;
  }
  return `${allowed.origin}/api/${allowed.projectId}/envelope/?sentry_key=${encodeURIComponent(allowed.publicKey)}`;
}

/**
 * The envelope with only its `event` items; attachments, replays, sessions and the rest are
 * dropped. Null when it has no event or cannot be parsed.
 * An item is a JSON header line, then a payload of `length` bytes or, without one, up to the
 * next newline (https://develop.sentry.dev/sdk/data-model/envelopes/).
 */
export function keepEventItems(envelope: Uint8Array): Buffer<ArrayBuffer> | null {
  const headerEnd = envelope.indexOf(NEWLINE);
  if (headerEnd === -1) return null;
  const kept: Uint8Array[] = [envelope.subarray(0, headerEnd + 1)];
  let pos = headerEnd + 1;
  while (pos < envelope.length) {
    const itemEnd = envelope.indexOf(NEWLINE, pos);
    const itemHeader = envelope.subarray(pos, itemEnd === -1 ? envelope.length : itemEnd);
    if (itemHeader.length === 0) {
      pos += 1;
      continue;
    }
    const parsed = parseJson(itemHeader);
    if (parsed === null || typeof parsed !== "object") return null;
    const { type, length } = parsed as { type?: unknown; length?: unknown };
    const start = itemEnd === -1 ? envelope.length : itemEnd + 1;
    let end: number;
    if (typeof length === "number") {
      end = start + length;
      if (end > envelope.length) return null;
    } else {
      const payloadEnd = envelope.indexOf(NEWLINE, start);
      end = payloadEnd === -1 ? envelope.length : payloadEnd;
    }
    if (type === "event") {
      kept.push(
        itemHeader,
        Uint8Array.of(NEWLINE),
        envelope.subarray(start, end),
        Uint8Array.of(NEWLINE),
      );
    }
    pos = envelope[end] === NEWLINE ? end + 1 : end;
  }
  return kept.length > 1 ? Buffer.concat(kept) : null;
}

/**
 * The body, `"too_large"` once it passes `max` bytes, or `"timeout"` when it is not all in by
 * `deadlineMs`; stops reading at either instead of buffering the rest.
 */
export async function readCapped(
  body: ReadableStream<Uint8Array> | null,
  max: number,
  deadlineMs: number,
): Promise<Uint8Array | "too_large" | "timeout"> {
  if (!body) return Buffer.alloc(0);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<"timeout">((resolve) => {
    timer = setTimeout(resolve, deadlineMs, "timeout");
  });
  try {
    for (;;) {
      const next = await Promise.race([reader.read(), deadline]);
      if (next === "timeout") {
        await reader.cancel().catch(() => undefined);
        return "timeout";
      }
      if (next.done) break;
      size += next.value.byteLength;
      if (size > max) {
        await reader.cancel().catch(() => undefined);
        return "too_large";
      }
      chunks.push(next.value);
    }
  } finally {
    clearTimeout(timer);
  }
  return Buffer.concat(chunks);
}
