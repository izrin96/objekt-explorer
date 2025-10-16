import { PrivyClient } from "@privy-io/server-auth";
import { env } from "@/env";

export const privy = new PrivyClient(env.NEXT_PUBLIC_PRIVY_APP_ID, env.PRIVY_APP_SECRET);
