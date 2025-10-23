import { PrivyClient } from "@privy-io/node";
import { env } from "@/env";

export const privy = new PrivyClient({
  appId: env.NEXT_PUBLIC_PRIVY_APP_ID,
  appSecret: env.PRIVY_APP_SECRET,
});
