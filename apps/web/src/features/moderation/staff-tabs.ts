import { roleList, type STAFF_ROLES } from "@repo/api/schemas/moderation";

import { m } from "@/paraglide/messages";

type StaffRole = (typeof STAFF_ROLES)[number];

/**
 * The staff area's tabs, in strip order. A tab is added here and by its route, which checks
 * `canOpenTab` in `beforeLoad` before its loader runs.
 */
const STAFF_TABS = [
  {
    id: "reports",
    to: "/mod/reports",
    label: m.staff_tab_reports,
    roles: ["moderator", "admin"],
  },
  {
    id: "addresses",
    to: "/mod/addresses",
    label: m.staff_tab_addresses,
    roles: ["moderator", "admin"],
  },
  {
    id: "banners",
    to: "/mod/banners",
    label: m.staff_tab_banners,
    roles: ["moderator", "admin"],
  },
  {
    id: "collections",
    to: "/mod/collections",
    label: m.staff_tab_collections,
    roles: ["admin"],
  },
  {
    id: "trades",
    to: "/mod/trades",
    label: m.staff_tab_trades,
    roles: ["moderator", "admin"],
  },
  {
    id: "messages",
    to: "/mod/messages",
    label: m.staff_tab_messages,
    roles: ["moderator", "admin"],
  },
] as const satisfies readonly {
  id: string;
  to: string;
  label: () => string;
  roles: readonly StaffRole[];
}[];

export type StaffTab = (typeof STAFF_TABS)[number];
export type StaffTabId = StaffTab["id"];

const opens = (tab: StaffTab, role: string | null | undefined) => {
  const roles = roleList(role);
  return tab.roles.some((allowed) => roles.includes(allowed));
};

/** The tabs a session's `user.role` may open, in strip order. */
export function visibleTabs(role: string | null | undefined): StaffTab[] {
  return STAFF_TABS.filter((tab) => opens(tab, role));
}

export function canOpenTab(id: StaffTabId, role: string | null | undefined) {
  return STAFF_TABS.some((tab) => tab.id === id && opens(tab, role));
}
