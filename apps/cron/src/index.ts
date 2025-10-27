import "dotenv/config";
import { Cron } from "croner";
import { fixObjektMetadata } from "./job/collection";
import { updateTransferableCosmoSpin } from "./job/cosmo-spin";

new Cron("*/10 * * * *", updateTransferableCosmoSpin);

new Cron("0 0 * * *", fixObjektMetadata);
