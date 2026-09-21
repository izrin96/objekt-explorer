import type { ApiMessages } from "@repo/api/orpc";

import { m } from "@/paraglide/messages";

export const apiMessages: ApiMessages = {
  compare_source_list_not_found: m.api_errors_compare_source_list_not_found,
  compare_target_profile_not_found: m.api_errors_compare_target_profile_not_found,
  compare_target_list_not_found: m.api_errors_compare_target_list_not_found,
  cosmo_link_already_linked_self: m.api_errors_cosmo_link_already_linked_self,
  cosmo_link_already_linked_other: m.api_errors_cosmo_link_already_linked_other,
  cosmo_link_rate_limit: m.api_errors_cosmo_link_rate_limit,
  cosmo_link_verification_expired: m.api_errors_cosmo_link_verification_expired,
  cosmo_link_profile_mismatch: m.api_errors_cosmo_link_profile_mismatch,
  cosmo_link_code_not_found: m.api_errors_cosmo_link_code_not_found,
  profile_not_linked: m.api_errors_profile_not_linked,
  profile_not_found: m.api_errors_profile_not_found,
  user_not_linked_provider: m.api_errors_user_not_linked_provider,
  user_failed_get_info: m.api_errors_user_failed_get_info,
};
