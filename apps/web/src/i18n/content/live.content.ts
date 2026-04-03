import { t, type Dictionary } from "intlayer";

const content = {
  key: "live",
  content: {
    title: t({ en: "Cosmo Live", ko: "Cosmo Live" }),
    alpha: t({ en: "Alpha", ko: "알파" }),
    description: t({ en: "Live by member from Cosmo app", ko: "Cosmo 앱의 멤버별 라이브" }),
    tabs_label: t({ en: "Recipe App", ko: "Recipe 앱" }),
    no_live: t({
      en: "No live available at this moment",
      ko: "현재 이용 가능한 라이브가 없습니다",
    }),
    live_badge: t({ en: "Live", ko: "라이브" }),
    live_stream_ended: t({ en: "Live stream ended", ko: "라이브 스트림 종료" }),
  },
} satisfies Dictionary;

export default content;
