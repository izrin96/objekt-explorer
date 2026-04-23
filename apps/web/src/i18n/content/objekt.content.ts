import { t, type Dictionary } from "intlayer";

const content = {
  key: "objekt",
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
    type: t({
      en: "Type",
      ko: "타입",
    }),
    physical: t({
      en: "Physical",
      ko: "피지컬",
    }),
    digital: t({
      en: "Digital",
      ko: "디지털",
    }),
    collection_no: t({
      en: "Collection No.",
      ko: "컬렉션 번호",
    }),
    accent_color: t({
      en: "Accent Color",
      ko: "강조 색상",
    }),
    text_color: t({
      en: "Text Color",
      ko: "텍스트 색상",
    }),
    created_at: t({
      en: "Created at",
      ko: "생성일",
    }),
    copies: t({
      en: "Copies",
      ko: "복제본",
    }),
    scanned_copies: t({
      en: "Scanned Copies",
      ko: "스캔된 복제본",
    }),
    spin: t({
      en: "Spin",
      ko: "스핀",
    }),
    non_spin: t({
      en: "Non-Spin",
      ko: "논스핀",
    }),
    tradable: t({
      en: "Transferable",
      ko: "전송 가능",
    }),
    trades: t({
      en: "Serials",
      ko: "번호",
    }),
    owned: t({
      en: "Owned",
      ko: "보유함",
    }),
    view_in_apollo: t({
      en: "View in Apollo",
      ko: "Apollo에서 보기",
    }),
    owner: t({
      en: "Owner",
      ko: "소유자",
    }),
    token_id: t({
      en: "Token ID",
      ko: "토큰 ID",
    }),
    transferable: t({
      en: "Transferable",
      ko: "전송 가능",
    }),
    unobtainable: t({
      en: "Unobtainable",
      ko: "획득 불가",
    }),
    date: t({
      en: "Date",
      ko: "날짜",
    }),
    not_owned: t({
      en: "Not owned",
      ko: "보유하지 않음",
    }),
    serial: t({
      en: "Serial",
      ko: "시리얼",
    }),
    received: t({
      en: "Received",
      ko: "받은 날짜",
    }),
    yes: t({
      en: "Yes",
      ko: "예",
    }),
    no: t({
      en: "No",
      ko: "아니오",
    }),
    error_fetching_metadata: t({
      en: "Error fetching metadata",
      ko: "메타데이터 가져오기 오류",
    }),
    objekt_private: t({
      en: "Objekt Private",
      ko: "비공개 오브젝트",
    }),
    not_found_objekt: t({
      en: "Not found",
      ko: "찾을 수 없음",
    }),
    token_id_copied: t({
      en: "Token ID copied",
      ko: "토큰 ID 복사됨",
    }),
    must_select_one: t({
      en: "Must select at least 1 objekt",
      ko: "최소 1개의 오브젝트를 선택해야 합니다",
    }),
    note: t({
      en: "Note",
      ko: "메모",
    }),
    qyop: t({
      en: "QYOP",
      ko: "제시",
    }),
    set_price: t({
      en: "Set price",
      ko: "가격 설정",
    }),
  },
} satisfies Dictionary;

export default content;
