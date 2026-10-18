import { describe, expect, test } from "bun:test";

import { roleList, staffTargetRefused } from "./moderation";

const ROLES = [null, "user", "moderator", "admin", "moderator,admin"] as const;
const isAdmin = (role: string | null) => roleList(role).includes("admin");

describe("staffTargetRefused", () => {
  test("every viewer role against every target role", () => {
    for (const viewer of ROLES) {
      for (const target of ROLES) {
        const staff = target !== null && target !== "user";
        const adminTarget = isAdmin(target);
        // a moderator or user viewer never acts on staff; the console only opens for staff
        const expectDismiss = staff && !isAdmin(viewer);
        expect(staffTargetRefused(target, isAdmin(viewer), "dismiss")).toBe(expectDismiss);
        expect(staffTargetRefused(target, isAdmin(viewer), "revoke")).toBe(expectDismiss);
        expect(staffTargetRefused(target, isAdmin(viewer), "sanction")).toBe(
          expectDismiss || (staff && adminTarget),
        );
      }
    }
  });

  test("an admin dismisses and revokes on an admin, but never sanctions one", () => {
    expect(staffTargetRefused("admin", true, "dismiss")).toBe(false);
    expect(staffTargetRefused("admin", true, "revoke")).toBe(false);
    expect(staffTargetRefused("admin", true, "sanction")).toBe(true);
    expect(staffTargetRefused("moderator", true, "sanction")).toBe(false);
  });
});
