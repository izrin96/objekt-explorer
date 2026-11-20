import { pub } from "../orpc";
import { documented, errorResponses, paramDescriptions } from "../schemas/common/documented";
import { addressTransfersInputSchema, addressTransfersOutputSchema } from "../schemas/transfers";
import { fetchAddressTransfers } from "../services/activity/transfers";

export const transfersRouter = {
  byAddress: pub
    .route({
      method: "GET",
      path: "/transfers/{address}",
      tags: ["Transfers"],
      summary: "Transfers to and from an address",
      spec: (operation) => paramDescriptions(errorResponses(400)(operation)),
    })
    .input(addressTransfersInputSchema)
    .output(documented(addressTransfersOutputSchema))
    .handler(({ input: { address, ...query } }) => fetchAddressTransfers(address, query)),
};
