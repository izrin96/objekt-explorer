"use client";

import { AbstractPrivyProvider } from "@abstract-foundation/agw-react/privy";
import { useQueryClient } from "@tanstack/react-query";
import { abstract } from "viem/chains";
import { env } from "@/env";

export default function AbstractWalletWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  return (
    <AbstractPrivyProvider
      chain={abstract}
      appId={env.NEXT_PUBLIC_PRIVY_APP_ID}
      queryClient={queryClient}
    >
      {children}
    </AbstractPrivyProvider>
  );
}
