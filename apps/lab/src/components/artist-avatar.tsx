import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ARTIST_COLOR, ARTIST_LOGO } from "@/fixtures/artists";
import type { LabArtist } from "@/fixtures/objekts";
import { cn } from "@/lib/utils";

/**
 * The real Cosmo logo, on the artist's colour until the image lands. Its own
 * module rather than an export of `account/settings-dialog`: the active-filter
 * chip row draws an artist chip with it, and a chip has no business pulling
 * the whole settings dialog into the filters graph.
 */
export function ArtistAvatar({ artist, className }: { artist: LabArtist; className?: string }) {
  return (
    <Avatar className={cn("ring-background size-5 ring-2", className)}>
      <AvatarImage src={ARTIST_LOGO[artist]} alt="" className="bg-black object-contain" />
      <AvatarFallback
        className="text-[10px] font-bold text-white"
        style={{ background: ARTIST_COLOR[artist] }}
      >
        {artist.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
