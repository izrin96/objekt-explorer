import { createRoute } from "@tanstack/react-router";

import { rootRoute } from "@/routes/root";

/**
 * `terms_privacy_*` in `apps/website/messages/en.json`, copied verbatim the
 * way `components/auth/copy.ts` carries the auth strings. The site name is the
 * `{siteName}` parameter of `terms_privacy_points_open_source_prefix`, which
 * the website fills from its own `SITE_NAME`.
 */
export const TERMS_COPY = {
  /** terms_privacy_heading (and terms_privacy_title, which is the same string) */
  heading: "Terms and Privacy",
  points: [
    /** terms_privacy_points_login_info */
    "When you log in with Twitter (X) or Discord, we get your public profile info (like your name and username).",
    /** terms_privacy_points_no_post */
    "We do not post anything or access your private data.",
    /** terms_privacy_points_no_sell */
    "We do not sell or share your data.",
    /** terms_privacy_points_only_app */
    "We only use your info to make the app work.",
    /** terms_privacy_points_delete_anytime */
    "You can ask us to delete your data anytime.",
  ],
  /** terms_privacy_points_open_source_prefix, with `{siteName}` filled in */
  openSourcePrefix: "Objekt Tracker is open source. GitHub link",
  /** terms_privacy_points_available_here */
  availableHere: "available here",
} as const;

const GITHUB_URL = "https://github.com/izrin96/objekt-explorer";

function TermsPrivacy() {
  return (
    <div className="flex flex-col items-center gap-6 py-8 pt-4 pb-36">
      <h2 className="font-display text-xl font-semibold">{TERMS_COPY.heading}</h2>

      <div className="text-foreground text-sm">
        <ul className="list-disc leading-8">
          {TERMS_COPY.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
          <li>
            {TERMS_COPY.openSourcePrefix}{" "}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {TERMS_COPY.availableHere}
            </a>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}

export const termsPrivacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/terms-privacy",
  component: TermsPrivacy,
});
