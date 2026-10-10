import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

export const ac = createAccessControl(defaultStatements);

const none = () => ac.newRole({ user: [], session: [] });

/**
 * Server only. No role holds a plugin permission, so nothing reaches `/api/auth/admin/*`:
 * every staff action goes through the audited moderation router.
 */
export const roles = { user: none(), moderator: none(), admin: none() };

export type Role = keyof typeof roles;
