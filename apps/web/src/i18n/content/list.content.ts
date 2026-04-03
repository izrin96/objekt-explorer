import { t, insert, type Dictionary, html } from "intlayer";

const content = {
  key: "list",
  content: {
    title: t({
      en: "My List",
      ko: "내 목록",
    }),
    tabs: {
      normal: t({
        en: "Normal List",
        ko: "일반 목록",
      }),
      profile: t({
        en: "Profile List",
        ko: "프로필 목록",
      }),
    },
    create_button: t({
      en: "Create list",
      ko: "목록 만들기",
    }),
    generate_discord_button: t({
      en: "Generate Discord format",
      ko: "Discord 형식 생성",
    }),
    feature_not_available: t({
      en: "This feature is not yet available",
      ko: "이 기능은 아직 사용할 수 없습니다",
    }),
    no_list_found: t({
      en: "No list found",
      ko: "목록을 찾을 수 없습니다",
    }),
    no_lists_found: t({
      en: "No lists found for this profile",
      ko: "이 프로필에서 목록을 찾을 수 없습니다",
    }),
    no_lists_hint: t({
      en: "Create a profile list or set a normal list to display in this profile",
      ko: "프로필 목록을 만들거나 일반 목록을 이 프로필에 표시하도록 설정하세요",
    }),
    badge_profile: t({
      en: "Profile",
      ko: "프로필",
    }),
    create: {
      title: t({
        en: "Create list",
        ko: "목록 만들기",
      }),
      name_label: t({
        en: "Name",
        ko: "이름",
      }),
      name_placeholder: t({
        en: "My list",
        ko: "내 목록",
      }),
      name_required: t({
        en: "Name is required.",
        ko: "이름을 입력해주세요.",
      }),
      description_label: t({
        en: "Description",
        ko: "설명",
      }),
      description_placeholder: t({
        en: "Optional description for your list",
        ko: "설명 (선택 사항)",
      }),
      currency_label: t({
        en: "Currency",
        ko: "통화",
      }),
      currency_placeholder: t({
        en: "None",
        ko: "없음",
      }),
      currency_desc: t({
        en: "Currency for objekt prices in this list",
        ko: "이 목록의 오브젝트 가격에 사용할 통화",
      }),
      list_type_label: t({
        en: "List Type",
        ko: "목록 유형",
      }),
      list_type_desc: t({
        en: "Choose between a normal or profile-bound list",
        ko: "일반 목록 또는 프로필 연결 목록 중 선택하세요",
      }),
      normal_list_label: t({
        en: "Normal List",
        ko: "일반 목록",
      }),
      normal_list_desc: t({
        en: "Collection-based, not tied to a profile. For want-to-buy lists.",
        ko: "컬렉션 기반, 프로필에 연결되지 않습니다. 구매 희망 목록에 적합합니다.",
      }),
      profile_list_label: t({
        en: "Profile List",
        ko: "프로필 목록",
      }),
      profile_list_desc: t({
        en: "Bound to a profile, shows serial numbers. Auto-removes on transfer. For want-to-sell lists.",
        ko: "프로필에 연결되며 시리얼 번호를 표시합니다. 전송 시 자동으로 제거됩니다. 판매 희망 목록에 적합합니다.",
      }),
      profile_required: t({
        en: "Profile is required.",
        ko: "프로필을 선택해주세요.",
      }),
      profile_label: t({
        en: "Profile",
        ko: "프로필",
      }),
      profile_placeholder: t({
        en: "Select a profile",
        ko: "프로필 선택",
      }),
      profile_desc: t({
        en: "Select which profile's objekts this list will track",
        ko: "이 목록이 추적할 프로필의 오브젝트를 선택하세요",
      }),
      display_profile_label: t({
        en: "Display in Profile",
        ko: "프로필에 표시",
      }),
      display_profile_desc: t({
        en: "Choose a profile to display this list in its Lists tab",
        ko: "이 목록을 표시할 프로필의 목록 탭을 선택하세요",
      }),
      display_profile_none: t({
        en: "None",
        ko: "없음",
      }),
      hide_user_label: t({
        en: "Hide User",
        ko: "사용자 숨기기",
      }),
      hide_user_desc: insert(
        t({
          en: "Hide {{siteName}} account from this list",
          ko: "이 목록에서 {{siteName}} 계정을 숨깁니다",
        }),
      ),
      submit: t({
        en: "Create",
        ko: "만들기",
      }),
      success: t({
        en: "List created",
        ko: "목록이 생성되었습니다",
      }),
      error: t({
        en: "Error creating list",
        ko: "목록 생성 오류",
      }),
    },
    edit: {
      title: t({
        en: "Edit list",
        ko: "목록 편집",
      }),
      description: t({
        en: "Manage your list",
        ko: "목록을 관리하세요",
      }),
      name_label: t({
        en: "Name",
        ko: "이름",
      }),
      description_label: t({
        en: "Description",
        ko: "설명",
      }),
      description_placeholder: t({
        en: "Optional description for your list",
        ko: "설명 (선택 사항)",
      }),
      currency_label: t({
        en: "Currency",
        ko: "통화",
      }),
      currency_placeholder: t({
        en: "None",
        ko: "없음",
      }),
      currency_desc: t({
        en: "Currency for objekt prices in this list",
        ko: "이 목록의 오브젝트 가격에 사용할 통화",
      }),
      name_placeholder: t({
        en: "My list",
        ko: "내 목록",
      }),
      name_required: t({
        en: "Name is required.",
        ko: "이름을 입력해주세요.",
      }),
      hide_user_label: t({
        en: "Hide User",
        ko: "사용자 숨기기",
      }),
      hide_user_desc: insert(
        t({
          en: "Hide {{siteName}} account from this list",
          ko: "이 목록에서 {{siteName}} 계정을 숨깁니다",
        }),
      ),
      display_profile_label: t({
        en: "Display in Profile",
        ko: "프로필에 표시",
      }),
      display_profile_desc: t({
        en: "Choose a profile to display this list in its Lists tab",
        ko: "이 목록을 표시할 프로필의 목록 탭을 선택하세요",
      }),
      display_profile_none: t({
        en: "None",
        ko: "없음",
      }),
      objekt_columns_label: t({
        en: "Objekt Columns",
        ko: "오브젝트 열",
      }),
      objekt_columns_desc: t({
        en: "Number of columns to use on visit. Visitor are still allowed to change to any columns they want. Pro tips: can also override using URL params (?column=).",
        ko: "방문 시 사용할 열 수입니다. 방문자는 여전히 원하는 열로 변경할 수 있습니다. 팁: URL 파라미터(?column=)로도 재정의할 수 있습니다.",
      }),
      objekt_columns_not_set: t({
        en: "Not set",
        ko: "설정 안 됨",
      }),
      objekt_columns_count: insert(
        t({
          en: "{{count}} columns",
          ko: "{{count}}열",
        }),
      ),
      delete_note: html(
        t({
          en: "To delete this list, visit <link>Manage list</link> page.",
          ko: "이 목록을 삭제하려면 <link>목록 관리</link> 페이지를 방문하세요.",
        }),
      ),
      submit: t({
        en: "Save",
        ko: "저장",
      }),
      success: t({
        en: "List updated",
        ko: "목록이 업데이트되었습니다",
      }),
      error: t({
        en: "Error editing list",
        ko: "목록 수정 오류",
      }),
    },
    delete: {
      title: t({
        en: "Delete list",
        ko: "목록 삭제",
      }),
      description: t({
        en: "This will permanently delete the selected list. Continue?",
        ko: "선택한 목록이 영구적으로 삭제됩니다. 계속하시겠습니까?",
      }),
      submit: t({
        en: "Continue",
        ko: "계속",
      }),
      success: t({
        en: "List deleted",
        ko: "목록이 삭제되었습니다",
      }),
      error: t({
        en: "Error deleting list",
        ko: "목록 삭제 오류",
      }),
    },
    card: {
      edit: t({
        en: "Edit",
        ko: "편집",
      }),
      edit_list: t({
        en: "Edit List",
        ko: "목록 편집",
      }),
      delete: t({
        en: "Delete",
        ko: "삭제",
      }),
    },
    manage_objekt: {
      add_title: t({
        en: "Add to list",
        ko: "목록에 추가",
      }),
      remove_title: t({
        en: "Remove objekt",
        ko: "오브젝트 제거",
      }),
      set_price_title: t({
        en: "Set price",
        ko: "가격 설정",
      }),
      set_price_label: t({
        en: "Price",
        ko: "가격",
      }),
      set_price_desc: t({
        en: "Set the same price for all selected objekts",
        ko: "선택한 모든 오브젝트에 동일한 가격 설정",
      }),
      set_price_success: t({
        en: "Price updated",
        ko: "가격이 업데이트되었습니다",
      }),
      set_price_error: t({
        en: "Error updating price",
        ko: "가격 업데이트 오류",
      }),
      set_price_qyop: t({
        en: "QYOP",
        ko: "가격 제안",
      }),
      set_price_clear: t({
        en: "Clear price",
        ko: "가격 초기화",
      }),
      set_price_note: t({
        en: "Note",
        ko: "메모",
      }),
      set_price_note_placeholder: t({
        en: "e.g., Selling in set",
        ko: "예: 세트로만 판매",
      }),
      set_price_clear_hint: t({
        en: "Set to 0 to clear price",
        ko: "0으로 설정하면 가격이 초기화됩니다",
      }),
      no_list_message: t({
        en: "You don't have any list yet.",
        ko: "아직 목록이 없습니다.",
      }),
      create_one_here: t({
        en: "Create one here",
        ko: "여기서 만들기",
      }),
      list_label: t({
        en: "My List",
        ko: "내 목록",
      }),
      list_placeholder: t({
        en: "Select a list",
        ko: "목록 선택",
      }),
      list_required: t({
        en: "List is required.",
        ko: "목록을 선택해주세요.",
      }),
      skip_dups_label: t({
        en: "Prevent duplicate",
        ko: "중복 방지",
      }),
      skip_dups_desc: t({
        en: "Skip the same objekt when adding",
        ko: "추가할 때 동일한 오브젝트 건너뛰기",
      }),
      add_button: t({
        en: "Add",
        ko: "추가",
      }),
      remove_description: t({
        en: "This will permanently remove the selected objekt from the list. Continue?",
        ko: "목록에서 선택한 오브젝트가 영구적으로 제거됩니다. 계속하시겠습니까?",
      }),
      continue_button: t({
        en: "Continue",
        ko: "계속",
      }),
    },
  },
} satisfies Dictionary;

export default content;
