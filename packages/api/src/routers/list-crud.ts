import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { lists } from "@repo/db/schema";
import { normalizeCurrency } from "@repo/lib/currency";
import { bumpTradeVersion } from "@repo/lib/server/list-touch";
import { and, eq, ne } from "drizzle-orm";

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
import { resolveOpenTo } from "../schemas/open-to";
import {
  checkLinkedList,
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
import { assertProfileOwned } from "../services/profile";
import { redis, refuseOverUserLimit } from "../services/redis";

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
      const { changed } = await db.transaction((tx) => writeList(tx, prepared));
      await touchList(changed);
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

      const linkedListId = ["have", "want"].includes(list.listTypeNew) ? input.linkedListId : null;

      // Validate currency for sale lists
      if (list.listTypeNew === "sale" && !input.currency) {
        refuse("BAD_REQUEST", "list_currency_required", "Currency is required for sale lists");
      }

      // Validate profile ownership (skipped when isProfileBind — address changes are
      // ignored) and linkedListId ownership + type compatibility.
      // allSettled keeps the profile error taking precedence over the linked one.
      const [profileCheck, linkedCheck] = await Promise.allSettled([
        input.profileAddress && !list.isProfileBind
          ? assertProfileOwned(input.profileAddress, user.id)
          : undefined,
        linkedListId !== null
          ? checkLinkedList(list.listTypeNew, linkedListId, user.id)
          : undefined,
      ]);

      if (profileCheck.status === "rejected") throw profileCheck.reason;
      if (linkedCheck.status === "rejected") throw linkedCheck.reason;

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

      const discoverable = resolveDiscoverable(
        list.listTypeNew,
        list.isProfileBind,
        input.discoverable,
      );

      const touched = await db.transaction(async (tx) => {
        await tx
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
              list.listTypeNew === "sale" && input.currency
                ? normalizeCurrency(input.currency)
                : null,
            profileSlug,
            hideSerial:
              ["sale", "have"].includes(list.listTypeNew) && list.isProfileBind
                ? input.hideSerial
                : false,
            linkedListId,
            ...(list.listTypeNew === "want" ? resolveOpenTo(list.listTypeNew, input, list) : {}),
            ...tradeColumns(discoverable, linkedListId),
          })
          .where(eq(lists.id, list.id));

        const changed = [list.id];

        // Bidirectional link: update reverse links
        if (linkedListId !== list.linkedListId) {
          // Clear old reverse link if there was one
          if (list.linkedListId) {
            await tx
              .update(lists)
              .set({ linkedListId: null })
              .where(eq(lists.id, list.linkedListId));
            changed.push(list.linkedListId);
          }

          // Set new reverse link, clearing any existing partner on the target
          if (linkedListId !== null) {
            const unlinked = await tx
              .update(lists)
              .set({ linkedListId: null })
              .where(and(eq(lists.linkedListId, linkedListId), ne(lists.id, list.id)))
              .returning({ id: lists.id });

            await tx.update(lists).set({ linkedListId: list.id }).where(eq(lists.id, linkedListId));
            changed.push(linkedListId, ...unlinked.map((row) => row.id));
          }
        }

        // a new link brings the partner onto Trade; a save that keeps the link leaves the
        // partner's own choice alone
        const partner = linkedCheck.value;
        if (
          linkedListId !== null &&
          linkedListId !== list.linkedListId &&
          partner &&
          resolveDiscoverable(partner.listTypeNew, partner.isProfileBind, discoverable)
        ) {
          await tx.update(lists).set(tradeColumns(true)).where(eq(lists.id, linkedListId));
          changed.push(linkedListId);
        }

        return changed;
      });
      await touchList(touched);
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
      await bumpTradeVersion(redis, [user.id]);
    },
  ),
};
