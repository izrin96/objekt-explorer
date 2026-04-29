import { t, type Dictionary } from "intlayer";

const content = {
  key: "trades",
  content: {
    filter_type: {
      label: t({ en: "Event", ko: "이벤트" }),
      all: t({ en: "All", ko: "전체" }),
      mint: t({ en: "Mint", ko: "민팅" }),
      received: t({ en: "Received", ko: "받음" }),
      sent: t({ en: "Sent", ko: "보냄" }),
      spin: t({ en: "Spin", ko: "스핀" }),
    },
    history_private: t({ en: "Activity History Private", ko: "활동 내역 비공개" }),
    table_headers: {
      date: t({ en: "Date", ko: "날짜" }),
      objekt: t({ en: "Objekt", ko: "오브젝트" }),
      serial: t({ en: "Serial", ko: "시리얼" }),
      action: t({ en: "Action", ko: "행동" }),
      user: t({ en: "User", ko: "사용자" }),
    },
    actions: {
      received_from: t({ en: "Received", ko: "받음" }),
      sent_to: t({ en: "Sent", ko: "보냄" }),
    },
    cosmo: t({ en: "COSMO", ko: "COSMO" }),
    cosmo_spin: t({ en: "COSMO Spin", ko: "COSMO 스핀" }),
  },
} satisfies Dictionary;

export default content;
