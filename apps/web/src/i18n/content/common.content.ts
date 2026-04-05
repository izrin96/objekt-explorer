import { t, insert, type Dictionary } from "intlayer";

const content = {
  key: "common",
  content: {
    modal: {
      close: t({
        en: "Close",
        ko: "닫기",
      }),
      cancel: t({
        en: "Cancel",
        ko: "취소",
      }),
    },
    actions: {
      save: t({
        en: "Save",
        ko: "저장",
      }),
      continue: t({
        en: "Continue",
        ko: "계속",
      }),
      create: t({
        en: "Create",
        ko: "만들기",
      }),
      compare: t({
        en: "Compare",
        ko: "비교",
      }),
    },
    form: {
      email: {
        label: t({
          en: "Email",
          ko: "이메일",
        }),
        placeholder: t({
          en: "your@email.com",
          ko: "your@email.com",
        }),
      },
      password: {
        label: t({
          en: "Password",
          ko: "비밀번호",
        }),
        placeholder: t({
          en: "•••••••",
          ko: "•••••••",
        }),
      },
      name: {
        label: t({
          en: "Name",
          ko: "이름",
        }),
        placeholder: t({
          en: "Your name",
          ko: "이름을 입력하세요",
        }),
      },
      description: {
        label: t({
          en: "Description",
          ko: "설명",
        }),
        placeholder: t({
          en: "Optional description",
          ko: "설명 (선택 사항)",
        }),
      },
      none: t({
        en: "None",
        ko: "없음",
      }),
    },
    validation: {
      required: t({
        en: "This field is required.",
        ko: "이 필드를 입력해주세요.",
      }),
      required_email: t({
        en: "Email is required.",
        ko: "이메일을 입력해주세요.",
      }),
      required_password: t({
        en: "Password is required.",
        ko: "비밀번호를 입력해주세요.",
      }),
      required_name: t({
        en: "Name is required.",
        ko: "이름을 입력해주세요.",
      }),
    },
    copy: {
      button: t({
        en: "Copy",
        ko: "복사",
      }),
      copied: t({
        en: "Copied!",
        ko: "복사됨!",
      }),
    },
    count: {
      total: insert(
        t({
          en: "{{count}} total",
          ko: "총 {{count}}개",
        }),
      ),
      types: insert(
        t({
          en: "{{count}} types",
          ko: "{{count}}가지 종류",
        }),
      ),
    },
    error: {
      loading_page: t({
        en: "Error loading page",
        ko: "페이지 로딩 오류",
      }),
      loading_data: t({
        en: "Error loading data",
        ko: "데이터 로딩 오류",
      }),
      retry: t({
        en: "Retry",
        ko: "다시 시도",
      }),
    },
    theme_switcher: {
      label: t({
        en: "Switch theme",
        ko: "테마 전환",
      }),
    },
    mobile_navigation: {
      toggle: t({
        en: "Toggle Menu",
        ko: "메뉴 토글",
      }),
      label: t({
        en: "Navigation",
        ko: "낵비게이션",
      }),
      home: t({
        en: "Home",
        ko: "홈",
      }),
    },
    settings: {
      title: t({
        en: "Settings",
        ko: "설정",
      }),
      theme: {
        label: t({
          en: "Theme",
          ko: "테마",
        }),
        desc: t({
          en: "Select your preferred color scheme",
          ko: "선호하는 테마를 선택하세요",
        }),
        light: t({
          en: "Light",
          ko: "라이트",
        }),
        dark: t({
          en: "Dark",
          ko: "다크",
        }),
        system: t({
          en: "System",
          ko: "시스템",
        }),
      },
      language: {
        label: t({
          en: "Language",
          ko: "언어",
        }),
        desc: t({
          en: "Choose your display language",
          ko: "표시 언어를 선택하세요",
        }),
        en: t({
          en: "English",
          ko: "English",
        }),
        ko: t({
          en: "한국어",
          ko: "한국어",
        }),
      },
      filters: {
        label: t({
          en: "Display",
          ko: "표시",
        }),
        wide: t({
          en: "Wide layout",
          ko: "넓은 레이아웃",
        }),
        wide_desc: t({
          en: "Use full width for collection grid",
          ko: "컬렉션 그리드에 전체 너비 사용",
        }),
        hide_label: t({
          en: "Hide labels",
          ko: "라벨 숨김",
        }),
        hide_label_desc: t({
          en: "Hide collection labels on objekts",
          ko: "오브젝트의 컬렉션 라벨 숨김",
        }),
      },
    },
    changelog: t({
      en: "Changelog",
      ko: "변경 사항",
    }),
  },
} satisfies Dictionary;

export default content;
