import { t, type Dictionary } from "intlayer";

const content = {
  key: "objekt_menu",
  content: {
    add_to_list: t({
      en: "Add to list",
      ko: "목록에 추가",
    }),
    remove_from_list: t({
      en: "Remove from list",
      ko: "목록에서 제거",
    }),
    set_price: t({
      en: "Set price",
      ko: "가격 설정",
    }),
    pin: t({
      en: "Pin",
      ko: "고정",
    }),
    unpin: t({
      en: "Unpin",
      ko: "고정 해제",
    }),
    lock: t({
      en: "Lock",
      ko: "잠금",
    }),
    unlock: t({
      en: "Unlock",
      ko: "잠금 해제",
    }),
    select: t({
      en: "Select",
      ko: "선택",
    }),
    unselect: t({
      en: "Unselect",
      ko: "선택 해제",
    }),
    move_up: t({
      en: "Move up",
      ko: "위로 이동",
    }),
    move_down: t({
      en: "Move down",
      ko: "아래로 이동",
    }),
    no_list_found: t({
      en: "No list found",
      ko: "목록을 찾을 수 없습니다",
    }),
  },
} satisfies Dictionary;

export default content;
