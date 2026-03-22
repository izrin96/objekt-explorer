import { createFileRoute } from "@tanstack/react-router";

import { SITE_NAME } from "@/lib/utils";

export const Route = createFileRoute("/_container/terms-privacy")({
  head: () => ({
    meta: [{ title: "Terms & Privacy · Objekt Tracker" }],
  }),
  component: TermsPrivacyPage,
});

function TermsPrivacyPage() {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h2 className="text-lg font-semibold">Terms & Privacy</h2>
      <div className="text-fg text-sm">
        <ul className="list-disc leading-8">
          <li>We only use your login information to identify your account.</li>
          <li>We will never post anything on your behalf.</li>
          <li>We will never sell your data to third parties.</li>
          <li>We only access your Cosmo data through the official app.</li>
          <li>You can delete your account and all associated data at any time.</li>
          <li>
            {SITE_NAME} is open source and{" "}
            <a
              href="https://github.com/izrin96/objekt-explorer"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              available here
            </a>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
