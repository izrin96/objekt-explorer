import { t, type Dictionary } from "intlayer";

const content = {
  key: "discord_format_modal",
  content: {
    title: t({ en: "Generate Discord Format", ko: "Discord 형식 생성" }),
    description: t({
      en: "List of objekt is based on current filter.",
      ko: "오브젝트 목록은 현재 필터를 기반으로 합니다.",
    }),
    button: t({ en: "Discord format", ko: "Discord 형식" }),
    generate: t({ en: "Generate", ko: "생성" }),
  },
} satisfies Dictionary;

export default content;
