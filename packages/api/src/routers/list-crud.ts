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
  slugPreviewInputSchema,
  slugPreviewOutputSchema,
} from "../schemas/list";
import { planCopy, writeCopy } from "../services/list/copy";
import { createList, generateProfileSlug, prepareList } from "../services/list/create";
import { deleteList, editList } from "../services/list/edit";
import { fetchList, findOwnedList } from "../services/list/read";
import { touchList } from "../services/list/shared";
import { refuseOverUserLimit } from "../services/redis";

/** `list.create` and `list.copy` share one budget; each one inserts a list and its rows. */
const limitListWrites = (userId: string) => refuseOverUserLimit("list-create", userId, 30, 3600);

export const listCrud = {
  find: authed
    .input(listSlugInputSchema)
    .handler(async ({ input: { slug }, context: { session } }) => {
      return findOwnedList(slug, session.user.id);
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
      const { slug, changed } = await createList(prepared);
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

        const { slug, changed } = await writeCopy(source, input.listType, prepared, rows);
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

  edit: authed
    .input(editListInputSchema)
    .handler(({ input, context: { session } }) => editList(session.user.id, input)),

  slugPreview: authed
    .input(slugPreviewInputSchema)
    .output(slugPreviewOutputSchema)
    .handler(
      async ({
        input: { slug, name },
        context: {
          session: { user },
        },
      }) => {
        await refuseOverUserLimit("list-slug-preview", user.id, 60, 60);
        const list = await findOwnedList(slug, user.id);
        if (!list.profileAddress) {
          refuse("BAD_REQUEST", "list_profile_required", "The list is not filed under a profile");
        }
        // the call list.edit makes, so the preview carries the "-<counter>" a taken slug gets
        const profileSlug = await generateProfileSlug(
          name,
          list.slug,
          list.profileAddress.toLowerCase(),
          list.id,
        );
        return { profileSlug };
      },
    ),

  delete: authed
    .input(listSlugInputSchema)
    .handler(({ input: { slug }, context: { session } }) => deleteList(session.user.id, slug)),
};
