import { t, type Dictionary } from "intlayer";

const content = {
  key: "progress",
  content: {
    select_prompt: t({
      en: "Select at least 1 artist or 1 member",
      ko: "최소 1명의 아티스트 또는 1명의 멤버를 선택하세요",
    }),
    loading_objekts: t({ en: "Loading objekts", ko: "오브젝트 로딩 중" }),
    progress_bar_label: t({ en: "Progress Bar", ko: "진행률 바" }),
  },
} satisfies Dictionary;

export default content;
