import { i18n } from "@better-auth/i18n";
import { db } from "@repo/db";
import * as authSchema from "@repo/db/auth-schema";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getOAuthState, getSessionFromCtx } from "better-auth/api";
import { betterAuth } from "better-auth/minimal";
import { admin } from "better-auth/plugins/admin";
import { username } from "better-auth/plugins/username";
import { and, eq, ne } from "drizzle-orm";

import { SITE_NAME } from "../constants";
import { serverEnv } from "../env";
import { hasDeliverableEmail } from "../lib/account-deletion";
import { ac, roles } from "../permissions";
import { banNoticeMessage } from "../schemas/moderation";
import { isDeleteRefusal } from "../schemas/user";
import { deleteRefusal, refusalError } from "./account-delete";
import { betterAuthLocale } from "./auth-locale";
import { sendDeleteAccountVerification, sendResetPassword, sendVerificationEmail } from "./mail";

// loaded on use, as it reaches back to this module through the socket publisher
const anonymize = async (userId: string, self: boolean) => {
  const { anonymizeUser } = await import("./account-anonymize");
  await anonymizeUser(userId, { self });
};

/**
 * Sign-up takes any email without proving it, so a password account whose email is unverified
 * may belong to someone squatting on the address: a login linked to it would outlive the real
 * owner's password reset. Such an account links nothing until its email is verified. An account
 * made by a social sign-in has no password and links freely, as Discord's placeholder email can
 * never be verified.
 */
async function refuseUnverifiedLink(ctx: Parameters<typeof getSessionFromCtx>[0]) {
  const session = await getSessionFromCtx(ctx);
  if (!session || session.user.emailVerified) return;
  const accounts = await ctx.context.internalAdapter.findAccounts(session.user.id);
  if (!accounts.some((account) => account.providerId === "credential")) return;
  // the i18n plugin translates only after hooks, so the locale is read here
  const locale = ctx.getCookie("PARAGLIDE_LOCALE");
  const translated =
    locale === "ko" || locale === "ja" ? betterAuthLocale[locale].LINK_NEEDS_VERIFIED_EMAIL : null;
  throw new APIError("FORBIDDEN", {
    code: "LINK_NEEDS_VERIFIED_EMAIL",
    message: translated ?? "Verify your email before linking another login",
  });
}

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
    revokeSessionsOnPasswordReset: true,
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
      showOnline: {
        type: "boolean",
        required: false,
        defaultValue: true,
        returned: true,
        input: false,
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
        // the before-hook refuses first; Better Auth swallows errors thrown here
        if (!hasDeliverableEmail(user.email)) return;
        await sendDeleteAccountVerification(user.email, url);
      },
      // before Better Auth removes the sessions and logins, so a refusal or failure leaves the
      // account whole; it checks for blockers again, in the same transaction as the scrub
      beforeDelete: async (user) => {
        await anonymize(user.id, true);
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
      if (ctx.path === "/link-social") {
        await refuseUnverifiedLink(ctx);
        return;
      }
      if (ctx.path !== "/delete-user" && ctx.path !== "/delete-user/callback") return;
      const session = await getSessionFromCtx(ctx);
      if (!session) return;
      const refusal = await deleteRefusal(session.user.id);
      if (refusal) {
        // the link is opened in a browser: back to the account page, not a JSON error
        if (ctx.path === "/delete-user/callback") {
          throw ctx.redirect(`/account/danger?refused=${refusal}`);
        }
        throw refusalError(refusal);
      }
      // with a token it is Delete now, which needs no email
      const body = ctx.body as { token?: string } | undefined;
      if (ctx.path === "/delete-user" && !body?.token && !hasDeliverableEmail(session.user.email)) {
        throw refusalError("email_undeliverable");
      }
    }),
    // the scrub's own re-check refuses after the callback spent its token; an error thrown here
    // keeps the endpoint's status, which a browser won't follow, so it returns the redirect
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/delete-user/callback") return;
      const returned = ctx.context.returned;
      if (!(returned instanceof APIError) || !isDeleteRefusal(returned.body?.code)) return;
      return new Response(null, {
        status: 302,
        headers: { location: `/account/danger?refused=${returned.body?.code}` },
      });
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
          if (!row?.deletedAt) await anonymize(user.id, false);
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

          // only the first social link turns showSocial on, so a later link
          // does not undo a user's choice to hide it
          const [other] = await db
            .select({ id: authSchema.account.id })
            .from(authSchema.account)
            .where(
              and(
                eq(authSchema.account.userId, account.userId),
                ne(authSchema.account.providerId, "credential"),
                ne(authSchema.account.id, account.id),
              ),
            )
            .limit(1);

          await db
            .update(authSchema.user)
            .set({
              [account.providerId]: getProviderUsername(account.providerId, info),
              ...(other ? {} : { showSocial: true }),
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
