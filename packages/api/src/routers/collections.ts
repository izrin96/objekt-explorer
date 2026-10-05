import { getRequestHeaders } from "@tanstack/react-start/server";
import * as z from "zod";

import { optionalAuthed, pub } from "../orpc";
import { artistsArraySchema } from "../schemas/artist";
import { checkpointSchema } from "../schemas/checkpoint";
import { collectionResultSchema, holdersInputSchema } from "../schemas/objekt";
import {
  fetchCollectionList,
  fetchCollectionMetadata,
  fetchSerialList,
  fetchSerialTransfers,
} from "../services/collection";
import { fetchHolders } from "../services/holders";
import { fetchCollectionRarity } from "../services/rarity";

const slugInput = z.object({ collectionSlug: z.string() });

const collectionListOutput = z.union([
  z.object({
    status: z.literal(200),
    headers: z.object({ "last-modified": z.string().optional(), "cache-control": z.string() }),
    body: collectionResultSchema,
  }),
  z.object({
    status: z.literal(304).meta({ description: "Not modified since If-Modified-Since" }),
    headers: z.object({ "last-modified": z.string().optional() }),
  }),
]);

export const collectionsRouter = {
  rarity: pub.handler(() => {
    return fetchCollectionRarity();
  }),

  holders: optionalAuthed
    .input(holdersInputSchema)
    .handler(({ input, context: { session } }) => fetchHolders(input, session?.user.id)),

  /** Answers a conditional GET with 304, so a browser revalidates its copy instead of downloading it again. */
  list: pub
    .route({
      method: "GET",
      path: "/collections",
      tags: ["Collections"],
      summary: "Every collection, newest first",
      outputStructure: "detailed",
    })
    .input(
      z.object({
        artist: artistsArraySchema.default([]),
        at: checkpointSchema.optional(),
      }),
    )
    .output(collectionListOutput)
    .handler(async ({ input, context }) => {
      const ifModifiedSince = (context.headers ?? getRequestHeaders()).get("if-modified-since");
      const ifModifiedSinceMs = ifModifiedSince ? new Date(ifModifiedSince).getTime() : 0;

      const list = await fetchCollectionList(input, ifModifiedSinceMs);
      const lastModified =
        list.lastModifiedMs > 0 ? new Date(list.lastModifiedMs).toUTCString() : undefined;

      if (list.notModified) {
        return { status: 304 as const, headers: { "last-modified": lastModified } };
      }

      return {
        status: 200 as const,
        headers: {
          "last-modified": lastModified,
          "cache-control": "private, max-age=0, must-revalidate",
        },
        body: list.result,
      };
    }),

  metadata: pub
    .route({
      method: "GET",
      path: "/collections/{collectionSlug}/metadata",
      tags: ["Collections"],
      summary: "Copies minted, spun and transferable",
    })
    .input(slugInput)
    .handler(({ input }) => fetchCollectionMetadata(input.collectionSlug)),

  serials: pub
    .route({
      method: "GET",
      path: "/collections/{collectionSlug}/serials",
      tags: ["Collections"],
      summary: "Every minted serial, and which were spun",
    })
    .input(slugInput)
    .handler(({ input }) => fetchSerialList(input.collectionSlug)),

  serialTransfers: pub
    .route({
      method: "GET",
      path: "/collections/{collectionSlug}/serials/{serial}/transfers",
      tags: ["Collections"],
      summary: "One serial's transfer history",
    })
    .input(slugInput.extend({ serial: z.coerce.number().int() }))
    .handler(({ input }) => fetchSerialTransfers(input.collectionSlug, input.serial)),
};
