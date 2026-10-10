import type { FlagCategory } from "../schemas/chat";

const APPS = String.raw`wise|paypal|venmo|toss|kakao\s*pay|paypay|cash\s*app|zelle|revolut`;

/** Tuned for recall: a false positive costs one caution line and a flag a moderator can ignore. */
const PATTERNS: Record<FlagCategory, RegExp[]> = {
  send_first: [
    /\b(?:send|ship|post)\s+(?:(?:it|yours|them|me|mine)\s+)?(?:first|1st)\b(?!\s+(?:class|thing|pics?|photos?))/i,
    /\b(?:pay|transfer)\s+(?:me\s+)?(?:first|1st)\b/i,
    /\byou\s+go\s+first\b/i,
    /먼저\s*(?:보내|송금|발송|입금)/,
    /선(?:입금|송금|발송)/,
    /先に(?:送|発送|振り?込|払)/,
    /先払い/,
  ],
  outside_payment: [
    /\b(?:paypal|venmo|kakao\s*pay|paypay|cash\s*app|zelle|revolut)\b/i,
    // "wise" and "toss" are everyday words, so they count only beside a payment verb
    new RegExp(String.raw`\b(?:pay|paid|send|sent|transfer)\b[^.!?\n]{0,20}\b(?:${APPS})\b`, "i"),
    /\b(?:wise|toss)\s*(?:pay|bank|transfer|account)\b/i,
    // PayPal "friends and family", which skips buyer protection
    /\b(?:pp\s*)?f\s*(?:&|n|and)\s*f\b/i,
    /\b(?:paypal\.me|wise\.com|venmo\.com|toss\.me|qr\.kakaopay\.com|pay\.paypay\.ne\.jp|cash\.app)\b/i,
    /토스(?!트|팟)|카카오\s*페이|페이팔/,
    /ペイペイ|ペイパル/,
  ],
};

export function scanMessage(body: string): FlagCategory[] {
  return (Object.keys(PATTERNS) as FlagCategory[]).filter((category) =>
    PATTERNS[category].some((pattern) => pattern.test(body)),
  );
}
