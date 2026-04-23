import { t, insert, type Dictionary, html } from "intlayer";

const content = {
  key: "link",
  content: {
    my_cosmo: t({
      en: "My Cosmo",
      ko: "내 Cosmo",
    }),
    link_cosmo: t({
      en: "Link Cosmo",
      ko: "Cosmo 연결",
    }),
    continue: t({
      en: "Continue",
      ko: "계속하기",
    }),
    try_again: t({
      en: "Try again",
      ko: "다시 시도하기",
    }),
    submit: t({
      en: "Submit",
      ko: "제출",
    }),
    success: insert(
      t({
        en: "Success. Cosmo {{nickname}} linked.",
        ko: "성공. Cosmo {{nickname}}님이 연결되었습니다.",
      }),
    ),
    go_to_cosmo: t({
      en: "Go to your Cosmo",
      ko: "내 Cosmo로 이동",
    }),
    enter_nickname: t({
      en: "Cosmo ID",
      ko: "Cosmo ID",
    }),
    nickname_placeholder: t({
      en: "Your Cosmo ID",
      ko: "Cosmo ID를 입력하세요",
    }),
    nickname_required: t({
      en: "Cosmo ID is required.",
      ko: "Cosmo ID를 입력해주세요.",
    }),
    nickname_not_found: t({
      en: "Cosmo ID not found",
      ko: "Cosmo ID를 찾을 수 없습니다",
    }),
    search: t({
      en: "Search",
      ko: "검색",
    }),
    verify: t({
      en: "Verify",
      ko: "인증",
    }),
    start_over: t({
      en: "Start over",
      ko: "처음부터 다시",
    }),
    code_instructions: insert(
      t({
        en: "Add this code to your {{artist}} Cosmo profile bio, then click Verify below.",
        ko: "이 코드를 {{artist}} Cosmo 프로필 바이오에 추가한 후 아래의 인증 버튼을 눌러주세요.",
      }),
    ),
    code_expired: t({
      en: "Verification code has expired. Please start over.",
      ko: "인증 코드가 만료되었습니다. 처음부터 다시 시도해주세요.",
    }),
    verification_failed: t({
      en: "Verification code not found in bio. Please check and try again.",
      ko: "프로필 바이오에서 인증 코드를 찾을 수 없습니다. 확인 후 다시 시도해주세요.",
    }),
    process: {
      intro_title: t({
        en: "Link your Cosmo profile",
        ko: "Cosmo 프로필을 연결하세요",
      }),
      intro_description: t({
        en: "You need to download the Cosmo app and sign in with the Cosmo ID you want to link before continue.",
        ko: "계속 진행하기 전에 Cosmo 앱을 다운로드하고 연결하려는 Cosmo ID로 로그인해야 합니다.",
      }),
      nickname_step_prompt: t({
        en: "Search your Cosmo ID to get started.",
        ko: "시작하려면 Cosmo ID를 검색하세요.",
      }),
      artist_step_cosmo_id: t({
        en: "Cosmo ID:",
        ko: "Cosmo ID:",
      }),
      artist_step_select: t({
        en: "Select the artist profile to use for verification.",
        ko: "인증에 사용할 아티스트 프로필을 선택하세요.",
      }),
      verify_step_verifying: html(
        t({
          en: "Verifying <nickname /> on <artist /> Cosmo profile",
          ko: "<artist /> Cosmo 프로필에서 <nickname /> 인증 중",
        }),
      ),
      countdown_remaining: insert(
        t({
          en: "Remaining {{countdown}}",
          ko: "남은 시간 {{countdown}}",
        }),
      ),
    },
    card: {
      edit: t({
        en: "Edit",
        ko: "편집",
      }),
      unlink: t({
        en: "Unlink",
        ko: "연결 해제",
      }),
    },
    unlink: {
      title: t({
        en: "Unlink Cosmo",
        ko: "Cosmo 연결 해제",
      }),
      description: t({
        en: "This will unlink your Cosmo from this account. You can link it again later. Continue?",
        ko: "이 계정에서 Cosmo 연결이 해제됩니다. 나중에 다시 연결할 수 있습니다. 계속하시겠습니까?",
      }),
      submit: t({
        en: "Continue",
        ko: "계속",
      }),
      success: t({
        en: "Cosmo unlinked",
        ko: "Cosmo 연결이 해제되었습니다",
      }),
      error: t({
        en: "Error unlink cosmo",
        ko: "Cosmo 연결 해제 오류",
      }),
    },
  },
} satisfies Dictionary;

export default content;
