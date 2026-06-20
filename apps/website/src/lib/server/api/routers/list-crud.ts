import { ORPCError } from "@orpc/server";
import { db } from "@repo/db";
import { lists } from "@repo/db/schema";
import { isAddress } from "@repo/lib";
import { and, eq, ne } from "drizzle-orm";
import { nanoid } from "nanoid";
import * as z from "zod";

import {
  checkLinkedList,
  checkProfileOwnership,
  fetchList,
  generateProfileSlug,
  findOwnedList,
} from "../../list.server";
import { authed, pub } from "../orpc";

export const listCrud = {
  find: authed
    .input(z.object({ slug: z.string() }))
    .handler(async ({ input: { slug }, context: { session } }) => {
      const result = await db.query.lists.findFirst({
        where: { slug, userId: session.user.id },
      });

      if (!result) throw new ORPCError("NOT_FOUND");

      return result;
    }),

  findPublic: pub.input(z.object({ slug: z.string() })).handler(async ({ input: { slug } }) => {
    return fetchList({ slug: slug });
  }),

  create: authed
    .input(
      z.object({
        name: z.string().min(1).max(256),
        hideUser: z.boolean(),
        listTypeNew: z.enum(["general", "sale", "have", "want"]).default("general"),
        isProfileBind: z.boolean().default(false),
        hideSerial: z.boolean().default(false),
        linkedListId: z.number().nullable(),
        profileAddress: z
          .string()
          .refine((val) => isAddress(val))
          .nullable(),
        description: z.string().max(5000).nullable(),
        currency: z.string().max(10).nullable(),
        discoverable: z.boolean().default(false),
      }),
    )
    .handler(
      async ({
        input,
        context: {
          session: { user },
        },
      }) => {
        const isProfileBind = ["have", "sale"].includes(input.listTypeNew)
          ? input.isProfileBind
          : false;

        const linkedListId = ["have", "want"].includes(input.listTypeNew)
          ? input.linkedListId
          : null;

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

        // Validate: profile ownership
        if (input.profileAddress) {
          await checkProfileOwnership(input.profileAddress, user.id);
        }

        // Validate: linked list ownership and type compatibility
        if (linkedListId !== null) {
          await checkLinkedList(input.listTypeNew, linkedListId, user.id);
        }

        const slug = nanoid(9);
        let profileSlug: string | null = null;
        if (input.profileAddress) {
          profileSlug = await generateProfileSlug(
            input.name,
            slug,
            input.profileAddress.toLowerCase(),
          );
        }

        await db.transaction(async (tx) => {
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
              currency: input.listTypeNew === "sale" ? input.currency : null,
              discoverable: ["have", "sale", "want"].includes(input.listTypeNew)
                ? input.listTypeNew === "want"
                  ? input.discoverable
                  : isProfileBind && input.discoverable
                : false,
            })
            .returning({ insertedId: lists.id });

          // Bidirectional link: clear any existing reverse link on target, then set new one
          if (linkedListId !== null && inserted) {
            await tx
              .update(lists)
              .set({ linkedListId: null })
              .where(and(eq(lists.linkedListId, linkedListId), ne(lists.id, inserted.insertedId)));

            await tx
              .update(lists)
              .set({ linkedListId: inserted.insertedId })
              .where(eq(lists.id, linkedListId));

            // Sync discoverable to paired list so both mode works out of the box
            if (input.discoverable) {
              await tx.update(lists).set({ discoverable: true }).where(eq(lists.id, linkedListId));
            }
          }
        });
      },
    ),

  edit: authed
    .input(
      z.object({
        slug: z.string(),
        name: z.string().min(1).max(256),
        hideUser: z.boolean(),
        gridColumns: z.number().min(2).max(18).nullable(),
        profileAddress: z
          .string()
          .refine((val) => isAddress(val))
          .nullable(),
        description: z.string().max(5000).nullable(),
        currency: z.string().max(10).nullable(),
        hideSerial: z.boolean(),
        linkedListId: z.number().nullable(),
        discoverable: z.boolean(),
      }),
    )
    .handler(
      async ({
        input,
        context: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(input.slug, user.id);

        const linkedListId = ["have", "want"].includes(list.listTypeNew)
          ? input.linkedListId
          : null;

        // Validate currency for sale lists
        if (list.listTypeNew === "sale" && !input.currency) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Currency is required for sale lists",
          });
        }

        // Validate profile ownership (skip when isProfileBind — address changes are ignored)
        if (input.profileAddress && !list.isProfileBind) {
          await checkProfileOwnership(input.profileAddress, user.id);
        }

        // Validate linkedListId ownership and type compatibility
        if (linkedListId !== null) {
          await checkLinkedList(list.listTypeNew, linkedListId, user.id);
        }

        let profileSlug: string | null = null;
        // For isProfileBind lists, the profileAddress is locked to the
        // original address — derive the slug from that, not from any
        // untrusted input the caller may have passed.
        const effectiveProfileAddress = list.isProfileBind
          ? list.profileAddress
          : input.profileAddress;
        if (effectiveProfileAddress) {
          profileSlug = await generateProfileSlug(
            input.name,
            list.slug,
            effectiveProfileAddress.toLowerCase(),
            list.id,
          );
        }

        await db.transaction(async (tx) => {
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
              currency: list.listTypeNew === "sale" ? input.currency : null,
              profileSlug,
              hideSerial:
                ["sale", "have"].includes(list.listTypeNew) && list.isProfileBind
                  ? input.hideSerial
                  : false,
              linkedListId,
              discoverable: ["have", "sale", "want"].includes(list.listTypeNew)
                ? list.listTypeNew === "want"
                  ? input.discoverable
                  : list.isProfileBind && input.discoverable
                : false,
            })
            .where(eq(lists.id, list.id));

          // Bidirectional link: update reverse links
          if (linkedListId !== list.linkedListId) {
            // Clear old reverse link if there was one
            if (list.linkedListId) {
              await tx
                .update(lists)
                .set({ linkedListId: null })
                .where(eq(lists.id, list.linkedListId));
            }

            // Set new reverse link, clearing any existing partner on the target
            if (linkedListId !== null) {
              await tx
                .update(lists)
                .set({ linkedListId: null })
                .where(and(eq(lists.linkedListId, linkedListId), ne(lists.id, list.id)));

              await tx
                .update(lists)
                .set({ linkedListId: list.id })
                .where(eq(lists.id, linkedListId));
            }
          }

          // Sync discoverable to paired list so both mode works out of the box
          if (linkedListId !== null) {
            await tx
              .update(lists)
              .set({ discoverable: input.discoverable })
              .where(eq(lists.id, linkedListId));
          }
        });
      },
    ),

  delete: authed
    .input(
      z.object({
        slug: z.string(),
      }),
    )
    .handler(
      async ({
        input: { slug },
        context: {
          session: { user },
        },
      }) => {
        const list = await findOwnedList(slug, user.id);

        await db.delete(lists).where(eq(lists.id, list.id));
      },
    ),
};
