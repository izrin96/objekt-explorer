import { authed, moderator } from "../orpc";
import {
  actInputSchema,
  addressHistoryInputSchema,
  moveAddressInputSchema,
  reportInputSchema,
  revokeInputSchema,
  setRoleInputSchema,
  unlinkAddressInputSchema,
  userIdInputSchema,
} from "../schemas/moderation";
import { blockedAccounts, blockUser, unblockUser } from "../services/blocks";
import { applyModAction, revokeSanction, setUserRole } from "../services/mod-console";
import { addressHistory, moveAddress, unlinkAddress } from "../services/mod-links";
import { accountDossier, reportQueue } from "../services/mod-reads";
import { fileReport } from "../services/report";

export const moderationRouter = {
  block: authed
    .input(userIdInputSchema)
    .handler(async ({ input: { userId }, context }) => blockUser(context.session.user.id, userId)),

  unblock: authed
    .input(userIdInputSchema)
    .handler(async ({ input: { userId }, context }) =>
      unblockUser(context.session.user.id, userId),
    ),

  /** The accounts the user blocked, newest first, headed as a conversation heads them. */
  blocked: authed.handler(async ({ context }) => blockedAccounts(context.session.user.id)),

  report: authed
    .input(reportInputSchema)
    .handler(async ({ input, context }) => fileReport(context.session.user.id, input)),

  /** Open reports grouped by reported account, newest first. */
  queue: moderator.handler(async () => reportQueue()),

  /** Everything a moderator sees about one account. Message text appears only inside excerpts. */
  account: moderator
    .input(userIdInputSchema)
    .handler(async ({ input: { userId } }) => accountDossier(userId)),

  /** Applies the action, resolves the account's open reports and audits it, all at once. */
  act: moderator
    .input(actInputSchema)
    .handler(async ({ input, context }) =>
      applyModAction(context.session.user.id, context.isAdmin, input),
    ),

  revoke: moderator
    .input(revokeInputSchema)
    .handler(async ({ input, context }) =>
      revokeSanction(context.session.user.id, context.isAdmin, input),
    ),

  /** Admins only: grants or removes the moderator role; an admin's role is not changed here. */
  setRole: moderator
    .input(setRoleInputSchema)
    .handler(async ({ input, context }) =>
      setUserRole(context.session.user.id, context.isAdmin, input),
    ),

  /** An address's link history, or one account's: who held it, when, and how it changed hands. */
  addressHistory: moderator
    .input(addressHistoryInputSchema)
    .handler(async ({ input }) => addressHistory(input)),

  /** Admins only: moves a linked address to another account, for an owner who lost access. */
  moveAddress: moderator
    .input(moveAddressInputSchema)
    .handler(async ({ input, context }) =>
      moveAddress(context.session.user.id, context.isAdmin, input),
    ),

  /** Admins only: unlinks an address from its account, which starts the 7-day wait. */
  unlinkAddress: moderator
    .input(unlinkAddressInputSchema)
    .handler(async ({ input, context }) =>
      unlinkAddress(context.session.user.id, context.isAdmin, input),
    ),
};
