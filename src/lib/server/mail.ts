import { env } from "@/env";
import { SES } from "@aws-sdk/client-ses";

const ses = new SES({
  region: env.SES_REGION,
  credentials: {
    accessKeyId: env.SES_ACCESS_KEY,
    secretAccessKey: env.SES_SECRET_KEY,
  },
});

export async function sendVerificationEmail(to: string, url: string) {
  await ses.sendEmail({
    Source: env.SES_MAIL_FROM,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
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
        Data: `Verify your email`,
      },
    },
  });
}

export async function sendResetPassword(to: string, url: string) {
  await ses.sendEmail({
    Source: env.SES_MAIL_FROM,
    Destination: {
      ToAddresses: [to],
    },
    Message: {
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
  });
}
