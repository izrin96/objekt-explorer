import { Link, createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { MessageMarkup } from "@/components/shared/message-markup";
import { PageHeader } from "@/components/shared/page-header";
import { generateMetadata } from "@/lib/meta";
import { SITE_NAME } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const GITHUB_URL = "https://github.com/izrin96/objekt-explorer";

export const Route = createFileRoute("/(container)/terms-privacy")({
  head: () => generateMetadata({ title: m.terms_privacy_title() }),
  component: TermsPrivacyPage,
});

const linkClass = "text-foreground underline underline-offset-2";

function TermsPrivacyPage() {
  const siteName = SITE_NAME;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 pt-6 pb-36">
      <PageHeader
        title={m.terms_privacy_title()}
        description={m.terms_privacy_description({ siteName })}
      />

      <Section heading={m.terms_privacy_use_heading({ siteName })}>
        <li>{m.terms_privacy_use_unofficial({ siteName })}</li>
        <li>{m.terms_privacy_use_conduct()}</li>
        <li>{m.terms_privacy_use_moderation()}</li>
        <li>{m.terms_privacy_use_trades({ siteName })}</li>
      </Section>

      <Section heading={m.terms_privacy_data_heading()}>
        <li>{m.terms_privacy_data_sign_in()}</li>
        <li>{m.terms_privacy_data_stored()}</li>
        <li>{m.terms_privacy_data_public()}</li>
        <li>{m.terms_privacy_data_chat()}</li>
        <li>{m.terms_privacy_data_reports()}</li>
        <li>{m.terms_privacy_data_email()}</li>
        <li>{m.terms_privacy_data_no_sell()}</li>
        <li>
          <MessageMarkup
            parts={m.terms_privacy_data_delete.parts()}
            markup={{
              link: (children) => (
                <Link to="/account/danger" className={linkClass}>
                  {children}
                </Link>
              ),
            }}
          />
        </li>
        <li>
          <MessageMarkup
            parts={m.terms_privacy_points_open_source.parts({ siteName })}
            markup={{
              link: (children) => (
                <a href={GITHUB_URL} target="_blank" rel="noreferrer" className={linkClass}>
                  {children}
                </a>
              ),
            }}
          />
        </li>
      </Section>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-base font-semibold text-balance">{heading}</h2>
      <ul className="marker:text-muted-foreground flex list-disc flex-col gap-2 ps-5 text-sm/6 text-pretty">
        {children}
      </ul>
    </section>
  );
}
