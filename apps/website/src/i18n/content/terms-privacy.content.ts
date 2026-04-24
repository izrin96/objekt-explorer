import { t, insert, type Dictionary } from "intlayer";

const content = {
  key: "terms_privacy",
  content: {
    title: t({ en: "Terms and Privacy", ko: "이용약관 및 개인정보처리방침" }),
    heading: t({ en: "Terms and Privacy", ko: "이용약관 및 개인정보처리방침" }),
    points: {
      login_info: t({
        en: "When you log in with Twitter (X) or Discord, we get your public profile info (like your name and username).",
        ko: "Twitter (X) 또는 Discord로 로그인하면 이름 및 사용자명과 같은 공개 프로필 정보를 수집합니다.",
      }),
      no_post: t({
        en: "We do not post anything or access your private data.",
        ko: "게시물을 올리거나 개인 데이터에 액세스하지 않습니다.",
      }),
      no_sell: t({
        en: "We do not sell or share your data.",
        ko: "데이터를 판매하거나 공유하지 않습니다.",
      }),
      only_app: t({
        en: "We only use your info to make the app work.",
        ko: "앱이 작동하도록 하기 위해서만 정보를 사용합니다.",
      }),
      delete_anytime: t({
        en: "You can ask us to delete your data anytime.",
        ko: "언제든지 데이터 삭제를 요청할 수 있습니다.",
      }),
      open_source_prefix: insert(
        t({
          en: "{{siteName}} is open source. Github link",
          ko: "{{siteName}}은(는) 오픈 소스입니다. Github 링크",
        }),
      ),
      available_here: t({ en: "available here", ko: "여기" }),
    },
  },
} satisfies Dictionary;

export default content;
