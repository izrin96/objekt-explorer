import { t, insert, type Dictionary } from "intlayer";

const content = {
  key: "column_override",
  content: {
    title: t({ en: "Column setting overridden", ko: "열 설정 재정의됨" }),
    description: insert(
      t({
        en: "Using {{count}} columns set by owner",
        ko: "소유자가 설정한 {{count}}열을 사용 중입니다",
      }),
    ),
    revert: t({ en: "Revert", ko: "되돌리기" }),
    dismiss: t({ en: "Dismiss", ko: "닫기" }),
  },
} satisfies Dictionary;

export default content;
