import { i18n } from "@better-auth/i18n";
import { db } from "@repo/db";
import * as authSchema from "@repo/db/auth-schema";
import { userAddress } from "@repo/db/schema";
import { getRequestHeaders, setResponseHeader } from "@tanstack/react-start/server";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getOAuthState } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { username } from "better-auth/plugins/username";
import { eq } from "drizzle-orm";

import { SITE_NAME } from "../constants";
import { serverEnv } from "../env";
import { betterAuthLocale } from "./auth-locale";
import { sendDeleteAccountVerification, sendResetPassword, sendVerificationEmail } from "./mail";

export const auth = betterAuth({
  appName: SITE_NAME,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  plugins: [
    username(),
    i18n({
      defaultLocale: "en",
      translations: betterAuthLocale,
      detection: ["callback", "cookie"],
      localeCookie: "PARAGLIDE_LOCALE",
    }),
  ],
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPassword(user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },
  socialProviders: {
    discord: {
      clientId: serverEnv.DISCORD_CLIENT_ID,
      clientSecret: serverEnv.DISCORD_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({
        email: profile.email ?? `${profile.id}@discord.placeholder.local`,
        discord: profile.username,
      }),
    },
    twitter: {
      clientId: serverEnv.TWITTER_CLIENT_ID,
      clientSecret: serverEnv.TWITTER_CLIENT_SECRET,
      mapProfileToUser: (profile) => ({
        twitter: profile.data.username,
      }),
    },
  },
  baseURL: serverEnv.SITE_URL,
  // a phone on the LAN reaches the dev server by IP, which is not the baseURL origin
  trustedOrigins:
    process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:*", "http://127.0.0.1:*", "http://192.168.*.*:*", "http://10.*.*.*:*"],
  advanced: {
    ipAddress: {
      // the only one Traefik overwrites; the rest arrive as the client wrote them
      ipAddressHeaders: ["x-real-ip"],
    },
  },
  user: {
    additionalFields: {
      discord: {
        type: "string",
        required: false,
        returned: true,
        input: false,
      },
      twitter: {
        type: "string",
        required: false,
        returned: true,
        input: false,
      },
      showSocial: {
        type: "boolean",
        required: false,
        defaultValue: false,
        returned: true,
        input: true,
      },
      removeImage: {
        type: "boolean",
        required: false,
        defaultValue: false,
        returned: true,
        input: false,
      },
    },
    deleteUser: {
      enabled: true,
      sendDeleteAccountVerification: async ({ user, url }) => {
        await sendDeleteAccountVerification(user.email, url);
      },
      afterDelete: async (user) => {
        await db
          .update(userAddress)
          .set({
            userId: null,
          })
          .where(eq(userAddress.userId, user.id));
      },
    },
    changeEmail: {
      enabled: true,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
    },
  },
  session: {
    freshAge: 0,
  },
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          // custom db hook to store social provider username when linking
          if (account.providerId === "credential") return;

          const authContext = await auth.$context;
          const provider = authContext.socialProviders.find((p) => p.id === account.providerId);
          if (!provider) return;
          const info = await provider.getUserInfo({
            accessToken: account.accessToken ?? undefined,
          });

          await db
            .update(authSchema.user)
            .set({
              [account.providerId]: getProviderUsername(account.providerId, info),
              showSocial: true,
            })
            .where(eq(authSchema.user.id, account.userId));
        },
      },
      update: {
        // Refresh re-links an already linked provider, which only stores fresh
        // tokens; sign-ins and token refreshes carry no `link` and are skipped
        after: async (account) => {
          const state = await getOAuthState();
          if (!state?.link) return;
          await refreshProviderProfile(account);
        },
      },
      delete: {
        // must be `before` — better-auth defers `after` past commit
        before: async (account) => {
          if (account.providerId === "credential") return;

          const authContext = await auth.$context;
          if (!authContext.socialProviders.some((p) => p.id === account.providerId)) return;

          await db
            .update(authSchema.user)
            .set({
              [account.providerId]: null,
            })
            .where(eq(authSchema.user.id, account.userId));
        },
      },
    },
  },
});

export type User = (typeof auth.$Infer.Session)["user"];

/** Copies the provider username and avatar onto the user; false when the provider refuses the token. */
export async function refreshProviderProfile(account: {
  userId: string;
  providerId: string;
  accessToken?: string | null;
  idToken?: string | null;
  refreshToken?: string | null;
}) {
  const authContext = await auth.$context;
  const provider = authContext.socialProviders.find((p) => p.id === account.providerId);
  const info = await provider?.getUserInfo({
    idToken: account.idToken ?? undefined,
    accessToken: account.accessToken ?? undefined,
    refreshToken: account.refreshToken ?? undefined,
  });
  if (!info) return false;

  await db
    .update(authSchema.user)
    .set({
      [account.providerId]: getProviderUsername(account.providerId, info),
      image: info.user.image,
    })
    .where(eq(authSchema.user.id, account.userId));
  return true;
}

function getProviderUsername(
  providerId: string,
  info: { data?: unknown } | null | undefined,
) {
  const data = info?.data as { username?: string; data?: { username?: string } } | undefined;
  return providerId === "discord" ? data?.username : data?.data?.username;
}

export async function getSession() {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
    returnHeaders: true,
  });

  if (!session.response) {
    return null;
  }

  const cookies = session.headers.getSetCookie();
  if (cookies.length) {
    setResponseHeader("Set-Cookie", cookies);
  }

  return session.response;
}
