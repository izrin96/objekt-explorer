import { Container } from "@/components/ui";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { artists } from "@/lib/server/cosmo/artists";
import { PropsWithChildren } from "react";

export default async function Layout(props: PropsWithChildren) {
  return (
    <Container>
      <CosmoArtistProvider artists={artists}>
        {props.children}
      </CosmoArtistProvider>
    </Container>
  );
}
