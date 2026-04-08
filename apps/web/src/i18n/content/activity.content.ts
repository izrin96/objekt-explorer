import { t, type Dictionary } from "intlayer";

const content = {
  key: "activity",
  content: {
    title: t({
      en: "Objekt Activity",
      ko: "오브젝트 활동",
    }),
    description: t({
      en: "Latest objekt activity in realtime",
      ko: "실시간 최신 오브젝트 활동",
    }),
    event_type: {
      mint: t({
        en: "Mint",
        ko: "민팅",
      }),
      spin: t({
        en: "Spin",
        ko: "스핀",
      }),
      transfer: t({
        en: "Transfer",
        ko: "전송",
      }),
    },
    table: {
      event: t({
        en: "Event",
        ko: "이벤트",
      }),
      objekt: t({
        en: "Objekt",
        ko: "오브젝트",
      }),
      serial: t({
        en: "Serial",
        ko: "시리얼",
      }),
      from: t({
        en: "From",
        ko: "보낸 사람",
      }),
      to: t({
        en: "To",
        ko: "받는 사람",
      }),
      time: t({
        en: "Time",
        ko: "시간",
      }),
      aria_label: t({
        en: "Activity list",
        ko: "활동 목록",
      }),
    },
    paused_on_hover: t({
      en: "Paused on hover",
      ko: "마우스 오버 시 일시 정지",
    }),
    cosmo: t({
      en: "COSMO",
      ko: "COSMO",
    }),
    cosmo_spin: t({
      en: "COSMO Spin",
      ko: "COSMO 스핀",
    }),
  },
} satisfies Dictionary;

export default content;
