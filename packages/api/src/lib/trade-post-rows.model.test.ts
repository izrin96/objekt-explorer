import { expect, test } from "bun:test";

import { canBeOnTrade } from "../schemas/list";
import { type OpenToFlags, resolveOpenTo } from "../schemas/open-to";
import {
  groupPosts,
  membersOf,
  type PlanList,
  planPost,
  type PostChoice,
  postHolding,
  postsOf,
} from "../schemas/trade-post";
import { pairRefusal } from "./list-pair";
import {
  partnersOf,
  type PostId,
  type PostRow,
  type PostRowOps,
  planPostRows,
  planPostWrite,
  type TradeListState,
} from "./trade-post-rows";

// Two proofs over random runs of the writes a person can make.
//
// The differential run keeps two worlds. `legacy` applies the link writes as the build before
// `trade-post-writes` ran them in SQL (transcribed below, and kept only here), then derives the
// rows from the link. `rows` plans each write with `planPostWrite` and mirrors the link from the
// rows. After every write both must hold the same lists, rows and touched lists, so the two
// builds can take turns on one person. Neither side runs SQL: the statements themselves are
// proven by running them.
//
// The healing run corrupts the rows before each write and checks that one plan repairs them.

type ModelList = {
  id: number;
  userId: string;
  slug: string;
  name: string;
  listType: "have" | "sale" | "want";
  isProfileBind: boolean;
  discoverable: boolean;
  linkedListId: number | null;
  matchSale: boolean;
  matchHave: boolean;
  takesSwaps: boolean;
};
type ModelRow = PostRow & { userId: string };
type World = { lists: ModelList[]; rows: ModelRow[]; nextRow: number };

type Write =
  | { kind: "post"; userId: string; choice: PostChoice }
  | { kind: "down"; userId: string; slug: string }
  | {
      kind: "create";
      userId: string;
      id: number;
      listType: ModelList["listType"];
      isProfileBind: boolean;
      discoverable: boolean;
      openTo: OpenToFlags;
      linkedListId: number | null;
    }
  | { kind: "delete"; userId: string; id: number }
  | { kind: "account"; userId: string };

/** What a write answers: its refusal, or the lists it hands to `touchList`. */
type Outcome = { refusal: string | null; touched: number[] };

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const USERS = ["a", "b"];
const TYPES = ["have", "sale", "want"] as const;
const KINDS = ["swap", "sell", "buy"] as const;

const ownOf = (world: World, userId: string) =>
  world.lists.filter((list) => list.userId === userId).toSorted((a, b) => a.id - b.id);
const rowsOf = (world: World, userId: string) => world.rows.filter((row) => row.userId === userId);
const stateOf = ({ id, listType, discoverable }: ModelList): TradeListState => ({
  id,
  listType,
  discoverable,
});
const done = (touched: Iterable<number>): Outcome => ({
  refusal: null,
  touched: [...new Set(touched)].toSorted((a, b) => a - b),
});
const refused = (refusal: string): Outcome => ({ refusal, touched: [] });

function applyOps(world: World, userId: string, ops: PostRowOps) {
  const gone = new Set<number>(ops.deletes);
  const wants = new Map(ops.updates.map((update) => [update.id as number, update.wantListId]));
  world.rows = world.rows.filter((row) => !gone.has(row.id));
  for (const row of world.rows) if (wants.has(row.id)) row.wantListId = wants.get(row.id)!;
  for (const insert of ops.inserts) {
    world.rows.push({ id: world.nextRow++ as PostId, userId, ...insert });
  }
}

/** The foreign keys: a deleted list clears links to it, takes the row it leads, and leaves the row it is the want list of. */
function deleteLists(world: World, gone: Set<number>) {
  world.lists = world.lists.filter((list) => !gone.has(list.id));
  for (const list of world.lists) {
    if (list.linkedListId !== null && gone.has(list.linkedListId)) list.linkedListId = null;
  }
  world.rows = world.rows.filter((row) => !gone.has(row.leadListId));
  for (const row of world.rows) {
    if (row.wantListId !== null && gone.has(row.wantListId)) row.wantListId = null;
  }
}

function insertList(world: World, write: Write & { kind: "create" }, linkedListId: number | null) {
  const created: ModelList = {
    id: write.id,
    userId: write.userId,
    slug: `l${write.id}`,
    name: `l${write.id}`,
    listType: write.listType,
    isProfileBind: write.isProfileBind,
    discoverable: write.discoverable && canBeOnTrade(write.listType, write.isProfileBind),
    linkedListId,
    ...resolveOpenTo(write.listType, write.openTo),
    takesSwaps: false,
  };
  world.lists.push(created);
  return created;
}

/** `writeList`'s check of the link target under the lock. */
function linkRefusal(own: PlanList[], write: Write & { kind: "create" }) {
  if (write.linkedListId === null) return null;
  const target = own.find((list) => list.id === write.linkedListId);
  if (!target) return "list_linked_not_found";
  return pairRefusal(
    write.listType,
    { openTo: resolveOpenTo(write.listType, write.openTo), takesSwaps: false },
    target,
  );
}

/** The on, `saleSwaps` and off writes of `savePost`, which neither build changes. */
function tradeWrites(world: World, plan: Extract<ReturnType<typeof planPost>, { ok: true }>) {
  const byId = new Map(world.lists.map((list) => [list.id, list]));
  for (const { id, flags } of plan.on) Object.assign(byId.get(id)!, { discoverable: true }, flags);
  if (plan.saleSwaps) byId.get(plan.saleSwaps.id)!.takesSwaps = plan.saleSwaps.takesSwaps;
  for (const id of plan.off) byId.get(id)!.discoverable = false;
  return {
    touched: [
      ...plan.on.map((on) => on.id),
      ...(plan.saleSwaps ? [plan.saleSwaps.id] : []),
      ...plan.off,
    ],
    written: [...plan.on.map((on) => on.id), ...plan.off].map((id) => stateOf(byId.get(id)!)),
  };
}

// ---- legacy: the link is written first, and the rows are derived from it

function legacySync(world: World, userId: string) {
  applyOps(world, userId, planPostRows(rowsOf(world, userId), ownOf(world, userId)));
}

function legacy(world: World, write: Write): Outcome {
  const { userId } = write;
  const own = ownOf(world, userId);
  const mine = (list: ModelList) => list.userId === userId;

  if (write.kind === "post") {
    const plan = planPost(own, write.choice);
    if (!plan.ok) return refused(`${plan.reason}:${plan.slug ?? ""}:${plan.partner ?? ""}`);
    const touched: number[] = [];
    // UPDATE lists SET linked_list_id = NULL WHERE mine AND (id IN unlink OR linked_list_id IN unlink)
    for (const list of world.lists.filter(mine)) {
      const named = plan.unlink.includes(list.id);
      if (named || (list.linkedListId !== null && plan.unlink.includes(list.linkedListId))) {
        list.linkedListId = null;
        touched.push(list.id);
      }
    }
    if (plan.link) {
      const [offerId, wantId] = plan.link;
      // … WHERE mine AND linked_list_id IN link AND id NOT IN link
      for (const list of world.lists.filter(mine)) {
        if (list.linkedListId === null || plan.link.includes(list.id)) continue;
        if (plan.link.includes(list.linkedListId)) {
          list.linkedListId = null;
          touched.push(list.id);
        }
      }
      world.lists.find((list) => list.id === offerId)!.linkedListId = wantId;
      world.lists.find((list) => list.id === wantId)!.linkedListId = offerId;
      touched.push(offerId, wantId);
    }
    touched.push(...tradeWrites(world, plan).touched);
    legacySync(world, userId);
    return done(touched);
  }

  if (write.kind === "down") {
    const list = own.find((entry) => entry.slug === write.slug);
    const post = list ? postHolding(postsOf(own), list.id) : null;
    if (!post) return refused("not_found");
    const ids = membersOf(post).map((member) => member.id);
    for (const member of world.lists) if (ids.includes(member.id)) member.discoverable = false;
    legacySync(world, userId);
    return done(ids);
  }

  if (write.kind === "create") {
    const refusal = linkRefusal(own, write);
    if (refusal) return refused(refusal);
    const created = insertList(world, write, write.linkedListId);
    const changed = [created.id];
    if (write.linkedListId !== null) {
      // … SET linked_list_id = NULL WHERE linked_list_id = L AND id <> N
      for (const list of world.lists) {
        if (list.linkedListId === write.linkedListId && list.id !== created.id) {
          list.linkedListId = null;
          changed.push(list.id);
        }
      }
      const target = world.lists.find((list) => list.id === write.linkedListId)!;
      target.linkedListId = created.id;
      changed.push(target.id);
      if (created.discoverable && canBeOnTrade(target.listType, target.isProfileBind)) {
        target.discoverable = true;
      }
    }
    legacySync(world, userId);
    return done(changed);
  }

  if (write.kind === "delete") {
    // SELECT id FROM lists WHERE linked_list_id = $id, for `touchList`
    const partners = world.lists.filter((list) => list.linkedListId === write.id);
    deleteLists(world, new Set([write.id]));
    legacySync(world, userId);
    return done(partners.map((list) => list.id));
  }

  deleteLists(world, new Set(own.map((list) => list.id)));
  return done([]);
}

// ---- rows: the write is planned over the rows, and the link mirrors them

/** `postPartnerSql`: the want list of the lowest row a list leads, else the lead of the lowest row it is the want list of. */
function partnerByRows(rows: ModelRow[], id: number) {
  const byId = rows.toSorted((a, b) => a.id - b.id);
  return (
    byId.find((row) => row.leadListId === id)?.wantListId ??
    byId.find((row) => row.wantListId === id)?.leadListId ??
    null
  );
}

/** `lockPosts`: the lists as `planPost` reads them, and the state the plan starts from. */
function locked(world: World, userId: string) {
  // a copy, as the read is: the writes that follow must not reach back into it
  const rows = structuredClone(rowsOf(world, userId));
  const partners = partnersOf(rows);
  const lists: PlanList[] = [];
  for (const list of ownOf(world, userId)) {
    lists.push(Object.assign({}, list, { linkedListId: partners.get(list.id) ?? null }));
  }
  return {
    lists,
    current: { lists: ownOf(world, userId).map(stateOf), rows },
  };
}

/** `writePosts`: the plan, its row operations and the mirror. */
function writePosts(
  world: World,
  userId: string,
  current: ReturnType<typeof locked>["current"],
  write: Parameters<typeof planPostWrite>[1],
) {
  const plan = planPostWrite(current, write);
  applyOps(world, userId, plan.ops);
  if (plan.mirror) {
    for (const list of world.lists.filter((entry) => entry.userId === userId)) {
      list.linkedListId = partnerByRows(world.rows, list.id);
    }
  }
  return plan.relinked;
}

function byRows(world: World, write: Write): Outcome {
  const { userId } = write;
  const { lists: own, current } = locked(world, userId);

  if (write.kind === "post") {
    const plan = planPost(own, write.choice);
    if (!plan.ok) return refused(`${plan.reason}:${plan.slug ?? ""}:${plan.partner ?? ""}`);
    const { touched, written } = tradeWrites(world, plan);
    const relinked = writePosts(world, userId, current, {
      pair: plan.link,
      unpair: plan.unlink,
      written,
    });
    return done([...touched, ...relinked]);
  }

  if (write.kind === "down") {
    const list = own.find((entry) => entry.slug === write.slug);
    const post = list ? postHolding(postsOf(own), list.id) : null;
    if (!post) return refused("not_found");
    const ids = membersOf(post).map((member) => member.id);
    const off = world.lists.filter((member) => ids.includes(member.id));
    for (const member of off) member.discoverable = false;
    const relinked = writePosts(world, userId, current, { written: off.map(stateOf) });
    return done([...ids, ...relinked]);
  }

  if (write.kind === "create") {
    const refusal = linkRefusal(own, write);
    if (refusal) return refused(refusal);
    const created = insertList(world, write, null);
    const written = [stateOf(created)];
    if (write.linkedListId !== null) {
      const target = world.lists.find((list) => list.id === write.linkedListId)!;
      if (created.discoverable && canBeOnTrade(target.listType, target.isProfileBind)) {
        target.discoverable = true;
        written.push(stateOf(target));
      }
    }
    const relinked = writePosts(world, userId, current, {
      pair: write.linkedListId === null ? null : [created.id, write.linkedListId],
      written,
    });
    return done([created.id, ...relinked]);
  }

  if (write.kind === "delete") {
    deleteLists(world, new Set([write.id]));
    return done(writePosts(world, userId, current, { removed: [write.id] }));
  }

  deleteLists(world, new Set(own.map((list) => list.id)));
  return done([]);
}

// ---- the writes, picked as callers can send them

type Counts = Record<
  | "post"
  | "takeDown"
  | "pair"
  | "unpair"
  | "swapWant"
  | "deleteLead"
  | "deleteWant"
  | "createOnTrade"
  | "createLinked"
  | "createLinkedToPaired"
  | "account",
  number
>;

function pickWrite(world: World, rand: () => number, nextList: () => number): Write {
  const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)]!;
  const userId = pick(USERS);
  const own = ownOf(world, userId);
  const roll = rand();

  if (own.length === 0 || roll < 0.22) {
    const listType = pick(TYPES);
    // a have or want list may name a list to link at create; mostly one of the right side
    const sides = own.filter((list) => (listType === "want") !== (list.listType === "want"));
    const taken = sides.filter((list) => list.linkedListId !== null);
    const target =
      listType === "sale" || rand() < 0.45
        ? null
        : pick([...sides, ...taken, ...taken, ...own, null]);
    return {
      kind: "create",
      userId,
      id: nextList(),
      listType,
      isProfileBind: listType !== "want" && rand() < 0.85,
      discoverable: rand() < 0.3,
      openTo: pick([
        { matchSale: true, matchHave: true },
        { matchSale: false, matchHave: true },
        { matchSale: true, matchHave: false },
      ]),
      linkedListId: target?.id ?? null,
    };
  }
  if (roll < 0.32) return { kind: "down", userId, slug: pick(own).slug };
  if (roll < 0.46) return { kind: "delete", userId, id: pick(own).id };
  if (roll < 0.47) return { kind: "account", userId };

  // a Swap post of a have list with a want list it is not paired with: a new pair, or a pair's
  // want list swapped. Rare by chance, since a list in another post is refused, so asked for
  const haves = own.filter((list) => list.listType === "have" && list.isProfileBind);
  if (roll < 0.67 && haves.length > 0) {
    const have = pick(haves);
    const others = own.filter((list) => list.listType === "want" && list.id !== have.linkedListId);
    const free = others.filter((list) => !list.discoverable);
    const want = free.length > 0 ? pick(free) : others.length > 0 ? pick(others) : null;
    if (want) {
      return {
        kind: "post",
        userId,
        choice: {
          kind: "swap",
          have: have.slug,
          want: want.slug,
          alsoPay: rand() < 0.5,
          unpair: rand() < 0.9,
          replaces: have.discoverable ? have.slug : want.discoverable ? want.slug : null,
        },
      };
    }
  }

  const kind = pick(KINDS);
  const slugOf = (type: ModelList["listType"], chance: number) => {
    if (rand() > chance) return null;
    const typed = own.filter((list) => list.listType === type);
    // now and then a list of the wrong type, which `planPost` refuses
    return (rand() < 0.05 ? pick(own) : typed.length > 0 ? pick(typed) : null)?.slug ?? null;
  };
  const onTrade = own.filter((list) => list.discoverable);
  return {
    kind: "post",
    userId,
    choice: {
      kind,
      have: slugOf("have", kind === "swap" ? 0.8 : 0.05),
      want: slugOf("want", kind === "sell" ? 0.5 : 0.8),
      sale: slugOf("sale", kind === "sell" ? 0.9 : 0.05),
      alsoPay: rand() < 0.5,
      alsoSwap: rand() < 0.6,
      unpair: rand() < 0.6,
      replaces: onTrade.length > 0 && rand() < 0.5 ? pick(onTrade).slug : null,
    },
  };
}

/** Which transitions a write that went through made, read from the lists before it. */
function count(counts: Counts, before: ModelList[], write: Write) {
  const byId = new Map(before.map((list) => [list.id, list]));
  if (write.kind === "post") {
    const plan = planPost(
      before.filter((list) => list.userId === write.userId),
      write.choice,
    );
    if (!plan.ok) return;
    counts.post++;
    if (plan.unlink.length > 0) counts.unpair++;
    if (plan.link) {
      const was = byId.get(plan.link[0])!.linkedListId;
      if (was === null) counts.pair++;
      else if (was !== plan.link[1]) counts.swapWant++;
    }
  } else if (write.kind === "down") counts.takeDown++;
  else if (write.kind === "create") {
    if (write.discoverable && canBeOnTrade(write.listType, write.isProfileBind)) {
      counts.createOnTrade++;
    }
    if (write.linkedListId !== null) {
      counts.createLinked++;
      if (byId.get(write.linkedListId)!.linkedListId !== null) counts.createLinkedToPaired++;
    }
  } else if (write.kind === "delete") {
    const list = byId.get(write.id)!;
    if (list.linkedListId !== null)
      counts[list.listType === "want" ? "deleteWant" : "deleteLead"]++;
  } else counts.account++;
}

// ---- what must hold

const key = (anchor: number, want: number | null) => `${anchor}+${want ?? "-"}`;

/** Posts on Trade as the link gives them. */
function linkPosts(world: World) {
  return groupPosts(world.lists.filter((list) => list.discoverable))
    .map((post) =>
      key(post.anchor.id, post.want && post.want !== post.anchor ? post.want.id : null),
    )
    .toSorted();
}

/** Posts on Trade as the rows give them: a row shows the lists of its that are on Trade. */
function rowPosts(world: World) {
  const onTrade = new Set(world.lists.filter((list) => list.discoverable).map((list) => list.id));
  return world.rows
    .flatMap((row) => {
      const lead = onTrade.has(row.leadListId);
      const want = row.wantListId !== null && onTrade.has(row.wantListId);
      if (lead) return [key(row.leadListId, want ? row.wantListId : null)];
      return want ? [key(row.wantListId!, null)] : [];
    })
    .toSorted();
}

function check(world: World, at: string) {
  expect(rowPosts(world), at).toEqual(linkPosts(world));
  const owner = new Map(world.lists.map((list) => [list.id, list.userId]));
  const seen = new Set<number>();
  for (const row of world.rows) {
    for (const id of [row.leadListId, row.wantListId]) {
      if (id === null) continue;
      expect(seen.has(id), `${at}: list ${id} in two rows`).toBe(false);
      seen.add(id);
      expect(owner.get(id), `${at}: row ${row.id} owner`).toBe(row.userId);
    }
  }
}

const sorted = (world: World) => ({
  lists: world.lists.toSorted((a, b) => a.id - b.id),
  rows: world.rows.toSorted((a, b) => a.id - b.id),
});

function differential(seed: number, counts: Counts) {
  const rand = mulberry32(seed);
  const link: World = { lists: [], rows: [], nextRow: 1_000_000 };
  const rows: World = { lists: [], rows: [], nextRow: 1_000_000 };
  let lastList = 0;
  for (let i = 0; i < 40; i++) {
    const at = `seed ${seed} step ${i}`;
    const before = structuredClone(link.lists);
    const write = pickWrite(link, rand, () => ++lastList);
    const was = legacy(link, write);
    const now = byRows(rows, write);
    expect(now, `${at}: ${JSON.stringify(write)}`).toEqual(was);
    if (was.refusal === null) count(counts, before, write);

    expect(sorted(rows), at).toEqual(sorted(link));
    check(rows, at);
    for (const userId of USERS) {
      const partners = partnersOf(rowsOf(rows, userId));
      for (const list of ownOf(rows, userId)) {
        expect(list.linkedListId, `${at}: list ${list.id} mirror`).toBe(
          partners.get(list.id) ?? null,
        );
      }
    }
  }
}

// Under a second locally, but 12 s on the CI runner beside lint and typecheck: bun's default
// 5 s is too short there.
const CI_TIMEOUT = 60_000;

test(
  "the row writes leave what the link writes left, over 1,000 runs of 40 writes",
  () => {
    const counts: Counts = {
      post: 0,
      takeDown: 0,
      pair: 0,
      unpair: 0,
      swapWant: 0,
      deleteLead: 0,
      deleteWant: 0,
      createOnTrade: 0,
      createLinked: 0,
      createLinkedToPaired: 0,
      account: 0,
    };
    for (let seed = 1; seed <= 1000; seed++) differential(seed, counts);
    if (process.env.COUNTS) console.log(counts);
    for (const [transition, n] of Object.entries(counts)) {
      expect(n, `${transition} ran ${n} times`).toBeGreaterThanOrEqual(100);
    }
  },
  CI_TIMEOUT,
);

/** Rows as a build without the planner, or a missed writer, could have left them. */
function corrupt(world: World, rand: () => number) {
  world.rows = world.rows.filter(() => rand() > 0.3);
  for (const row of world.rows) {
    const own = world.lists.filter(
      (list) => list.userId === row.userId && list.id !== row.leadListId,
    );
    if (own.length > 0 && rand() < 0.3) {
      row.wantListId = rand() < 0.5 ? null : own[Math.floor(rand() * own.length)]!.id;
    }
  }
  for (const list of world.lists) {
    if (rand() < 0.2) {
      world.rows.push({
        id: world.nextRow++ as PostId,
        userId: list.userId,
        leadListId: list.id,
        wantListId: null,
      });
    }
  }
}

test(
  "one plan over the link repairs corrupted rows, over 1,000 runs of 30 writes",
  () => {
    for (let seed = 1; seed <= 1000; seed++) {
      const rand = mulberry32(seed);
      const world: World = { lists: [], rows: [], nextRow: 1_000_000 };
      let lastList = 0;
      for (let i = 0; i < 30; i++) {
        corrupt(world, rand);
        legacy(
          world,
          pickWrite(world, rand, () => ++lastList),
        );
        // both people had rows corrupted
        for (const userId of USERS) legacySync(world, userId);
        check(world, `seed ${seed} step ${i}`);
      }
    }
  },
  CI_TIMEOUT,
);
