import { listCrud } from "./list-crud";
import { listEntriesRouter } from "./list-entries";
import { listRulesRouter } from "./list-rules";
import { listUtils } from "./list-utils";

export const listRouter = {
  ...listCrud,
  ...listEntriesRouter,
  ...listRulesRouter,
  ...listUtils,
};
