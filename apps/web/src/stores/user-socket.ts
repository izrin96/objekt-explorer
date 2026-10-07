import { create } from "zustand";

/** Whether the per-user socket is open; views that only it refreshes poll while it is not. */
export const useUserSocketLive = create<{ live: boolean }>(() => ({ live: false }));
