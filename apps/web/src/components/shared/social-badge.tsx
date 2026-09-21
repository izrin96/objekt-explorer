import { DiscordLogoIcon, XLogoIcon } from "@phosphor-icons/react";
import type { ReactElement } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type SocialPlatform = "cosmo" | "discord" | "twitter";

const PLATFORM: Record<SocialPlatform, { icon: ReactElement | null; tone: string }> = {
  cosmo: { icon: null, tone: "bg-popover border-border text-foreground" },
  discord: {
    icon: <DiscordLogoIcon weight="fill" className="size-3.5 shrink-0" />,
    tone: "bg-discord/10 border-discord/20 text-discord",
  },
  twitter: {
    icon: <XLogoIcon weight="fill" className="size-3.5 shrink-0" />,
    tone: "bg-muted border-border/50 text-muted-foreground",
  },
};

export function SocialBadge({
  platform,
  username,
  className,
}: {
  platform: SocialPlatform;
  username: string;
  className?: string;
}): ReactElement {
  const { icon, tone } = PLATFORM[platform];

  return (
    <Badge className={cn("max-w-44 gap-1 rounded-full px-2 text-xs", tone, className)}>
      {icon}
      <span className="truncate">{username}</span>
    </Badge>
  );
}
