import { expect, test } from "bun:test";

import { groupPosts } from "../schemas/trade-post";
import { type PostId, type PostRow, planPostRows } from "./trade-post-rows";

// The proof that the stored rows say what the links say: random runs of the writes a person can
// make, checked after every step against `groupPosts`, the rule the reads use today.

type ModelList = {
  id: number;
  userId: string;
  listType: "have" | "sale" | "want";
  discoverable: boolean;
  linkedListId: number | null;
  takesSwaps: boolean;
};
type ModelRow = PostRow & { userId: string };
type World = { lists: ModelList[]; rows: ModelRow[]; nextList: number; nextRow: number };

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

/** What the database does to rows when a list is deleted: CASCADE on the lead, SET NULL on the want. */
function cascade(world: World, gone: Set<number>) {
  world.rows = world.rows
    .filter((row) => !gone.has(row.leadListId))
    .map((row) => {
      if (row.wantListId !== null && gone.has(row.wantListId)) row.wantListId = null;
      return row;
    });
}

function sync(world: World, userId: string) {
  const own = world.lists.filter((list) => list.userId === userId);
  const ops = planPostRows(
    world.rows.filter((row) => row.userId === userId),
    own,
  );
  const gone = new Set<number>(ops.deletes);
  const wants = new Map(ops.updates.map((update) => [update.id as number, update.wantListId]));
  world.rows = world.rows
    .filter((row) => !gone.has(row.id))
    .map((row) => {
      if (wants.has(row.id)) row.wantListId = wants.get(row.id)!;
      return row;
    });
  for (const insert of ops.inserts) {
    world.rows.push({ id: world.nextRow++ as PostId, userId, ...insert });
  }
}

const unlink = (world: World, ids: number[]) => {
  for (const list of world.lists) {
    if (ids.includes(list.id) || (list.linkedListId !== null && ids.includes(list.linkedListId))) {
      list.linkedListId = null;
    }
  }
};

/** One write, shaped as the services write it. Returns the person whose rows it must sync. */
function step(world: World, rand: () => number): string {
  const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)]!;
  const userId = pick(USERS);
  const own = world.lists.filter((list) => list.userId === userId);
  const offers = own.filter(
    (list) => list.listType === "have" || (list.listType === "sale" && list.takesSwaps),
  );
  const wants = own.filter((list) => list.listType === "want");
  const action = Math.floor(rand() * 8);

  if (action === 0 || own.length === 0) {
    // list.create and list.copy: on Trade or not, a have or want list may link at create
    const listType = pick(TYPES);
    const created: ModelList = {
      id: world.nextList++,
      userId,
      listType,
      discoverable: rand() < 0.5,
      linkedListId: null,
      takesSwaps: listType === "sale" && rand() < 0.5,
    };
    const partner =
      listType === "want"
        ? pick([...offers, null])
        : listType === "have"
          ? pick([...wants, null])
          : null;
    world.lists.push(created);
    if (partner) {
      unlink(world, [partner.id]);
      created.linkedListId = partner.id;
      partner.linkedListId = created.id;
      if (created.discoverable) partner.discoverable = true;
    }
  } else if (action === 1) {
    // savePost: a list and its pair go on Trade
    const list = pick(own);
    list.discoverable = true;
    const partner = own.find((other) => other.id === list.linkedListId);
    if (partner && rand() < 0.7) partner.discoverable = true;
  } else if (action === 2) {
    // takeDownPost: the lists of a post leave Trade, the link stays
    const list = pick(own);
    list.discoverable = false;
    const partner = own.find((other) => other.id === list.linkedListId);
    if (partner) partner.discoverable = false;
  } else if (action === 3 && offers.length > 0 && wants.length > 0) {
    // savePost linking a pair, which also swaps a want list: stale links to either half go first
    const offer = pick(offers);
    const want = pick(wants);
    unlink(world, [offer.id, want.id]);
    offer.linkedListId = want.id;
    want.linkedListId = offer.id;
    offer.discoverable = true;
    if (rand() < 0.7) want.discoverable = true;
  } else if (action === 4) {
    unlink(world, [pick(own).id]);
  } else if (action === 5) {
    // list.delete: the partner's link goes through the foreign key
    const gone = pick(own).id;
    unlink(world, [gone]);
    world.lists = world.lists.filter((list) => list.id !== gone);
    cascade(world, new Set([gone]));
  } else if (action === 6 && rand() < 0.15) {
    // account deletion
    const gone = new Set(own.map((list) => list.id));
    world.lists = world.lists.filter((list) => list.userId !== userId);
    cascade(world, gone);
  } else {
    // a sale list's Sell only / Sell or swap, which a linked list cannot turn off
    const sale = own.find((list) => list.listType === "sale" && list.linkedListId === null);
    if (sale) sale.takesSwaps = !sale.takesSwaps;
  }
  return userId;
}

const key = (anchor: number, want: number | null) => `${anchor}+${want ?? "-"}`;

/** Posts on Trade as the reads derive them today, from the links. */
function legacyPosts(world: World) {
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
  expect(rowPosts(world), at).toEqual(legacyPosts(world));
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

function run(seed: number, heal: boolean) {
  const rand = mulberry32(seed);
  const world: World = { lists: [], rows: [], nextList: 1, nextRow: 1_000_000 };
  for (let i = 0; i < 30; i++) {
    if (heal) corrupt(world, rand);
    const userId = step(world, rand);
    // a healing run syncs both people, since both had rows corrupted
    for (const user of heal ? USERS : [userId]) sync(world, user);
    check(world, `seed ${seed} step ${i}`);
  }
}

test("rows give the posts the links give, over 1,000 runs of 30 writes", () => {
  for (let seed = 1; seed <= 1000; seed++) run(seed, false);
});

test("one sync repairs corrupted rows, over 1,000 runs of 30 writes", () => {
  for (let seed = 1; seed <= 1000; seed++) run(seed, true);
});
