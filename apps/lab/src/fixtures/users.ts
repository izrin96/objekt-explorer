import { hash31 } from "@/lib/seeded";

/** Fake Cosmo users for the ⌘K search. Shape follows the app's `CosmoPublicUser` loosely. */
export type LabUser = {
  nickname: string;
  address: string;
  verified: boolean;
  /** 0–359, drives the avatar gradient */
  avatarHue: number;
};

const NICKNAMES = [
  "izrin96",
  "shah",
  "ryusion",
  "moonrise",
  "kaede.fan",
  "objektlord",
  "triples_arch",
  "seoul.stan",
  "artms.daily",
  "idntt.first",
  "VienVoiSam",
  "1jetVN274",
  "HongSseulGwigon",
  "sakura6",
  "IGWT",
  "yooyeon.wav",
  "nakyoung",
  "dahyun_collects",
  "binary02",
  "cream01er",
  "atomdrop",
  "divine.trades",
  "everline",
  "xinyu.gg",
  "joobin97",
];

const HEX = "0123456789abcdef";

/** deterministic pseudo-address so the fixtures are stable across reloads */
function fakeAddress(seed: string): string {
  let h = hash31(seed);
  let out = "0x";
  for (let i = 0; i < 40; i++) {
    // Math.imul keeps the multiply in 32-bit range; plain `*` loses the low bits to float precision
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    out += HEX[(h >>> 24) & 15];
  }
  return out;
}

export const users: LabUser[] = NICKNAMES.map((nickname, i) => ({
  nickname,
  address: fakeAddress(nickname),
  verified: i % 3 !== 1,
  avatarHue: (i * 47) % 360,
}));

export function avatarGradient(hue: number): string {
  return `linear-gradient(135deg, hsl(${hue} 52% 74%), hsl(${(hue + 45) % 360} 44% 44%))`;
}
