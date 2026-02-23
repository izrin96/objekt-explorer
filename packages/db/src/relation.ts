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
    lists: r.many.lists(),
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
    userAddress: r.one.userAddress({
      from: r.lists.profileAddress,
      to: r.userAddress.address,
    }),
  },
  listEntries: {
    list: r.one.lists({
      from: r.listEntries.listId,
      to: r.lists.id,
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
