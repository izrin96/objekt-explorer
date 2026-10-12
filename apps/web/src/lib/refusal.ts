import type { Refusal } from "@repo/api/lib/refuse";
import { COMPARE_REFUSALS } from "@repo/api/schemas/compare";
import { COSMO_LINK_REFUSALS } from "@repo/api/schemas/cosmo-link";
import { LIST_REFUSALS } from "@repo/api/schemas/list";
import { OBJEKT_REFUSALS } from "@repo/api/schemas/objekts";
import { PROFILE_REFUSALS } from "@repo/api/schemas/profile";
import { TRADE_MODE_REFUSALS } from "@repo/api/schemas/trade";
import { USER_REFUSALS } from "@repo/api/schemas/user";

import { errorReason } from "@/lib/orpc-error";
import { m } from "@/paraglide/messages";

const REFUSALS: readonly string[] = [
  ...LIST_REFUSALS,
  ...TRADE_MODE_REFUSALS,
  ...COMPARE_REFUSALS,
  ...COSMO_LINK_REFUSALS,
  ...PROFILE_REFUSALS,
  ...USER_REFUSALS,
  ...OBJEKT_REFUSALS,
];

const isRefusal = (code: string | null): code is Refusal =>
  code !== null && REFUSALS.includes(code);

/** The user's-locale text for a refused oRPC call; never the server's `message`. */
export function refusalText(error: unknown) {
  const { reason } = errorReason(error);
  if (!isRefusal(reason)) return m.api_errors_unknown();
  switch (reason) {
    case "list_linked_not_found":
      return m.api_errors_list_linked_not_found();
    case "list_have_links_want":
      return m.api_errors_list_have_links_want();
    case "list_want_links_have":
      return m.api_errors_list_want_links_have();
    case "list_collections_required":
      return m.api_errors_list_collections_required();
    case "list_currency_required":
      return m.api_errors_list_currency_required();
    case "list_profile_required":
      return m.api_errors_list_profile_required();
    case "list_prices_sale_only":
      return m.api_errors_list_prices_sale_only();
    case "trade_mode_list_type":
      return m.api_errors_trade_mode_list_type();
    case "trade_mode_both_needs_pair":
      return m.api_errors_trade_mode_both_needs_pair();
    case "trade_mode_have_to_want":
      return m.api_errors_trade_mode_have_to_want();
    case "trade_mode_want_to_have":
      return m.api_errors_trade_mode_want_to_have();
    case "compare_source_list_not_found":
      return m.api_errors_compare_source_list_not_found();
    case "compare_target_profile_not_found":
      return m.api_errors_compare_target_profile_not_found();
    case "compare_target_list_not_found":
      return m.api_errors_compare_target_list_not_found();
    case "cosmo_link_already_linked_self":
      return m.api_errors_cosmo_link_already_linked_self();
    case "cosmo_link_already_linked_other":
      return m.api_errors_cosmo_link_already_linked_other();
    case "cosmo_link_rate_limit":
      return m.api_errors_cosmo_link_rate_limit();
    case "cosmo_link_verification_expired":
      return m.api_errors_cosmo_link_verification_expired();
    case "cosmo_link_profile_mismatch":
      return m.api_errors_cosmo_link_profile_mismatch();
    case "cosmo_link_code_not_found":
      return m.api_errors_cosmo_link_code_not_found();
    case "profile_not_linked":
      return m.api_errors_profile_not_linked();
    case "profile_not_found":
      return m.api_errors_profile_not_found();
    case "user_query_too_long":
      return m.api_errors_user_query_too_long();
    case "user_search_rate_limit":
      return m.api_errors_user_search_rate_limit();
    case "user_not_linked_provider":
      return m.api_errors_user_not_linked_provider();
    case "user_failed_get_info":
      return m.api_errors_user_failed_get_info({ provider: providerOf(error) });
    case "objekt_checkpoint_unavailable":
      return m.api_errors_objekt_checkpoint_unavailable();
  }
}

function providerOf(error: unknown) {
  const data = (error as { data?: { provider?: unknown } }).data;
  return typeof data?.provider === "string" ? data.provider : "";
}
