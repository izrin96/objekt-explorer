import { cosmoShop } from "./http";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import chromiumLight from "@sparticuz/chromium";
import { TicketAuth, TicketQuery } from "@/lib/universal/cosmo/shop/qr-auth";

const headlessType = process.env.IS_LOCAL ? false : true;

const RECAPTCHA_KEY = "6LeHzjYqAAAAAOR5Up9lFb_sC39YGo5aQFyVDrsK";

export async function generateRecaptchaToken() {
  const browser = await chromium.launch({
    args: process.env.IS_LOCAL ? undefined : chromiumLight.args,
    executablePath: process.env.IS_LOCAL
      ? "/tmp/localChromium/chromium/mac_arm-1455391/chrome-mac/Chromium.app/Contents/MacOS/Chromium"
      : await chromiumLight.executablePath(),
    headless: headlessType,
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://shop.cosmo.fans/404"); // go to 404 seem a bit faster

  const token = await page.evaluate((key) => {
    const grecaptcha = (window as any).grecaptcha;
    return new Promise<string>((resolve, reject) => {
      grecaptcha.ready(() => {
        grecaptcha
          .execute(key, {
            action: "login",
          })
          .then(resolve)
          .catch(reject);
      });
    });
  }, RECAPTCHA_KEY);

  await browser.close();

  return token;
}

export async function generateQrTicket(token: string) {
  return await cosmoShop<TicketAuth>(
    `/bff/v1/users/auth/login/native/qr/ticket`,
    {
      method: "post",
      body: {
        recaptcha: {
          action: "login",
          token: token,
        },
      },
      query: {
        tid: randomUUID(),
      },
    }
  );
}

export async function queryTicket(ticket: string) {
  return await cosmoShop<TicketQuery>(
    `/bff/v1/users/auth/login/native/qr/ticket`,
    {
      query: {
        tid: crypto.randomUUID(),
        ticket,
      },
    }
  );
}

export async function certifyTicket(otp: number, ticket: string) {
  return await cosmoShop(`/bff/v1/users/auth/login/native/qr/ticket/certify`, {
    method: "post",
    body: {
      otp,
      ticket,
    },
    query: {
      tid: crypto.randomUUID(),
    },
  });
}

export function generateQrCode(ticket: string) {
  return `cosmo://ticket-login?t=${ticket}`;
}
