import { ofetch } from "ofetch";

import { COSMO_ENDPOINT } from "../types/common";

const apolloHeaders = {
  "User-Agent": "objekt.top (github.com/izrin96/objekt-explorer)",
};

const proxy = process.env.COSMO_PROXY;

/**
 * Spread into every request to api.cosmo.fans. Cosmo's firewall blocks some server IPs, so
 * COSMO_PROXY (an HTTP proxy such as a local WARP) routes only Cosmo calls around it; unset,
 * calls go out directly. Typed `object` because ofetch's types lack Bun's `proxy`, which ofetch
 * still hands to fetch.
 */
export const cosmoProxyOptions: object = proxy ? { proxy } : {};

/**
 * HTTP client for Cosmo.
 */
export const cosmo = ofetch.create({
  baseURL: COSMO_ENDPOINT,
  ...cosmoProxyOptions,
  retry: 2,
  retryDelay: 500, // 500ms
  timeout: 1000 * 10, // 10s
  headers: apolloHeaders,
});
