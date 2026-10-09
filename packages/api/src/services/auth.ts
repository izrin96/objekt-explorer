import { i18n } from "@better-auth/i18n";
import { db } from "@repo/db";
import * as authSchema from "@repo/db/auth-schema";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware, getOAuthState, getSessionFromCtx } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";
import { eq } from "drizzle-orm";

import { SITE_NAME } from "../constants";
import { serverEnv } from "../env";
import { ac, roles } from "../permissions";
import { banNoticeMessage } from "../schemas/moderation";
import { deleteRefusal, refusalError } from "./account-delete";
import { betterAuthLocale } from "./auth-locale";
import { sendDeleteAccountVerification, sendResetPassword, sendVerificationEmail } from "./mail";

// loaded on use, as it reaches back to this module through the socket publisher
const anonymize = async (userId: string) => {
  const { anonymizeUser } = await import("./account-anonymize");
  await anonymizeUser(userId);
};

export const auth = betterAuth({
  appName: SITE_NAME,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
  }),
  plugins: [
    username(),
    admin({
      ac,
      roles,
      adminRoles: ["admin"],
      // reached only after the password check, so it never tells a stranger who is banned
      bannedUserMessage: (user) => banNoticeMessage(user.banReason, user.banExpires),
    }),
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
      // before Better Auth removes the sessions and logins, so a refusal or failure leaves the
      // account whole; it checks for a trade again, in the same transaction as the scrub
      beforeDelete: async (user) => {
        await anonymize(user.id);
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
  hooks: {
    // before the confirmation email, which Better Auth sends before `beforeDelete` runs, and
    // before the link's callback spends its token
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/delete-user" && ctx.path !== "/delete-user/callback") return;
      const session = await getSessionFromCtx(ctx);
      const refusal = session && (await deleteRefusal(session.user.id));
      if (!refusal) return;
      // the link is opened in a browser: back to the account page, not a JSON error
      if (ctx.path === "/delete-user/callback") {
        throw ctx.redirect(`/account/danger?refused=${refusal}`);
      }
      throw refusalError(refusal);
    }),
  },
  databaseHooks: {
    user: {
      delete: {
        // the row stays, scrubbed: returning false skips the delete, and Better Auth still ends
        // the sessions and unlinks the logins. `beforeDelete` scrubbed it already, except on an
        // admin's removal, which skips that hook
        before: async (user) => {
          const [row] = await db
            .select({ deletedAt: authSchema.user.deletedAt })
            .from(authSchema.user)
            .where(eq(authSchema.user.id, user.id));
          if (!row?.deletedAt) await anonymize(user.id);
          return false;
        },
      },
    },
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

function getProviderUsername(providerId: string, info: { data?: unknown } | null | undefined) {
  const data = info?.data as { username?: string; data?: { username?: string } } | undefined;
  return providerId === "discord" ? data?.username : data?.data?.username;
}
