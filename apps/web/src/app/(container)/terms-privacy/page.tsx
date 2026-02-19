import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/components/ui/link";
import { SITE_NAME } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("terms_privacy");
  return {
    title: t("title"),
  };
}

export default async function TermsPrivacy() {
  const t = await getTranslations("terms_privacy");
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <h2 className="text-lg font-semibold">{t("heading")}</h2>

      <div className="text-fg text-sm">
        <ul className="list-disc leading-8">
          <li>{t("points.login_info")}</li>
          <li>{t("points.no_post")}</li>
          <li>{t("points.no_sell")}</li>
          <li>{t("points.only_app")}</li>
          <li>{t("points.delete_anytime")}</li>
          <li>
            {t("points.open_source_prefix", { siteName: SITE_NAME })}{" "}
            <Link
              href="https://github.com/izrin96/objekt-explorer"
              className="underline"
              target="_blank"
            >
              {t("points.available_here")}
            </Link>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
