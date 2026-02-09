import { FileDashedIcon } from "@phosphor-icons/react/dist/ssr";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("not_found");
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
      <FileDashedIcon size={72} weight="thin" />
      {t("page")}
    </div>
  );
}
