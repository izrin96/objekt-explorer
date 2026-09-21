/**
 * Offline stand-in for `/api/objekts/list/:slug` and
 * `/api/objekts/transfers/:slug/:serial`, used only when the Vite proxy to
 * objekt.top fails. Keyed by collection slug and fully deterministic, so a
 * collection always has the same serials across reloads.
 */
import { users } from "@/fixtures/users";
import { hash, rng } from "@/lib/seeded";

export type LabSerial = {
  serial: number;
  tokenId: string;
  owner: string;
  receivedAt: Date;
  transferable: boolean;
};

export type LabTransfer = {
  id: string;
  kind: "mint" | "transfer" | "spin";
  from: string;
  to: string;
  at: Date;
};

export const SPIN_OWNER = "spin";
const MINT_OWNER = "mint";

/**
 * Which *fixture* serials read as "the owner hides their serials".
 *
 * `/api/objekts/transfers` answers `{ hide: true }` when the holder turned on
 * `privateSerial`, and live responses carry it — but which serials are hidden
 * moves as people toggle the flag, so no slug / serial pair can be checked in
 * and still be private next week. The offline stand-in has a rule instead:
 * every serial ending in 7 is private, so the state is reachable in any
 * collection with the proxy down. Live data is never overridden.
 */
export function isPrivateSerial(serial: number): boolean {
  return serial % 10 === 7;
}

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 20);

const serialCache = new Map<string, LabSerial[]>();

export function serialsFor(slug: string): LabSerial[] {
  const cached = serialCache.get(slug);
  if (cached) return cached;

  const seed = hash(slug);
  const next = rng(seed);
  const count = 20 + Math.floor(next() * 41); // 20–60 rows
  const rows: LabSerial[] = [];
  let serial = 1 + Math.floor(next() * 12);

  for (let i = 0; i < count; i++) {
    serial += 1 + Math.floor(next() * 40);
    const owner = users[Math.floor(next() * users.length)]?.nickname ?? "izrin96";
    rows.push({
      serial,
      tokenId: String(400_000 + ((seed + serial * 17) % 500_000)),
      owner,
      receivedAt: new Date(NOW - Math.floor(next() * 400) * DAY),
      transferable: next() > 0.22,
    });
  }

  serialCache.set(slug, rows);
  return rows;
}

function findSerial(slug: string, serial: number): LabSerial | undefined {
  return serialsFor(slug).find((s) => s.serial === serial);
}

const transferCache = new Map<string, LabTransfer[]>();

/** mint, then 3–6 transfers; roughly one in five ends in a spin (burn) */
export function transfersFor(slug: string, serial: number): LabTransfer[] {
  const key = `${slug}#${serial}`;
  const cached = transferCache.get(key);
  if (cached) return cached;

  const row = findSerial(slug, serial);
  const next = rng(hash(key));
  const hops = 3 + Math.floor(next() * 4);
  const spun = next() > 0.8;

  const chain: string[] = [MINT_OWNER];
  for (let i = 0; i < hops; i++) {
    chain.push(users[Math.floor(next() * users.length)]?.nickname ?? "izrin96");
  }
  // the last hop must land on the recorded owner so the tabs agree
  if (row) chain[chain.length - 1] = row.owner;
  if (spun) chain.push(SPIN_OWNER);

  const end = row ? row.receivedAt.getTime() : NOW;
  const span = 30 + Math.floor(next() * 600);
  const events: LabTransfer[] = [];
  for (let i = 1; i < chain.length; i++) {
    const at = new Date(end - (chain.length - 1 - i) * span * DAY * 0.12);
    const from = chain[i - 1] ?? MINT_OWNER;
    const to = chain[i] ?? MINT_OWNER;
    events.push({
      id: `${key}-${i}`,
      kind: from === MINT_OWNER ? "mint" : to === SPIN_OWNER ? "spin" : "transfer",
      from,
      to,
      at,
    });
  }

  const ordered = events.toReversed();
  transferCache.set(key, ordered);
  return ordered;
}
