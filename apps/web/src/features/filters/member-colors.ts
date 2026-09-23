import { useCallback } from "react";

import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";

/**
 * Every member's Cosmo colour (`primaryColorHex`), pinned as the fallback for
 * a member the artist payload does not carry — a unit or an event in the
 * member column has no entry there.
 */
const MEMBER_COLORS: Record<string, string> = {
  // tripleS
  SeoYeon: "#22AEFF",
  HyeRin: "#9200FF",
  JiWoo: "#FFF800",
  ChaeYeon: "#98F21D",
  YooYeon: "#DB0C74",
  SooMin: "#FC83A4",
  NaKyoung: "#6799A0",
  YuBin: "#FFE3E2",
  Kaede: "#FFC935",
  DaHyun: "#FF9AD6",
  Kotone: "#FFDE00",
  YeonJi: "#5974FF",
  Nien: "#FF953F",
  SoHyun: "#1222B5",
  Xinyu: "#D51313",
  Mayu: "#FE8E76",
  Lynn: "#AC62B7",
  JooBin: "#B7F54C",
  HaYeon: "#52D9BB",
  ShiOn: "#FF428A",
  ChaeWon: "#C7A3E0",
  Sullin: "#7BBA8D",
  SeoAh: "#CFF3FF",
  JiYeon: "#FFAB62",
  // ARTMS
  HeeJin: "#ED0090",
  HaSeul: "#00A652",
  KimLip: "#EF1841",
  JinSoul: "#1724A7",
  Choerry: "#B510B5",
  // idntt
  DoHun: "#FF3600",
  HeeJu: "#7DD0F4",
  MinGyeol: "#C4624E",
  TaeIn: "#564FED",
  JaeYoung: "#B8ACE8",
  JuHo: "#FF833E",
  JiWoon: "#8AD363",
  HwanHee: "#FFED4A",
  CheongMyeong: "#F99BBB",
  Towa: "#338CE5",
  KyuHyuk: "#C6E800",
  NuRi: "#FFD72E",
  SeongJun: "#94A8D6",
  YeJoon: "#49369A",
  GyeongBeen: "#4EDD9C",
  EunSoo: "#FF7364",
  GiWoong: "#0447A8",
  JooHeon: "#62D3D0",
  GyungHo: "#FFD480",
  EunChan: "#8D76FF",
  EunSung: "#749AB7",
};

/**
 * Dots and swatches only — these are Cosmo's own brand colours and several
 * (YuBin, SeoAh, JiWoo) are far too light to carry text on either theme. Every
 * render site pairs the swatch with `ring-1 ring-foreground/15`, because a
 * near-white dot has no edge of its own on the light theme.
 */
export function useMemberColor(): (name: string) => string {
  const { getMember } = useCosmoArtist();

  return useCallback(
    (name: string) =>
      // `currentColor` inherits the chip's own ink, so an unknown name reads as
      // a neutral rather than as a grey that looks like a real member colour
      getMember(name)?.primaryColorHex ?? MEMBER_COLORS[name] ?? "currentColor",
    [getMember],
  );
}
