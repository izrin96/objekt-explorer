import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { artists } from "@/lib/server/cosmo/artists";
import { PropsWithChildren } from "react";

export default async function ProfileLayout(props: PropsWithChildren) {
  return (
    <CosmoArtistProvider artists={artists}>
      {props.children}
    </CosmoArtistProvider>
  );
}
