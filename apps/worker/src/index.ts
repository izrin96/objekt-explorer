import { Cron } from "croner";

import { fixObjektMetadata, fixObjektSerialZero } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { cleanupProfileLists, syncProfileListsToCache } from "./job/profile-list-cleanup";

void syncProfileListsToCache();

void new Cron("*/10 * * * *", updateTransferableCosmoSpin);

void new Cron("*/30 * * * *", syncProfileListsToCache);

void new Cron("*/10 * * * *", cleanupProfileLists);

void new Cron("0 * * * *", fixObjektMetadata);

void new Cron("0 * * * *", fixObjektSerialZero);
