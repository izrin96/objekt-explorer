import { t, type Dictionary } from "intlayer";

const content = {
  key: "checkpoint",
  content: {
    title: t({ en: "Snapshot", ko: "스냅샷" }),
    description: t({ en: "View collections at given time", ko: "특정 시점의 컬렉션 보기" }),
    close: t({ en: "Close", ko: "닫기" }),
    apply: t({ en: "Apply", ko: "적용" }),
    reset: t({ en: "Reset", ko: "초기화" }),
  },
} satisfies Dictionary;

export default content;
