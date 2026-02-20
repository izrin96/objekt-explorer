import { Cron } from "croner";

import { fixObjektMetadata, fixObjektSerialZero } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { cleanupProfileLists } from "./job/profile-list-cleanup";

void new Cron("*/10 * * * *", updateTransferableCosmoSpin);

void new Cron("* * * * *", cleanupProfileLists);

void new Cron("0 * * * *", fixObjektMetadata);

void new Cron("0 * * * *", fixObjektSerialZero);
