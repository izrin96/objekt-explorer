import { createFileRoute } from "@tanstack/react-router";

import { generateMetadata } from "@/lib/meta";
import { SITE_NAME } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const GITHUB_URL = "https://github.com/izrin96/objekt-explorer";

export const Route = createFileRoute("/(container)/terms-privacy")({
  head: () => generateMetadata({ title: m.terms_privacy_title() }),
  component: TermsPrivacyPage,
});

function TermsPrivacyPage() {
  return (
    <div className="flex flex-col items-center gap-6 py-8 pb-36">
      <h1 className="font-display text-xl font-semibold">{m.terms_privacy_heading()}</h1>

      <div className="text-foreground text-sm">
        <ul className="list-disc leading-8">
          <li>{m.terms_privacy_points_login_info()}</li>
          <li>{m.terms_privacy_points_no_post()}</li>
          <li>{m.terms_privacy_points_no_sell()}</li>
          <li>{m.terms_privacy_points_only_app()}</li>
          <li>{m.terms_privacy_points_delete_anytime()}</li>
          <li>
            {m.terms_privacy_points_open_source_prefix({ siteName: SITE_NAME })}{" "}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              {m.terms_privacy_points_available_here()}
            </a>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
