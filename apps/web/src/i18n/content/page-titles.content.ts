import { t, insert, type Dictionary } from "intlayer";

const content = {
  key: "page_titles",
  content: {
    activity: t({ en: "Activity", ko: "활동" }),
    live: t({ en: "Live", ko: "라이브" }),
    live_detail: insert(
      t({ en: "{{title}} · {{channel}} · Live", ko: "{{title}} · {{channel}} · 라이브" }),
    ),
    login: t({ en: "Sign In", ko: "로그인" }),
    my_list: t({ en: "My List", ko: "내 리스트" }),
    my_cosmo_link: t({ en: "My Cosmo Link", ko: "내 Cosmo 링크" }),
    profile_collection: insert(t({ en: "{{nickname}} · Collection", ko: "{{nickname}} · 컬렉션" })),
    profile_progress: insert(t({ en: "{{nickname}} · Progress", ko: "{{nickname}} · 진행상황" })),
    profile_stats: insert(t({ en: "{{nickname}} · Stats", ko: "{{nickname}} · 통계" })),
    profile_trades: insert(
      t({ en: "{{nickname}} · Activity History", ko: "{{nickname}} · 활동 내역" }),
    ),
    list_detail: insert(t({ en: "{{name}} · List", ko: "{{name}} · 리스트" })),
    compare_tool: insert(
      t({ en: "{{source}} vs {{target}} · Compare", ko: "{{source}} vs {{target}} · 비교" }),
    ),
  },
} satisfies Dictionary;

export default content;
