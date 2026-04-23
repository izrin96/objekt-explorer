import type { Metadata } from "next";
import { useIntlayer } from "next-intlayer/server";

import { Link } from "@/components/intentui/link";
import { SITE_NAME } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const content = useIntlayer("terms_privacy");
  return {
    title: content.title.value,
  };
}

export default async function TermsPrivacy() {
  const content = useIntlayer("terms_privacy");
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h2 className="text-lg font-semibold">{content.heading.value}</h2>

      <div className="text-fg text-sm">
        <ul className="list-disc leading-8">
          <li>{content.points.login_info.value}</li>
          <li>{content.points.no_post.value}</li>
          <li>{content.points.no_sell.value}</li>
          <li>{content.points.only_app.value}</li>
          <li>{content.points.delete_anytime.value}</li>
          <li>
            {content.points.open_source_prefix({ siteName: SITE_NAME }).value}{" "}
            <Link
              href="https://github.com/izrin96/objekt-explorer"
              className="underline"
              target="_blank"
            >
              {content.points.available_here.value}
            </Link>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
