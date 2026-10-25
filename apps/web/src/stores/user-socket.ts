import { create } from "zustand";

/** Whether the per-user socket is open; views that only it refreshes poll while it is not. */
export const useUserSocketLive = create<{ live: boolean }>(() => ({ live: false }));

/** The refetch interval for such a view: none while the socket delivers its updates. */
export const pollUnlessLive = (live: boolean) => (live ? false : 60_000);
