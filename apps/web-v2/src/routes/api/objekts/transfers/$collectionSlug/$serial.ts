import { createFileRoute } from "@tanstack/react-router";
import { and, desc, eq } from "drizzle-orm";
import { orpc } from "@/lib/orpc/client";
import { db } from "@/lib/server/db";
import { indexer } from "@/lib/server/db/indexer";
import { collections, objekts, transfers } from "@/lib/server/db/indexer/schema";
import { fetchKnownAddresses, fetchUserProfiles } from "@/lib/server/profile";
import type { ObjektTransferResult } from "@/lib/universal/objekts";

export const Route = createFileRoute("/api/objekts/transfers/$collectionSlug/$serial")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const session = await orpc.session.call();

        const results = await indexer
          .select({
            tokenId: objekts.id,
            id: transfers.id,
            to: transfers.to,
            timestamp: transfers.timestamp,
            owner: objekts.owner,
            transferable: objekts.transferable,
          })
          .from(transfers)
          .leftJoin(objekts, eq(transfers.objektId, objekts.id))
          .leftJoin(collections, eq(objekts.collectionId, collections.id))
          .where(
            and(
              eq(collections.slug, params.collectionSlug),
              eq(objekts.serial, Number(params.serial)),
            ),
          )
          .orderBy(desc(transfers.id));

        if (!results.length)
          return Response.json({
            transfers: [],
          } satisfies ObjektTransferResult);

        const [result] = results;

        const owner = await db.query.userAddress.findFirst({
          where: (q, { eq }) => eq(q.address, result.owner!),
          columns: {
            privateSerial: true,
          },
        });

        const isPrivate = owner?.privateSerial ?? false;

        if (!session && isPrivate)
          return Response.json({
            hide: true,
            transfers: [],
          } satisfies ObjektTransferResult);

        if (session && isPrivate) {
          const profiles = await fetchUserProfiles(session.user.id);

          const isProfileAuthed = profiles.some(
            (a) => a.address.toLowerCase() === result.owner!.toLowerCase(),
          );

          if (!isProfileAuthed)
            return Response.json({
              hide: true,
              transfers: [],
            } satisfies ObjektTransferResult);
        }

        const addresses = Array.from(new Set(results.map((r) => r.to)));

        const knownAddresses = await fetchKnownAddresses(addresses);

        return Response.json({
          tokenId: result.tokenId ?? undefined,
          owner: result.owner ?? undefined,
          transferable: result.transferable ?? undefined,
          transfers: results.map((result) => ({
            id: result.id,
            to: result.to,
            timestamp: result.timestamp,
            nickname: knownAddresses.find(
              (a) => a.address.toLowerCase() === result.to.toLowerCase() && !a.hideNickname,
            )?.nickname,
          })),
        } satisfies ObjektTransferResult);
      },
    },
  },
});
