import { AbstractPrivyProvider as Provider } from "@abstract-foundation/agw-react/privy";
import { useQueryClient } from "@tanstack/react-query";
import { abstract } from "viem/chains";

export default function AbstractPrivyProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  return (
    <Provider
      chain={abstract}
      appId={import.meta.env.VITE_PRIVY_APP_ID || ""}
      queryClient={queryClient}
    >
      {children}
    </Provider>
  );
}
