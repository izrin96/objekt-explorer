import { Container } from "@/components/ui";
import { getQueryClient } from "@/lib/query-client";
import { collectionOptions } from "@/lib/query-options";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { PropsWithChildren } from "react";

export default async function ProfileLayout(props: PropsWithChildren) {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(collectionOptions);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Container>{props.children}</Container>
    </HydrationBoundary>
  );
}
