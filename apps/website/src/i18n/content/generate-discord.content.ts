import { t, type Dictionary } from "intlayer";

const content = {
  key: "generate_discord",
  content: {
    title: t({
      en: "Generate Discord Format",
      ko: "Discord 형식 생성",
    }),
    error: t({
      en: "Error generating Discord format",
      ko: "Discord 형식 생성 오류",
    }),
    select_at_least_one: t({
      en: "Please select at least one list",
      ko: "최소 하나의 목록을 선택하세요",
    }),
    list_placeholder: t({
      en: "Select a list (optional)",
      ko: "목록 선택 (선택사항)",
    }),
    have_list_label: t({
      en: "Have list",
      ko: "보유 목록",
    }),
    want_list_label: t({
      en: "Want list",
      ko: "원하는 목록",
    }),
    show_count: t({
      en: "Show count",
      ko: "개수 표시",
    }),
    include_link: t({
      en: "Include link",
      ko: "링크 포함",
    }),
    lower_case: t({
      en: "Lower case",
      ko: "소문자",
    }),
    show_member_emoji: t({
      en: "Member emoji",
      ko: "멤버 이모지",
    }),
    bulleted_list: t({
      en: "Bulleted list",
      ko: "글머리 기호 목록",
    }),
    group_by_label: t({
      en: "Group by",
      ko: "그룹 기준",
    }),
    group_by_placeholder: t({
      en: "Select grouping mode",
      ko: "그룹 모드 선택",
    }),
    group_by_none: t({
      en: "None (member → collection)",
      ko: "없음 (멤버 → 컬렉션)",
    }),
    group_by_season: t({
      en: "Season (member → season → collection)",
      ko: "시즌 (멤버 → 시즌 → 컬렉션)",
    }),
    group_by_season_first: t({
      en: "Season first (season → member → collection)",
      ko: "시즌 우선 (시즌 → 멤버 → 컬렉션)",
    }),
    style_label: t({
      en: "Style",
      ko: "스타일",
    }),
    style_placeholder: t({
      en: "Select style",
      ko: "스타일 선택",
    }),
    style_default: t({
      en: "Default",
      ko: "기본",
    }),
    style_compact: t({
      en: "Compact",
      ko: "간결",
    }),
    formatted_text_label: t({
      en: "Formatted discord text",
      ko: "형식화된 Discord 텍스트",
    }),
    reset_button: t({
      en: "Reset",
      ko: "초기화",
    }),
    generate_button: t({
      en: "Generate",
      ko: "생성",
    }),
  },
} satisfies Dictionary;

export default content;
