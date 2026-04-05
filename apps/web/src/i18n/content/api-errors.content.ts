import { insert, t, type Dictionary } from "intlayer";

const content = {
  key: "api_errors",
  content: {
    cosmo_link: {
      already_linked_self: t({
        en: "This Cosmo ID is already linked to your account.",
        ko: "이 Cosmo ID는 이미 귀하의 계정에 연결되어 있습니다.",
      }),
      already_linked_other: t({
        en: "This Cosmo ID is already linked to another account.",
        ko: "이 Cosmo ID는 이미 다른 계정에 연결되어 있습니다.",
      }),
      rate_limit: t({
        en: "Too many attempts. Please wait before trying again.",
        ko: "시도 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.",
      }),
      verification_expired: t({
        en: "Verification expired. Please start over.",
        ko: "인증이 만료되었습니다. 처음부터 다시 시작해주세요.",
      }),
      profile_mismatch: t({
        en: "Profile data mismatch. Please start over.",
        ko: "프로필 데이터가 일치하지 않습니다. 처음부터 다시 시작해주세요.",
      }),
      code_not_found: t({
        en: "Verification code not found in bio. Please check and try again.",
        ko: "프로필 바이오에서 인증 코드를 찾을 수 없습니다. 확인 후 다시 시도해주세요.",
      }),
    },
    profile: {
      not_linked: t({
        en: "This Cosmo not linked with your account",
        ko: "이 Cosmo는 귀하의 계정에 연결되어 있지 않습니다",
      }),
      not_found: t({
        en: "Profile not found or not link with this account",
        ko: "프로필을 찾을 수 없거나 이 계정에 연결되어 있지 않습니다",
      }),
    },
    user: {
      not_linked_provider: t({
        en: "User not link with provider",
        ko: "사용자가 제공업체에 연결되어 있지 않습니다",
      }),
      failed_get_info: insert(
        t({
          en: "Failed to get info. Please sign in with {{provider}} and try again.",
          ko: "정보를 가져오는 데 실패했습니다. {{provider}}(으)로 로그인한 후 다시 시도해주세요.",
        }),
      ),
    },
    compare: {
      source_list_not_found: t({
        en: "Source list not found",
        ko: "원본 목록을 찾을 수 없습니다",
      }),
      target_profile_not_found: t({
        en: "Target profile not found",
        ko: "대상 프로필을 찾을 수 없습니다",
      }),
      target_list_not_found: t({
        en: "Target list not found",
        ko: "대상 목록을 찾을 수 없습니다",
      }),
    },
  },
} satisfies Dictionary;

export default content;
