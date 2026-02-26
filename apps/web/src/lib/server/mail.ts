import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

import { env } from "@/env";

import { SITE_NAME } from "../utils";

const ses = new SESv2Client({
  region: env.SES_REGION,
  credentials: {
    accessKeyId: env.SES_ACCESS_KEY,
    secretAccessKey: env.SES_SECRET_KEY,
  },
});

const MAIL_FROM = `${SITE_NAME} <${env.SES_MAIL_FROM}>`;

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
