import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { getArtistsWithMembers } from "@/lib/client-fetching";
import { PropsWithChildren } from "react";

export default async function ProfileLayout(props: PropsWithChildren) {
  const [artists] = await Promise.all([getArtistsWithMembers()]);
  return (
    <CosmoArtistProvider artists={artists}>
      {props.children}
    </CosmoArtistProvider>
  );
}
