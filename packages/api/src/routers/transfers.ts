import * as z from "zod";

import { pub } from "../orpc";
import { transfersQuerySchema } from "../schemas/transfers";
import { fetchAddressTransfers } from "../services/transfers";

export const transfersRouter = {
  byAddress: pub
    .route({
      method: "GET",
      path: "/transfers/{address}",
      tags: ["Transfers"],
      summary: "Transfers to and from an address",
    })
    .input(transfersQuerySchema.extend({ address: z.string() }))
    .handler(({ input: { address, ...query } }) => fetchAddressTransfers(address, query)),
};
