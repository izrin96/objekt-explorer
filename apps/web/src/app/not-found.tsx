import { FileDashedIcon } from "@phosphor-icons/react/dist/ssr";
import { useIntlayer } from "next-intlayer/server";

export default async function NotFound() {
  const content = useIntlayer("not_found");
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
      <FileDashedIcon size={72} weight="thin" />
      {content.page.value}
    </div>
  );
}
