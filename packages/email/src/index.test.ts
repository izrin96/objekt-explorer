import { describe, expect, test } from "bun:test";

import { deleteAccount, resetPassword, verifyEmail } from ".";

const site = { name: "Objekt Tracker", url: "https://objekt.top" };
const url = "https://objekt.top/api/auth/reset-password/abc?callbackURL=%2F&x=1";

describe.each([
  ["verifyEmail", verifyEmail],
  ["resetPassword", resetPassword],
  ["deleteAccount", deleteAccount],
] as const)("%s", (_, renderEmail) => {
  test("links the action url in both bodies", async () => {
    const email = await renderEmail({ site, url });
    expect(email.html).toContain(`href="${url.replaceAll("&", "&amp;")}"`);
    expect(email.text).toContain(url);
  });

  test("prints the url once in the plain-text body", async () => {
    const { text } = await renderEmail({ site, url });
    expect(text.split(url)).toHaveLength(2);
  });
});
