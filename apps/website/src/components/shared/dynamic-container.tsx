import type { PropsWithChildren } from "react";

import { Container } from "@/components/intentui/container";
import { useWide } from "@/hooks/use-wide";
import { cn } from "@/lib/utils";

export default function DynamicContainer({ children }: PropsWithChildren) {
  const { wide } = useWide();
  return (
    <Container
      className={cn("[--container-breakpoint:var(--breakpoint-2xl)]", wide && "max-w-full!")}
    >
      {children}
    </Container>
  );
}
