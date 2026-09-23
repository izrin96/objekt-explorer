import { orpc } from "@/lib/orpc";

export const currentUserOptions = orpc.user.currentUser.queryOptions({
  staleTime: Infinity,
  refetchOnWindowFocus: false,
});
