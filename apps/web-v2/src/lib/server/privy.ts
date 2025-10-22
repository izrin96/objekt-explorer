import { PrivyClient } from "@privy-io/node";
import { env } from "../env/server";

export const privy = new PrivyClient({
  appId: env.VITE_PRIVY_APP_ID,
  appSecret: env.PRIVY_APP_SECRET,
});
