import { dehydrate, HydrationBoundary, type QueryClient } from "@tanstack/react-query";

import { createQueryClient } from "./client";

export const getQueryClient = createQueryClient;

export function HydrateClient(props: { children: React.ReactNode; client: QueryClient }) {
  return <HydrationBoundary state={dehydrate(props.client)}>{props.children}</HydrationBoundary>;
}
