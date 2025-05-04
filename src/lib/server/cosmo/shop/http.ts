import { ofetch } from "ofetch";

export const cosmoShop = ofetch.create({
  baseURL: "https://shop.cosmo.fans",
  headers: {
    Origin: "https://shop.cosmo.fans",
  },
});
