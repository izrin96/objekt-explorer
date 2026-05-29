import { DiscordLogoIcon, XLogoIcon } from "@phosphor-icons/react/dist/ssr";

import { cn } from "@/lib/utils";

import { Badge } from "./badge";

export function SocialBadge({
  platform,
  username,
  className,
}: {
  platform: "discord" | "twitter";
  username: string;
  className?: string;
}) {
  if (platform === "discord") {
    return (
      <Badge
        className={cn(
          "bg-[#5865F2]/10 border-[#5865F2]/20 !text-[#5865F2] select-all truncate",
          className,
        )}
      >
        <DiscordLogoIcon size={12} weight="fill" className="shrink-0" />
        <span className="truncate">{username}</span>
      </Badge>
    );
  }

  return (
    <Badge
      className={cn("bg-muted border-border/50 !text-muted-fg select-all truncate", className)}
    >
      <XLogoIcon size={12} weight="fill" className="shrink-0" />
      <span className="truncate">{username}</span>
    </Badge>
  );
}
