import { pub } from "../orpc";
import { activityFeedInputSchema, activityFeedOutputSchema } from "../schemas/activity";
import { documented } from "../schemas/common/documented";
import { fetchActivityPage } from "../services/activity-feed";

export const activityRouter = {
  feed: pub
    .route({ method: "GET", path: "/activity", tags: ["Activity"], summary: "Recent transfers" })
    .input(activityFeedInputSchema)
    .output(documented(activityFeedOutputSchema))
    .handler(({ input }) => fetchActivityPage(input)),
};
