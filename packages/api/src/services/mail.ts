import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { type RenderedEmail, deleteAccount, resetPassword, verifyEmail } from "@repo/email";

import { SITE_NAME } from "../constants";
import { serverEnv } from "../env";

const ses = new SESv2Client({
  region: serverEnv.SES_REGION,
  credentials: {
    accessKeyId: serverEnv.SES_ACCESS_KEY,
    secretAccessKey: serverEnv.SES_SECRET_KEY,
  },
});

const MAIL_FROM = `${SITE_NAME} <${serverEnv.SES_MAIL_FROM}>`;
const site = { name: SITE_NAME, url: serverEnv.SITE_URL };

async function sendMail(to: string, email: Promise<RenderedEmail>) {
  const { subject, html, text } = await email;
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
  sendMail(to, verifyEmail({ site, url }));

export const sendResetPassword = (to: string, url: string) =>
  sendMail(to, resetPassword({ site, url }));

export const sendDeleteAccountVerification = (to: string, url: string) =>
  sendMail(to, deleteAccount({ site, url }));
