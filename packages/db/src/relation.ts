import { defineRelations } from "drizzle-orm";

import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  userAddress: {
    user: r.one.user({
      from: r.userAddress.userId,
      to: r.user.id,
    }),
    pins: r.many.pins(),
    locks: r.many.lockedObjekts(),
  },
  user: {
    userAddresses: r.many.userAddress(),
  },
  lists: {
    entries: r.many.listEntries(),
    user: r.one.user({
      from: r.lists.userId,
      to: r.user.id,
    }),
  },
  listEntries: {
    list: r.one.lists({
      from: r.listEntries.listId,
      to: r.lists.id,
    }),
  },
  profileLists: {
    entries: r.many.profileListEntries(),
    userAddess: r.one.userAddress({
      from: r.profileLists.address,
      to: r.userAddress.address,
    }),
  },
  profileListEntries: {
    list: r.one.profileLists({
      from: r.profileListEntries.listId,
      to: r.profileLists.id,
    }),
  },
  pins: {
    userAddress: r.one.userAddress({
      from: r.pins.address,
      to: r.userAddress.address,
    }),
  },
  lockedObjekts: {
    userAddress: r.one.userAddress({
      from: r.lockedObjekts.address,
      to: r.userAddress.address,
    }),
  },
}));
