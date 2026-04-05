import { t, insert, type Dictionary } from "intlayer";

const content = {
  key: "filter",
  content: {
    artist: t({
      en: "Artist",
      ko: "아티스트",
    }),
    member: t({
      en: "Member",
      ko: "멤버",
    }),
    season: t({
      en: "Season",
      ko: "시즌",
    }),
    class: t({
      en: "Class",
      ko: "클래스",
    }),
    edition: t({
      en: "Edition",
      ko: "에디션",
    }),
    physical: t({
      en: "Physical",
      ko: "피지컬",
    }),
    digital: t({
      en: "Digital",
      ko: "디지털",
    }),
    color: t({
      en: "Color",
      ko: "색상",
    }),
    color_sensitivity: t({
      en: "Color sensitivity",
      ko: "색상 민감도",
    }),
    clear_color: t({
      en: "Clear color",
      ko: "투명 색상",
    }),
    sort_by: {
      label: t({
        en: "Sort by",
        ko: "정렬 기준",
      }),
      date: {
        label: t({
          en: "Date",
          ko: "날짜",
        }),
        desc: t({
          en: "Sort by date",
          ko: "날짜순으로 정렬",
        }),
      },
      season: {
        label: t({
          en: "Season",
          ko: "시즌",
        }),
        desc: t({
          en: "Sort by Season and Collection No.",
          ko: "시즌 및 컬렉션 번호순으로 정렬",
        }),
      },
      collection_no: {
        label: t({
          en: "Collection No.",
          ko: "컬렉션 번호",
        }),
        desc: t({
          en: "Sort by Collection No.",
          ko: "컬렉션 번호순으로 정렬",
        }),
      },
      serial: {
        label: t({
          en: "Serial",
          ko: "시리얼",
        }),
        desc: t({
          en: "Sort by Serial",
          ko: "시리얼 번호순으로 정렬",
        }),
      },
      dups: {
        label: t({
          en: "Duplicate",
          ko: "중복",
        }),
        desc: t({
          en: "Sort by duplicate count",
          ko: "중복 수순으로 정렬",
        }),
      },
      member: {
        label: t({
          en: "Member Order",
          ko: "멤버 순서",
        }),
        desc: t({
          en: "Sort by Member order",
          ko: "멤버 순서대로 정렬",
        }),
      },
    },
    desc: t({
      en: "Descending",
      ko: "내림차순",
    }),
    asc: t({
      en: "Ascending",
      ko: "오름차순",
    }),
    group_by: {
      label: t({
        en: "Group by",
        ko: "그룹 기준",
      }),
      artist: t({
        en: "Artist",
        ko: "아티스트",
      }),
      member: t({
        en: "Member",
        ko: "멤버",
      }),
      season: t({
        en: "Season",
        ko: "시즌",
      }),
      class: t({
        en: "Class",
        ko: "클래스",
      }),
      collection_no: t({
        en: "Collection No.",
        ko: "컬렉션 번호",
      }),
      season_collection_no: t({
        en: "Season & Collection No.",
        ko: "시즌 및 컬렉션 번호",
      }),
    },
    collection_no: t({
      en: "Collection No.",
      ko: "컬렉션 번호",
    }),
    column: t({
      en: "Columns",
      ko: "열",
    }),
    combine_dups: t({
      en: "Combine duplicate",
      ko: "중복 항목 병합",
    }),
    select_mode: t({
      en: "Select mode",
      ko: "선택 모드",
    }),
    clear: t({
      en: "Clear",
      ko: "초기화",
    }),
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
    set_price_no_currency: t({
      en: "No currency is set for this list",
      ko: "이 목록에 설정된 통화가 없습니다",
    }),
    reset_filter: t({
      en: "Reset filter",
      ko: "필터 초기화",
    }),
    quick_search: t({
      en: "Quick search",
      ko: "빠른 검색",
    }),
    disable_pin: t({
      en: "Disable pin",
      ko: "고정 해제",
    }),
    only_locked: t({
      en: "Only locked",
      ko: "잠긴 항목만",
    }),
    only_unlocked: t({
      en: "Only unlocked",
      ko: "잠기지 않은 항목만",
    }),
    lock_unlocked: t({
      en: "Lock/unlocked",
      ko: "잠김/해제",
    }),
    transferable: t({
      en: "Transferable",
      ko: "전송 가능",
    }),
    show_missing: t({
      en: "Show missing",
      ko: "미보유 항목 표시",
    }),
    filters: t({
      en: "Filters",
      ko: "필터",
    }),
    event: {
      label: t({
        en: "Event",
        ko: "이벤트",
      }),
      all: t({
        en: "All",
        ko: "전체",
      }),
      mint: t({
        en: "Mint",
        ko: "민팅",
      }),
      transfer: t({
        en: "Transfer",
        ko: "전송",
      }),
      spin: t({
        en: "Spin",
        ko: "스핀",
      }),
    },
    select_all: t({
      en: "Select all",
      ko: "모두 선택",
    }),
    clear_select: t({
      en: "Clear select",
      ko: "선택 해제",
    }),
    selected_count: insert(
      t({
        en: "{{count}} selected",
        ko: "{{count}}개 선택됨",
      }),
    ),
    show_count: t({
      en: "Show Count",
      ko: "개수 표시",
    }),
    search_help: {
      intro: t({
        en: "This quick search supports:",
        ko: "이 빠른 검색에서는 다음을 지원합니다:",
      }),
      or_operation: t({
        en: "Separate terms with a comma for an OR search",
        ko: "항목을 쉼표(,)로 구분하여 OR 검색",
      }),
      and_operation: t({
        en: "Separate terms with a space for an AND search",
        ko: "항목을 공백으로 구분하여 AND 검색",
      }),
      not_operation: t({
        en: "Exclude search results by prefixing a term with an exclamation mark (example: !seoyeon, !d201-202)",
        ko: "느낌표(!)를 앞에 붙여 제외 검색 (예: !seoyeon, !d201-202)",
      }),
      artist_names: t({
        en: "Artist names (example: triples)",
        ko: "아티스트 이름 (예: triples)",
      }),
      member_short_names: t({
        en: "Member short names (example: naky, yy)",
        ko: "멤버 약칭 (예: naky, yy)",
      }),
      class: t({
        en: "Class (example: special, sco)",
        ko: "클래스 (예: special, sco)",
      }),
      season: t({
        en: "Season (example: atom)",
        ko: "시즌 (예: atom)",
      }),
      collection_numbers: t({
        en: "Collection numbers (example: d207)",
        ko: "컬렉션 번호 (예: d207)",
      }),
      collection_ranges: t({
        en: "Collection number ranges (example: 301z-302z)",
        ko: "컬렉션 번호 범위 (예: 301z-302z)",
      }),
      serial_numbers: t({
        en: "Serial numbers (example: #1)",
        ko: "시리얼 번호 (예: #1)",
      }),
      serial_ranges: t({
        en: "Serial number ranges (example: #1-20)",
        ko: "시리얼 번호 범위 (예: #1-20)",
      }),
      example: t({
        en: "Example: yy c201-204 !c202 #1-200, jw 201z, yb sco divine",
        ko: "예시: yy c201-204 !c202 #1-200, jw 201z, yb sco divine",
      }),
    },
  },
} satisfies Dictionary;

export default content;
