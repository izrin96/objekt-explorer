import { t, insert, type Dictionary } from "intlayer";

const content = {
  key: "compare",
  content: {
    modal: {
      title: t({
        en: "Compare Lists",
        ko: "목록 비교",
      }),
      comparing_from: insert(
        t({
          en: "Comparing from: {{name}}",
          ko: "비교 원본: {{name}}",
        }),
      ),
      target_type: {
        label: t({
          en: "Compare with",
          ko: "비교 대상",
        }),
        description: t({
          en: "Select a profile or list to compare against the source",
          ko: "원본과 비교할 프로필 또는 목록을 선택하세요",
        }),
        profile: {
          label: t({
            en: "Profile",
            ko: "프로필",
          }),
          description: t({
            en: "Compare with a Cosmo profile",
            ko: "Cosmo 프로필과 비교",
          }),
        },
        list: {
          label: t({
            en: "List",
            ko: "목록",
          }),
          description: t({
            en: "Compare with another list",
            ko: "다른 목록과 비교",
          }),
        },
      },
      comparison_type: {
        label: t({
          en: "Comparison Type",
          ko: "비교 유형",
        }),
        description: t({
          en: "Choose what to display in the results",
          ko: "비교 결과에 표시할 항목을 선택하세요",
        }),
        missing: {
          label: t({
            en: "Show Unowned",
            ko: "미보유 항목 표시",
          }),
          description: t({
            en: "Show Objekts in source but not in target",
            ko: "원본에는 있지만 대상에는 없는 오브젝트 표시",
          }),
        },
        matches: {
          label: t({
            en: "Show Matches",
            ko: "일치 항목 표시",
          }),
          description: t({
            en: "Show Objekts found in both lists",
            ko: "원본과 대상 모두에 있는 오브젝트 표시",
          }),
        },
      },
      submit: t({
        en: "Compare",
        ko: "비교하기",
      }),
    },
    profile_selector: {
      label: t({
        en: "Profile",
        ko: "프로필",
      }),
      description: t({
        en: "Enter a Cosmo ID to compare with",
        ko: "비교할 Cosmo ID를 입력하세요",
      }),
      placeholder: t({
        en: "Enter Cosmo ID",
        ko: "Cosmo ID 입력",
      }),
      required: t({
        en: "Cosmo ID is required.",
        ko: "Cosmo ID를 입력해주세요.",
      }),
    },
    list_selector: {
      label: t({
        en: "List",
        ko: "목록",
      }),
      description: t({
        en: "Paste a list ID to compare with",
        ko: "비교할 목록 ID를 입력하세요",
      }),
      placeholder: t({
        en: "Enter list ID",
        ko: "목록 ID 입력",
      }),
      required: t({
        en: "List ID is required.",
        ko: "목록 ID를 입력해주세요.",
      }),
    },
    view: {
      showing_missing: t({
        en: "Showing Objekts missing from target",
        ko: "대상에 없는 오브젝트 표시 중",
      }),
      showing_matches: t({
        en: "Showing matching Objekts",
        ko: "일치하는 오브젝트 표시 중",
      }),
      source_label: t({
        en: "Source",
        ko: "원본",
      }),
      target_label: t({
        en: "Target",
        ko: "대상",
      }),
      type_list: t({
        en: "List",
        ko: "목록",
      }),
      type_profile: t({
        en: "Profile",
        ko: "프로필",
      }),
    },
    error: {
      invalid_params: t({
        en: "Invalid parameters",
        ko: "잘못된 매개변수입니다",
      }),
      loading: t({
        en: "Error loading comparison data",
        ko: "데이터를 불러오는 중 오류가 발생했습니다",
      }),
    },
  },
} satisfies Dictionary;

export default content;
