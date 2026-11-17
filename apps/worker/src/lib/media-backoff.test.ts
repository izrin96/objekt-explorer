import { describe, expect, test } from "bun:test";

import { createBackoffStore, parseBackoff, type BackoffKv } from "./media-backoff";

function fakeKv() {
  const data = new Map<string, string>();
  const state = { down: false };
  const kv: BackoffKv = {
    async get(key) {
      if (state.down) throw new Error("down");
      return data.get(key) ?? null;
    },
    async set(key, value) {
      if (state.down) throw new Error("down");
      data.set(key, value);
    },
    async del(key) {
      if (state.down) throw new Error("down");
      data.delete(key);
    },
  };
  return { kv, data, state };
}

describe("parseBackoff", () => {
  test("reads {until, minutes}", () => {
    expect(parseBackoff('{"until":5,"minutes":10}')).toEqual({ until: 5, minutes: 10 });
  });

  test("anything else is null", () => {
    for (const raw of [null, "", "nope", "5", "null", '{"until":"x","minutes":1}', '{"until":1}']) {
      expect(parseBackoff(raw)).toBeNull();
    }
  });
});

describe("createBackoffStore", () => {
  const key = "collection-media:backoff";

  test("a value written is read back, and a fresh store (a restart) reads it too", async () => {
    const { kv } = fakeKv();
    await createBackoffStore(kv, key).write({ until: 100, minutes: 5 });
    expect(await createBackoffStore(kv, key).read()).toEqual({ until: 100, minutes: 5 });
  });

  test("clear removes it", async () => {
    const { kv, data } = fakeKv();
    const store = createBackoffStore(kv, key);
    await store.write({ until: 100, minutes: 5 });
    await store.clear();
    expect(data.size).toBe(0);
    expect(await store.read()).toBeNull();
  });

  test("with the store down, the in-process copy answers", async () => {
    const { kv, state } = fakeKv();
    state.down = true;
    const store = createBackoffStore(kv, key);
    await store.write({ until: 100, minutes: 10 });
    expect(await store.read()).toEqual({ until: 100, minutes: 10 });
  });

  test("a write the store missed is pushed once it is back", async () => {
    const { kv, state, data } = fakeKv();
    const store = createBackoffStore(kv, key);
    state.down = true;
    await store.write({ until: 100, minutes: 10 });
    state.down = false;
    expect(await store.read()).toEqual({ until: 100, minutes: 10 });
    expect(parseBackoff(data.get(key) ?? null)).toEqual({ until: 100, minutes: 10 });
  });

  test("a store that never answers is cut off", async () => {
    const hang: BackoffKv = {
      get: () => new Promise(() => {}),
      set: () => new Promise(() => {}),
      del: () => new Promise(() => {}),
    };
    const store = createBackoffStore(hang, key, { timeoutMs: 10 });
    await store.write({ until: 1, minutes: 5 });
    expect(await store.read()).toEqual({ until: 1, minutes: 5 });
  });
});
