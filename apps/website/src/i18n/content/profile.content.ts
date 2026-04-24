import { t, insert, type Dictionary, html } from "intlayer";

const content = {
  key: "profile",
  content: {
    header: {
      address_copied: t({
        en: "Address copied",
        ko: "주소가 복사되었습니다",
      }),
      view_in_apollo: t({
        en: "View in Apollo",
        ko: "Apollo에서 보기",
      }),
      edit_profile: t({
        en: "Edit Profile",
        ko: "프로필 편집",
      }),
    },
    tabs: {
      collection: t({
        en: "Collection",
        ko: "컬렉션",
      }),
      trade_history: t({
        en: "Activity History",
        ko: "활동 내역",
      }),
      progress: t({
        en: "Progress",
        ko: "진행 상황",
      }),
      statistics: t({
        en: "Statistics",
        ko: "통계",
      }),
      lists: t({
        en: "Lists",
        ko: "목록",
      }),
    },
    edit: {
      title: t({
        en: "Edit Profile",
        ko: "프로필 편집",
      }),
      desc: html(
        t({
          en: "Currently editing <nickname /> Cosmo profile",
          ko: "현재 <nickname />님의 Cosmo 프로필을 편집 중입니다",
        }),
      ),
      hide_user_label: t({
        en: "Hide User",
        ko: "사용자 숨기기",
      }),
      hide_user_desc: insert(
        t({
          en: "Hide {{siteName}} account from Cosmo profile",
          ko: "Cosmo 프로필에서 {{siteName}} 계정을 숨깁니다",
        }),
      ),
      hide_nickname_label: t({
        en: "Hide Cosmo ID",
        ko: "Cosmo ID 숨기기",
      }),
      hide_nickname_desc: t({
        en: "Hide Cosmo ID from Activity, Activity History, Serial Lookup and your profile.",
        ko: "활동, 활동 내역, 시리얼 조회 및 프로필에서 Cosmo ID를 숨깁니다.",
      }),
      private_serial_label: t({
        en: "Hide from Serial Lookup",
        ko: "시리얼 조회에서 숨기기",
      }),
      private_serial_desc: t({
        en: "Prevent others from finding your objekt via serial number. Only you can see it.",
        ko: "다른 사람이 시리얼 번호로 오브젝트를 찾지 못하도록 합니다. 본인만 볼 수 있습니다.",
      }),
      hide_transfer_label: t({
        en: "Hide Activity History",
        ko: "활동 내역 숨기기",
      }),
      hide_transfer_desc: t({
        en: "Hide your profile Activity History. Only you can see it.",
        ko: "프로필 활동 내역을 숨깁니다. 본인만 볼 수 있습니다.",
      }),
      private_profile_label: t({
        en: "Private Profile",
        ko: "비공개 프로필",
      }),
      private_profile_desc: t({
        en: "Make your Cosmo profile private. Only you can see it.",
        ko: "Cosmo 프로필을 비공개로 설정합니다. 본인만 볼 수 있습니다.",
      }),
      grid_columns_label: t({
        en: "Objekt Columns",
        ko: "오브젝트 열",
      }),
      grid_columns_desc: t({
        en: "Number of columns to use on visit. Visitor are still allowed to change to any columns they want. Pro tips: can also override using URL params (?column=).",
        ko: "방문 시 사용할 열 수입니다. 방문자는 여전히 원하는 열로 변경할 수 있습니다. 팁: URL 파라미터(?column=)로도 재정의할 수 있습니다.",
      }),
      grid_columns_not_set: t({
        en: "Not set",
        ko: "설정 안 됨",
      }),
      grid_columns_count: insert(
        t({
          en: "{{count}} columns",
          ko: "{{count}}열",
        }),
      ),
      banner_label: t({
        en: "Banner Image",
        ko: "배너 이미지",
      }),
      banner_selected: insert(
        t({
          en: "Selected file: {{name}}",
          ko: "선택된 파일: {{name}}",
        }),
      ),
      banner_clear: t({
        en: "Clear",
        ko: "지우기",
      }),
      banner_recommendation: t({
        en: "Recommended aspect ratio is 2.3:1",
        ko: "권장 비율은 2.3:1입니다",
      }),
      remove_banner_label: t({
        en: "Remove Banner",
        ko: "배너 제거",
      }),
      unlink_note: html(
        t({
          en: "To unlink this Cosmo profile from your account, visit <link>Manage Cosmo link</link> page.",
          ko: "이 Cosmo 프로필과 계정의 연결을 해제하려면 <link>Cosmo 링크 관리</link> 페이지를 방문하세요.",
        }),
      ),
      submit: t({
        en: "Save",
        ko: "저장",
      }),
      success: t({
        en: "Cosmo profile updated",
        ko: "Cosmo 프로필이 업데이트되었습니다",
      }),
      error: t({
        en: "Error edit Cosmo profile",
        ko: "Cosmo 프로필 수정 오류",
      }),
      upload_error: t({
        en: "Failed to upload image",
        ko: "이미지 업로드 실패",
      }),
      file_too_large: insert(
        t({
          en: 'File "{{name}}" exceeds 10 MB limit.',
          ko: '파일 "{{name}}"이(가) 10MB 제한을 초과합니다.',
        }),
      ),
    },
    not_found: t({
      en: "User not found",
      ko: "사용자를 찾을 수 없습니다",
    }),
    profile_private: t({
      en: "Profile Private",
      ko: "비공개 프로필",
    }),
  },
} satisfies Dictionary;

export default content;
