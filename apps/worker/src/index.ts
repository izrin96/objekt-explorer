import { Cron } from "croner";

import { fixObjektMetadata, fixObjektSerialZero } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";
import { cleanupProfileLists, syncProfileListsToCache } from "./job/profile-list-cleanup";

// fix metadata
void fixObjektMetadata();
void fixObjektSerialZero();
// void new Cron("0 * * * *", fixObjektMetadata);
// void new Cron("0 * * * *", fixObjektSerialZero);

// cosmo-spin transferable update
void updateTransferableCosmoSpin();
void new Cron("*/10 * * * *", updateTransferableCosmoSpin);

// profile list
void syncProfileListsToCache();
void new Cron("*/30 * * * *", syncProfileListsToCache);

void cleanupProfileLists();
void new Cron("*/10 * * * *", cleanupProfileLists);
