"use client";

import { useRouter } from "next/navigation";
import { type PropsWithChildren, useEffect } from "react";
import { useTarget } from "@/hooks/use-target";

export default function PrefetchLink({ children }: PropsWithChildren) {
  const profile = useTarget((a) => a.profile)!;
  const router = useRouter();

  useEffect(() => {
    router.prefetch(`/@${profile.nickname ?? profile.address}`);
    router.prefetch(`/@${profile.nickname ?? profile.address}/trades`);
    router.prefetch(`/@${profile.nickname ?? profile.address}/stats`);
    router.prefetch(`/@${profile.nickname ?? profile.address}/progress`);
  }, []);

  return children;
}
