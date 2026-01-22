import { ofetch } from "ofetch";

import { COSMO_ENDPOINT } from "../universal/cosmo/common";

export const cosmo = ofetch.create({
  baseURL: COSMO_ENDPOINT,
  retry: 2,
  retryDelay: 500,
  timeout: 1000 * 10,
});
