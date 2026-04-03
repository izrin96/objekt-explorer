import { t, insert, type Dictionary } from "intlayer";

const content = {
  key: "actions",
  content: {
    pin: {
      success_single: t({
        en: "Objekt pinned",
        ko: "오브젝트가 고정되었습니다",
      }),
      success_multiple: insert(
        t({
          en: "{{count}} objekts pinned",
          ko: "{{count}}개의 오브젝트가 고정되었습니다",
        }),
      ),
      error_single: t({
        en: "Error pin objekt",
        ko: "오브젝트 고정 오류",
      }),
      error_multiple: insert(
        t({
          en: "Error pin {{count}} objekts",
          ko: "{{count}}개의 오브젝트 고정 오류",
        }),
      ),
    },
    unpin: {
      success_single: t({
        en: "Objekt unpinned",
        ko: "오브젝트 고정이 해제되었습니다",
      }),
      success_multiple: insert(
        t({
          en: "{{count}} objekts unpinned",
          ko: "{{count}}개의 오브젝트 고정이 해제되었습니다",
        }),
      ),
      error_single: t({
        en: "Error unpin objekt",
        ko: "오브젝트 고정 해제 오류",
      }),
      error_multiple: insert(
        t({
          en: "Error unpin {{count}} objekts",
          ko: "{{count}}개의 오브젝트 고정 해제 오류",
        }),
      ),
    },
    lock: {
      success_single: t({
        en: "Objekt locked",
        ko: "오브젝트가 잠겼습니다",
      }),
      success_multiple: insert(
        t({
          en: "{{count}} objekts locked",
          ko: "{{count}}개의 오브젝트가 잠겼습니다",
        }),
      ),
      error_single: t({
        en: "Error lock objekt",
        ko: "오브젝트 잠금 오류",
      }),
      error_multiple: insert(
        t({
          en: "Error lock {{count}} objekts",
          ko: "{{count}}개의 오브젝트 잠금 오류",
        }),
      ),
    },
    unlock: {
      success_single: t({
        en: "Objekt unlocked",
        ko: "오브젝트 잠금이 해제되었습니다",
      }),
      success_multiple: insert(
        t({
          en: "{{count}} objekts unlocked",
          ko: "{{count}}개의 오브젝트 잠금이 해제되었습니다",
        }),
      ),
      error_single: t({
        en: "Error unlock objekt",
        ko: "오브젝트 잠금 해제 오류",
      }),
      error_multiple: insert(
        t({
          en: "Error unlock {{count}} objekts",
          ko: "{{count}}개의 오브젝트 잠금 해제 오류",
        }),
      ),
    },
    add_to_list: {
      success_single: t({
        en: "Objekt added to list",
        ko: "오브젝트가 목록에 추가되었습니다",
      }),
      success_multiple: insert(
        t({
          en: "{{count}} objekts added to list",
          ko: "{{count}}개의 오브젝트가 목록에 추가되었습니다",
        }),
      ),
      error: t({
        en: "Error add objekts to list",
        ko: "오브젝트 목록 추가 오류",
      }),
    },
    remove_from_list: {
      success_single: t({
        en: "Objekt removed from list",
        ko: "오브젝트가 목록에서 제거되었습니다",
      }),
      success_multiple: insert(
        t({
          en: "{{count}} objekts removed from list",
          ko: "{{count}}개의 오브젝트가 목록에서 제거되었습니다",
        }),
      ),
      error: t({
        en: "Error remove objekts from list",
        ko: "오브젝트 목록 제거 오류",
      }),
    },
  },
} satisfies Dictionary;

export default content;
