import { t, type Dictionary } from "intlayer";

const content = {
  key: "stats",
  content: {
    loading_objekts: t({ en: "Loading objekts", ko: "오브젝트 로딩 중" }),
    breakdown_member: {
      title: t({ en: "Objekt Breakdown By Member", ko: "멤버별 오브젝트 분석" }),
      description: t({ en: "Total objekt by member", ko: "멤버별 총 오브젝트" }),
    },
    breakdown_season: {
      title: t({ en: "Objekt Breakdown By Season", ko: "시즌별 오브젝트 분석" }),
      description: t({ en: "Total objekt by season", ko: "시즌별 총 오브젝트" }),
    },
    member_progress: {
      title: t({ en: "Member Progress", ko: "멤버 진행률" }),
      description: t({ en: "Progress by member", ko: "멤버별 진행률" }),
      percentage_label: t({ en: "Percentage", ko: "퍼센트" }),
    },
  },
} satisfies Dictionary;

export default content;
