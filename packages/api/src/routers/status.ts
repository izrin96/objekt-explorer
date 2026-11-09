import { pub } from "../orpc";
import { documented } from "../schemas/common/documented";
import { statusOutputSchema } from "../schemas/status";
import { fetchSystemStatus } from "../services/status";

export const statusRouter = {
  get: pub
    .route({
      method: "GET",
      path: "/status",
      tags: ["Status"],
      summary: "Whether the indexer is current and Cosmo is reachable",
    })
    .output(documented(statusOutputSchema))
    .handler(() => fetchSystemStatus()),
};
