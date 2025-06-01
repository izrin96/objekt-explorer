import { z } from "zod/v4";
import { Transfer } from "../server/db/indexer/schema";
import { UserAddress } from "../server/db/schema";
import { OwnedObjekt } from "./objekts";

export type ActivityData = {
  transfer: Transfer;
  objekt: OwnedObjekt;
  user: {
    from: Pick<UserAddress, "address" | "nickname"> | undefined;
    to: Pick<UserAddress, "address" | "nickname"> | undefined;
  };
};

export type ActivityResponse = {
  items: ActivityData[];
  nextCursor: z.infer<typeof cursorSchema>;
};

const cursorSchema = z
  .object({
    timestamp: z.string(),
    id: z.string(),
  })
  .optional();
