import { t, type Dictionary } from "intlayer";

const content = {
  key: "not_found",
  content: {
    list: t({ en: "List not found", ko: "목록을 찾을 수 없습니다" }),
    live: t({ en: "Live not found", ko: "라이브를 찾을 수 없습니다" }),
    page: t({ en: "Page not found", ko: "페이지를 찾을 수 없습니다" }),
  },
} satisfies Dictionary;

export default content;
