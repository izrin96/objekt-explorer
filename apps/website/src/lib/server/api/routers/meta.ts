import { pub } from "../orpc";

export const metaRouter = {
  supportedCurrencies: pub.handler(() => {
    return Intl.supportedValuesOf("currency");
  }),
};
