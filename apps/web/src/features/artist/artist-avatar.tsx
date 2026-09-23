import type { CosmoArtistWithMembersBFF } from "@repo/cosmo/types/artists";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function ArtistAvatar({
  artist,
  className,
}: {
  artist: CosmoArtistWithMembersBFF;
  className?: string;
}) {
  return (
    <Avatar className={cn("ring-background size-5 ring-2", className)}>
      <AvatarImage src={artist.logoImageUrl} alt="" className="bg-black object-contain" />
      <AvatarFallback className="font-bold text-white">
        {artist.title.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
