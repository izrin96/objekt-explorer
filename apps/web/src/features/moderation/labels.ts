import type { FlagCategory } from "@repo/api/schemas/chat";
import {
  AUDIT_ACTIONS,
  type AuditAction,
  type ModAction,
  type ReportReason,
  type SanctionType,
  type STAFF_ROLES,
} from "@repo/api/schemas/moderation";

import { m } from "@/paraglide/messages";

export const REASON_LABEL: Record<ReportReason, () => string> = {
  scam: m.mod_reason_scam,
  harassment: m.mod_reason_harassment,
  spam: m.mod_reason_spam,
  impersonation: m.mod_reason_impersonation,
  other: m.mod_reason_other,
};

export const FLAG_LABEL: Record<FlagCategory, () => string> = {
  send_first: m.mod_flag_send_first,
  outside_payment: m.mod_flag_outside_payment,
};

export const ACTION_LABEL: Record<ModAction, () => string> = {
  dismiss: m.mod_action_dismiss,
  warn: m.mod_action_warn,
  chat_mute: m.mod_action_chat_mute,
  trade_block: m.mod_action_trade_block,
  ban: m.mod_action_ban,
};

export const SANCTION_LABEL: Record<SanctionType, () => string> = {
  warn: m.mod_action_warn,
  chat_mute: m.mod_action_chat_mute,
  trade_block: m.mod_action_trade_block,
  ban: m.mod_action_ban,
};

type Role = "user" | (typeof STAFF_ROLES)[number];

const ROLE_LABEL: Record<Role, () => string> = {
  user: m.mod_role_user,
  moderator: m.mod_role_moderator,
  admin: m.mod_role_admin,
};

export function roleLabel(role: string) {
  const known = (Object.keys(ROLE_LABEL) as Role[]).find((key) => key === role);
  return known ? ROLE_LABEL[known]() : role;
}

const AUDIT_LABEL: Record<AuditAction, () => string> = {
  ...ACTION_LABEL,
  revoke: m.mod_audit_revoke,
  set_role: m.mod_audit_set_role,
};

/** An action a newer server records shows as stored. */
export function auditActionLabel(action: string) {
  const known = AUDIT_ACTIONS.find((key) => key === action);
  return known ? AUDIT_LABEL[known]() : action;
}
