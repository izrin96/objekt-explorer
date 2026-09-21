import { listCrud } from "./list-crud";
import { listEntriesRouter } from "./list-entries";
import { listTrades } from "./list-trades";
import { listUtils } from "./list-utils";

export const listRouter = {
  ...listCrud,
  ...listEntriesRouter,
  ...listTrades,
  ...listUtils,
};
