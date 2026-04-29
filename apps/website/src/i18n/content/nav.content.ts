import { t, type Dictionary } from "intlayer";

const content = {
  key: "nav",
  content: {
    activity: t({
      en: "Activity",
      ko: "활동",
    }),
    home: t({
      en: "Home",
      ko: "홈",
    }),
    navigation: t({
      en: "Navigation",
      ko: "내비게이션",
    }),
    toggle_menu: t({
      en: "Toggle Menu",
      ko: "메뉴 토글",
    }),
    my_list: t({
      en: "My List",
      ko: "내 목록",
    }),
    my_cosmo_link: t({
      en: "My Cosmo Link",
      ko: "내 Cosmo 링크",
    }),
    no_cosmo_found: t({
      en: "No Cosmo found",
      ko: "Cosmo를 찾을 수 없습니다",
    }),
    manage_cosmo_link: t({
      en: "Manage link",
      ko: "Cosmo 링크 관리",
    }),
    account: t({
      en: "Account",
      ko: "계정",
    }),
    sign_out: t({
      en: "Sign out",
      ko: "로그아웃",
    }),
    sign_in: t({
      en: "Sign in",
      ko: "로그인",
    }),
    sign_out_success: t({
      en: "Sign out successful",
      ko: "로그아웃되었습니다",
    }),
    open_menu: t({
      en: "Open Menu",
      ko: "메뉴 열기",
    }),
    no_list_found: t({
      en: "No list found",
      ko: "목록을 찾을 수 없습니다",
    }),
    create_list: t({
      en: "Create list",
      ko: "목록 만들기",
    }),
    discord_format: t({
      en: "Discord format",
      ko: "Discord 형식",
    }),
    manage_list: t({
      en: "Manage list",
      ko: "목록 관리",
    }),
    search_user: {
      label: t({
        en: "Search user",
        ko: "사용자 검색",
      }),
      placeholder: t({
        en: "Search user",
        ko: "사용자를 검색하세요",
      }),
      result_label: t({
        en: "Results",
        ko: "검색 결과",
      }),
      recent_label: t({
        en: "Recents",
        ko: "최근 검색",
      }),
      clear_history: t({
        en: "Clear history",
        ko: "검색 기록 삭제",
      }),
    },
    about: t({
      en: "About",
      ko: "소개",
    }),
  },
} satisfies Dictionary;

export default content;
