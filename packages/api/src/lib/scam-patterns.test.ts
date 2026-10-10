import { describe, expect, test } from "bun:test";

import { scanMessage } from "./scam-patterns";

describe("send first", () => {
  test.each([
    "send first pls",
    "you send first, then I ship",
    "can you send it first?",
    "pay first and I'll post",
    "send me first",
    "you go first then I ship",
    "먼저 보내주세요",
    "선입금 부탁드려요",
    "先に送ってください",
    "先払いでお願いします",
  ])("%s", (body) => {
    expect(scanMessage(body)).toContain("send_first");
  });
});

describe("outside payment", () => {
  test.each([
    "I only take paypal",
    "venmo me @rin",
    "pay to wise",
    "sent via toss",
    "paypal.me/rintrades",
    "https://wise.com/pay/r/abc",
    "카카오페이로 보내주세요",
    "토스로 입금",
    "PayPayでお願いします",
    "ペイペイで払います",
    "pp f&f only",
    "paypal f&f pls",
    "PP F&F",
    "토스로 보내주세요",
  ])("%s", (body) => {
    expect(scanMessage(body)).toContain("outside_payment");
  });
});

test("both categories at once", () => {
  expect(scanMessage("send first pls, pay to wise")).toEqual(["send_first", "outside_payment"]);
});

describe("false-positive guards", () => {
  test.each([
    "I'll ship it first class",
    "sent it first thing this morning",
    "which one did you get first?",
    "that's a wise choice",
    "toss it in the bag with the rest",
    "otherwise I'm happy to trade",
    "first come first served",
    "happy to trade 204Z for 205Z",
    "I'll send pics first thing tomorrow",
    "send first pics of the back please",
    "can you send photos first?",
    "I will send it first thing tomorrow",
    "아침에 토스트 먹었어요",
    "포토스팟 앞에서 만나요",
  ])("%s", (body) => {
    expect(scanMessage(body)).toEqual([]);
  });
});
