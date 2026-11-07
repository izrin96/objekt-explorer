import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { type RenderedEmail, deleteAccount, resetPassword, verifyEmail } from "@repo/email";

import { SITE_NAME } from "../../constants";
import { serverEnv } from "../../env";
import { recipientRateLimited } from "../redis";

const ses = new SESv2Client({
  region: serverEnv.SES_REGION,
  credentials: {
    accessKeyId: serverEnv.SES_ACCESS_KEY,
    secretAccessKey: serverEnv.SES_SECRET_KEY,
  },
  // the SDK waits forever by default; a stalled call would hold the request that made it
  requestHandler: { connectionTimeout: 5_000, requestTimeout: 10_000, throwOnRequestTimeout: true },
});

const MAIL_FROM = `${SITE_NAME} <${serverEnv.SES_MAIL_FROM}>`;
const site = { name: SITE_NAME, url: serverEnv.SITE_URL };

// Better Auth limits these sends per IP only, so a few IPs could bury one inbox and spend the
// SES sending reputation every auth email depends on; past the cap a send is skipped
const RECIPIENT_MAX = 5;
const RECIPIENT_WINDOW_SECONDS = 60 * 60;

async function sendMail(to: string, render: () => Promise<RenderedEmail>) {
  if (await recipientRateLimited("auth-mail", to, RECIPIENT_MAX, RECIPIENT_WINDOW_SECONDS)) {
    console.warn("[mail] recipient over its hourly limit; send skipped");
    return;
  }
  const { subject, html, text } = await render();
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: MAIL_FROM,
      Destination: {
        ToAddresses: [to],
      },
      Content: {
        Simple: {
          Subject: { Charset: "UTF-8", Data: subject },
          Body: {
            Html: { Charset: "UTF-8", Data: html },
            Text: { Charset: "UTF-8", Data: text },
          },
        },
      },
    }),
  );
}

export const sendVerificationEmail = (to: string, url: string) =>
  sendMail(to, () => verifyEmail({ site, url }));

export const sendResetPassword = (to: string, url: string) =>
  sendMail(to, () => resetPassword({ site, url }));

export const sendDeleteAccountVerification = (to: string, url: string) =>
  sendMail(to, () => deleteAccount({ site, url }));
