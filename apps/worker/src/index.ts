import { Cron } from "croner";

import { fixObjektMetadata, fixObjektSerialZero } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";

void new Cron("*/10 * * * *", updateTransferableCosmoSpin);

void new Cron("0 * * * *", fixObjektMetadata);

void new Cron("0 * * * *", fixObjektSerialZero);
