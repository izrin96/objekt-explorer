"use client";

import dynamic from "next/dynamic";
import type { PropsWithChildren } from "react";
import { useWide } from "@/hooks/use-wide";
import { cn } from "@/utils/classes";
import { Container } from "./ui";

export const DynamicContainerClient = dynamic(() => Promise.resolve(DynamicContainer), {
  ssr: false,
});

export default function DynamicContainer({ children }: PropsWithChildren) {
  const { wide } = useWide();
  return <Container className={cn(wide && "!max-w-full")}>{children}</Container>;
}
