import { t, type Dictionary } from "intlayer";

const content = {
  key: "error",
  content: {
    profile_loading: t({ en: "Error loading profile", ko: "프로필 로드 중 오류 발생" }),
    list_loading: t({ en: "Error loading list", ko: "리스트 로드 중 오류 발생" }),
  },
} satisfies Dictionary;

export default content;
