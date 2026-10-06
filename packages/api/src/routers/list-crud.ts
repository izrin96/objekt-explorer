import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { lists } from "@repo/db/schema";
import { normalizeCurrency } from "@repo/lib/currency";
import { bumpTradeVersion } from "@repo/lib/server/list-touch";
import { and, eq, ne } from "drizzle-orm";
import { nanoid } from "nanoid";

import { authed, pub } from "../orpc";
import { documented } from "../schemas/common/documented";
import {
  createListInputSchema,
  editListInputSchema,
  findPublicOutputSchema,
  listSlugInputSchema,
} from "../schemas/list";
import {
  checkLinkedList,
  createdBumpedAt,
  fetchList,
  generateProfileSlug,
  findOwnedList,
  resolveDiscoverable,
  touchList,
  tradeColumns,
} from "../services/list";
import { assertProfileOwned } from "../services/profile";
import { redis } from "../services/redis";

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
        messages,
        session: { user },
      },
    }) => {
      const isProfileBind = ["have", "sale"].includes(input.listTypeNew)
        ? input.isProfileBind
        : false;

      const linkedListId = ["have", "want"].includes(input.listTypeNew) ? input.linkedListId : null;

      // Validate: sale lists require currency
      if (input.listTypeNew === "sale" && !input.currency) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Currency is required for sale lists",
        });
      }

      // Validate: profile binding requires profile address
      if (isProfileBind && !input.profileAddress) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Profile address is required for profile-bound lists",
        });
      }

      // Validate profile ownership and linked list ownership + type compatibility.
      // allSettled keeps the profile error taking precedence over the linked one.
      const [profileCheck, linkedCheck] = await Promise.allSettled([
        input.profileAddress
          ? assertProfileOwned(input.profileAddress, user.id, messages)
          : undefined,
        linkedListId !== null
          ? checkLinkedList(input.listTypeNew, linkedListId, user.id)
          : undefined,
      ]);

      if (profileCheck.status === "rejected") throw profileCheck.reason;
      if (linkedCheck.status === "rejected") throw linkedCheck.reason;

      const requested = input.discoverable || input.showOnTrade === true;
      const discoverable = resolveDiscoverable(input.listTypeNew, isProfileBind, requested);
      const showOnTrade = input.showOnTrade === true && discoverable;

      const slug = nanoid(9);
      let profileSlug: string | null = null;
      if (input.profileAddress) {
        profileSlug = await generateProfileSlug(
          input.name,
          slug,
          input.profileAddress.toLowerCase(),
        );
      }

      const touched = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(lists)
          .values({
            name: input.name,
            userId: user.id,
            slug,
            profileSlug,
            hideUser: input.hideUser,
            listTypeNew: input.listTypeNew,
            isProfileBind,
            hideSerial:
              ["sale", "have"].includes(input.listTypeNew) && isProfileBind
                ? input.hideSerial
                : false,
            linkedListId,
            profileAddress: input.profileAddress ? input.profileAddress.toLowerCase() : null,
            description: input.description,
            currency:
              input.listTypeNew === "sale" && input.currency
                ? normalizeCurrency(input.currency)
                : null,
            discoverable,
            showOnTrade,
            bumpedAt: showOnTrade
              ? createdBumpedAt(linkedListId, input.listTypeNew, user.id)
              : null,
            matchAlerts: input.listTypeNew === "general" || (input.matchAlerts ?? true),
          })
          .returning({ insertedId: lists.id });

        if (!inserted) return [];
        const changed = [inserted.insertedId];

        // Bidirectional link: clear any existing reverse link on target, then set new one
        if (linkedListId !== null) {
          const unlinked = await tx
            .update(lists)
            .set({ linkedListId: null })
            .where(and(eq(lists.linkedListId, linkedListId), ne(lists.id, inserted.insertedId)))
            .returning({ id: lists.id });
          changed.push(linkedListId, ...unlinked.map((row) => row.id));

          await tx
            .update(lists)
            .set({ linkedListId: inserted.insertedId })
            .where(eq(lists.id, linkedListId));

          // Sync discoverable to paired list so both mode works out of the box,
          // under the partner's own rule
          const partner = linkedCheck.value;
          if (
            partner &&
            resolveDiscoverable(partner.listTypeNew, partner.isProfileBind, requested)
          ) {
            await tx.update(lists).set({ discoverable: true }).where(eq(lists.id, linkedListId));
          }
        }

        return changed;
      });
      await touchList(touched);
    },
  ),

  edit: authed.input(editListInputSchema).handler(
    async ({
      input,
      context: {
        messages,
        session: { user },
      },
    }) => {
      const list = await findOwnedList(input.slug, user.id);

      const linkedListId = ["have", "want"].includes(list.listTypeNew) ? input.linkedListId : null;

      // Validate currency for sale lists
      if (list.listTypeNew === "sale" && !input.currency) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Currency is required for sale lists",
        });
      }

      // Validate profile ownership (skipped when isProfileBind — address changes are
      // ignored) and linkedListId ownership + type compatibility.
      // allSettled keeps the profile error taking precedence over the linked one.
      const [profileCheck, linkedCheck] = await Promise.allSettled([
        input.profileAddress && !list.isProfileBind
          ? assertProfileOwned(input.profileAddress, user.id, messages)
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

      const requested = input.discoverable || input.showOnTrade === true;
      const discoverable = resolveDiscoverable(list.listTypeNew, list.isProfileBind, requested);

      const touched = await db.transaction(async (tx) => {
        await tx
          .update(lists)
          .set({
            name: input.name,
            hideUser: input.hideUser,
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
            discoverable,
            ...tradeColumns(input.showOnTrade, discoverable, linkedListId),
            matchAlerts: list.listTypeNew === "general" ? undefined : input.matchAlerts,
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
            changed.push(...unlinked.map((row) => row.id));
          }
        }

        // Sync discoverable to paired list so both mode works out of the box, under the
        // partner's own rule. Only ever up: an edit of this list must not take its partner
        // off discovery or off Trade.
        const partner = linkedCheck.value;
        if (
          linkedListId !== null &&
          partner &&
          resolveDiscoverable(partner.listTypeNew, partner.isProfileBind, requested)
        ) {
          await tx.update(lists).set({ discoverable: true }).where(eq(lists.id, linkedListId));
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
