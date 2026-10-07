import { queryOptions } from "@tanstack/react-query";

import { authClient } from "@/lib/auth-client";

/** Better Auth has no oRPC route, so the key is written out rather than derived. */
export const ACCOUNTS_QUERY_KEY = ["accounts"] as const;

async function listAccounts() {
  const result = await authClient.listAccounts();
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export type LinkedAccount = Awaited<ReturnType<typeof listAccounts>>[number];

export const accountsOptions = queryOptions({
  queryKey: ACCOUNTS_QUERY_KEY,
  queryFn: listAccounts,
});

/** Email sign-up leaves a `credential` account, the only kind with a password to change. */
export const hasPassword = (accounts: readonly LinkedAccount[]) =>
  accounts.some((a) => a.providerId === "credential");
