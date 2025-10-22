import { randomUUID } from "node:crypto";
import chromium from "puppeteer-core";
import { env } from "@/lib/env/server";
import type { CosmoShopUser, TicketAuth, TicketCheck } from "@/lib/universal/cosmo/shop/qr-auth";
import { cosmoShop } from "./http";

export async function generateRecaptchaToken() {
  const launchArgs = JSON.stringify({ headless: "shell" });
  const browser = await chromium.connect({
    browserWSEndpoint: `${env.BROWSER_CDP_URL}&launch=${launchArgs}`,
  });

  const page = await browser.newPage();
  await page.goto("https://shop.cosmo.fans/en/login/landing", {
    waitUntil: ["domcontentloaded", "networkidle2"],
    timeout: 0,
  });

  let result: string | null = null;

  try {
    const apiKey = await page.evaluate(() => {
      const script = document.querySelector<HTMLScriptElement>("#google-recaptcha-v3");
      if (!script) return null;

      const url = new URL(script.src);
      return url.searchParams.get("render");
    });

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
    }, apiKey);

    result = token.toString();
  } catch (e) {
    console.error(e);
  } finally {
    await page.close();
  }

  return result;
}

export async function generateQrTicket(token: string) {
  return await cosmoShop<TicketAuth>(`/bff/v1/users/auth/login/native/qr/ticket`, {
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
  });
}

export async function checkTicket(ticket: string) {
  return await cosmoShop<TicketCheck>(`/bff/v1/users/auth/login/native/qr/ticket`, {
    query: {
      tid: randomUUID(),
      ticket,
    },
  });
}

export async function certifyTicket(otp: number, ticket: string) {
  return await cosmoShop.raw(`/bff/v1/users/auth/login/native/qr/ticket/certify`, {
    method: "post",
    body: {
      otp,
      ticket,
    },
    query: {
      tid: randomUUID(),
    },
  });
}

export async function getUser(cookie: string) {
  return await cosmoShop<CosmoShopUser>(`/bff/v4/users/me`, {
    headers: {
      Cookie: `user-session=${cookie}`,
    },
  });
}
