import { listCrud } from "./list-crud";
import { listEntriesRouter } from "./list-entries";
import { listUtils } from "./list-utils";

export const listRouter = {
  ...listCrud,
  ...listEntriesRouter,
  ...listUtils,
};
