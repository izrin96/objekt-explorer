import type { ValidArtist } from "@repo/cosmo/types/common";
import type { CosmoPublicUser } from "@repo/cosmo/types/user";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { ArtistAvatar } from "@/features/artist/artist-avatar";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { type Code, codeInput, hasProfile } from "@/features/link/link-flow-rules";
import { StepError } from "@/features/link/steps/step-error";
import { orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

export function ArtistStep({
  found,
  onCode,
}: {
  found: CosmoPublicUser;
  onCode: (artistId: ValidArtist, code: Code) => void;
}) {
  const { artists } = useCosmoArtist();
  const generate = useMutation(orpc.cosmoLink.generateCode.mutationOptions());

  // the Cosmo search lists an ID's artist profiles only some of the time, and
  // our cache fallback never does; without them every artist is offered
  const onProfile = artists.filter((artist) => hasProfile(found, artist.id));
  const options = onProfile.length > 0 ? onProfile : artists;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm text-pretty">
        {m.link_process_artist_step_select()}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((artist) => (
          <Button
            key={artist.id}
            variant="outline"
            disabled={generate.isPending}
            loading={generate.isPending && generate.variables?.artistId === artist.id}
            onClick={() =>
              generate.mutate(codeInput(found, artist.id), {
                onSuccess: (code) => onCode(artist.id, code),
              })
            }
          >
            <ArtistAvatar artist={artist} className="ring-0" />
            {artist.title}
          </Button>
        ))}
      </div>

      {generate.isError && <StepError message={refusalText(generate.error)} />}
    </div>
  );
}
