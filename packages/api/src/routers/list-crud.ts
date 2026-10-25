import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { lists } from "@repo/db/schema";
import { normalizeCurrency } from "@repo/lib/currency";
import { eq } from "drizzle-orm";

import { refuse } from "../lib/refuse";
import { authed, pub } from "../orpc";
import { documented } from "../schemas/common/documented";
import {
  copyListInputSchema,
  copyListOutputSchema,
  copyPreviewInputSchema,
  copyPreviewOutputSchema,
  createListInputSchema,
  editListInputSchema,
  findPublicOutputSchema,
  listSlugInputSchema,
} from "../schemas/list";
import {
  fetchList,
  findOwnedList,
  generateProfileSlug,
  insertCopyRows,
  planCopy,
  prepareList,
  resolveDiscoverable,
  touchList,
  tradeColumns,
  writeList,
} from "../services/list";
import { copyRulesTx } from "../services/list-rules";
import { assertProfileOwned } from "../services/profile";
import { refuseOverUserLimit } from "../services/redis";
import { bumpTradeVersions } from "../services/safety-cache";

/** `list.create` and `list.copy` share one budget; each one inserts a list and its rows. */
const limitListWrites = (userId: string) => refuseOverUserLimit("list-create", userId, 30, 3600);

export const listCrud = {
  find: authed
    .input(listSlugInputSchema)
    .handler(async ({ input: { slug }, context: { session } }) => {
      const result = await db.query.lists.findFirst({
        where: { slug, userId: session.user.id },
      });

      if (!result) throw new ORPCError("NOT_FOUND");

      return result;
    }),

  findPublic: pub
    .route({
      method: "GET",
      path: "/lists/{slug}",
      tags: ["Lists"],
      summary: "A list's name, type and owner; null when no list has the slug",
    })
    .input(listSlugInputSchema)
    .output(documented(findPublicOutputSchema))
    .handler(async ({ input: { slug } }) => {
      return fetchList({ slug });
    }),

  create: authed.input(createListInputSchema).handler(
    async ({
      input,
      context: {
        session: { user },
      },
    }) => {
      await limitListWrites(user.id);
      const prepared = await prepareList(input, user.id);
      const { slug, changed } = await db.transaction((tx) => writeList(tx, prepared));
      await touchList(changed);
      // the create dialog offers Post it on the new list
      return { slug };
    },
  ),

  copy: authed
    .input(copyListInputSchema)
    .output(copyListOutputSchema)
    .handler(
      async ({
        input: { sourceSlug, ...input },
        context: {
          session: { user },
        },
      }) => {
        await limitListWrites(user.id);
        const source = await findOwnedList(sourceSlug, user.id);
        const prepared = await prepareList({ ...input, gridColumns: source.gridColumns }, user.id);
        const { rows, carried, leftOut, unit } = await planCopy(source, input, user.id);

        const { slug, changed } = await db.transaction(async (tx) => {
          const created = await writeList(tx, prepared);
          await insertCopyRows(tx, created.id, rows);
          // any other copy drops the rules with the objekts they want
          if (input.listType === "want" && source.listType === "want") {
            await copyRulesTx(tx, source.id, created.id);
          }
          return created;
        });
        await touchList(changed);

        return { slug, carried, leftOut, unit };
      },
    ),

  copyPreview: authed
    .input(copyPreviewInputSchema)
    .output(copyPreviewOutputSchema)
    .handler(
      async ({
        input: { sourceSlug, ...target },
        context: {
          session: { user },
        },
      }) => {
        const source = await findOwnedList(sourceSlug, user.id);
        const { carried, leftOut, unit } = await planCopy(source, target, user.id);
        return { carried, leftOut, unit };
      },
    ),

  edit: authed.input(editListInputSchema).handler(
    async ({
      input,
      context: {
        session: { user },
      },
    }) => {
      const list = await findOwnedList(input.slug, user.id);

      // Validate currency for sale lists
      if (list.listType === "sale" && !input.currency) {
        refuse("BAD_REQUEST", "list_currency_required", "Currency is required for sale lists");
      }

      // address changes are ignored on a bound list, so only an unbound one is checked
      if (input.profileAddress && !list.isProfileBind) {
        await assertProfileOwned(input.profileAddress, user.id);
      }

      let profileSlug: string | null = null;
      // For isProfileBind lists, the profileAddress is locked to the
      // original address — derive the slug from that, not from any
      // untrusted input the caller may have passed.
      const effectiveProfileAddress = list.isProfileBind
        ? list.profileAddress
        : input.profileAddress;
      if (effectiveProfileAddress) {
        const address = effectiveProfileAddress.toLowerCase();
        // Keep the existing slug unless the user opted to regenerate it or
        // the list moved to a different profile (slug uniqueness is per address).
        const keepSlug =
          !input.regenerateSlug &&
          list.profileSlug !== null &&
          list.profileAddress?.toLowerCase() === address;
        profileSlug = keepSlug
          ? list.profileSlug
          : await generateProfileSlug(input.name, list.slug, address, list.id);
      }

      // a have or want list's Trade state belongs to its post, which `trade.savePost` writes
      const discoverable =
        list.listType === "sale"
          ? resolveDiscoverable(
              list.listType,
              list.isProfileBind,
              input.discoverable ?? list.discoverable,
            )
          : list.discoverable;

      await db
        .update(lists)
        .set({
          name: input.name,
          gridColumns: input.gridColumns,
          profileAddress: list.isProfileBind
            ? undefined
            : input.profileAddress
              ? input.profileAddress.toLowerCase()
              : null,
          description: input.description,
          currency:
            list.listType === "sale" && input.currency ? normalizeCurrency(input.currency) : null,
          profileSlug,
          hideSerial:
            ["sale", "have"].includes(list.listType) && list.isProfileBind
              ? input.hideSerial
              : false,
          ...tradeColumns(discoverable),
        })
        .where(eq(lists.id, list.id));
      await touchList([list.id]);
    },
  ),

  delete: authed.input(listSlugInputSchema).handler(
    async ({
      input: { slug },
      context: {
        session: { user },
      },
    }) => {
      const list = await findOwnedList(slug, user.id);

      await db.delete(lists).where(eq(lists.id, list.id));
      await bumpTradeVersions([user.id]);
    },
  ),
};
