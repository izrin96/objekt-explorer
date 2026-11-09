import { errorReason } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

/**
 * A staff action's refusal as text. Each action is refused only for its own reasons, so one map
 * serves every dialog; a move names a deleted target its own way.
 */
export function modErrorText(error: unknown, deletedTarget: () => string = m.mod_deleted_target) {
  switch (errorReason(error).reason) {
    case "staff_target":
      return m.mod_staff_target();
    case "self":
      return m.mod_error_self();
    case "deleted_target":
      return deletedTarget();
    case "address_sanctioned":
      return m.mod_address_sanctioned();
    case "address_in_trade":
      return m.mod_address_in_trade();
    case "address_changed":
      return m.mod_address_changed();
    case "same_account":
      return m.mod_same_account();
    default:
      return m.mod_act_error();
  }
}
