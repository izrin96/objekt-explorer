import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

import { serverEnv } from "@/lib/env/server";

import { SITE_NAME } from "../utils";

const ses = new SESv2Client({
  region: serverEnv.SES_REGION,
  credentials: {
    accessKeyId: serverEnv.SES_ACCESS_KEY,
    secretAccessKey: serverEnv.SES_SECRET_KEY,
  },
});

const MAIL_FROM = `${SITE_NAME} <${serverEnv.SES_MAIL_FROM}>`;

export async function sendVerificationEmail(to: string, url: string) {
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: MAIL_FROM,
      Destination: {
        ToAddresses: [to],
      },
      Content: {
        Simple: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: `
<html>
  <body>
  <p>Click the link below to verify your email.</p>
  <a href="${url}">${url}</a>
  </body>
</html>`,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: "Verify your email",
          },
        },
      },
    }),
  );
}

export async function sendResetPassword(to: string, url: string) {
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: MAIL_FROM,
      Destination: {
        ToAddresses: [to],
      },
      Content: {
        Simple: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: `
<html>
  <body>
  <p>Click the link below to reset your password.</p>
  <a href="${url}">${url}</a>
  </body>
</html>`,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: "Reset your password",
          },
        },
      },
    }),
  );
}

export async function sendDeleteAccountVerification(to: string, url: string) {
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: MAIL_FROM,
      Destination: {
        ToAddresses: [to],
      },
      Content: {
        Simple: {
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: `
<html>
  <body>
  <p>Click the link below to delete your account.</p>
  <a href="${url}">${url}</a>
  </body>
</html>`,
            },
          },
          Subject: {
            Charset: "UTF-8",
            Data: "Delete your account",
          },
        },
      },
    }),
  );
}
