import { t, type Dictionary } from "intlayer";

const content = {
  key: "user_link",
  content: {
    preview: t({ en: "Preview", ko: "미리보기" }),
    nickname_not_available: t({
      en: "Nickname not available.",
      ko: "닉네임을 사용할 수 없습니다.",
    }),
    deleted: t({ en: "(deleted)", ko: "(삭제됨)" }),
  },
} satisfies Dictionary;

export default content;
