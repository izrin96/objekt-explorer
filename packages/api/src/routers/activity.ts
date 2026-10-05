import { pub } from "../orpc";
import { activityQuerySchema } from "../schemas/activity";
import { fetchActivityPage } from "../services/activity-feed";

export const activityRouter = {
  feed: pub
    .route({ method: "GET", path: "/activity", tags: ["Activity"], summary: "Recent transfers" })
    .input(activityQuerySchema)
    .handler(({ input }) => fetchActivityPage(input)),
};
