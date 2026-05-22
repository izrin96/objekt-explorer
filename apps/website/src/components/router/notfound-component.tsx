import { FileDashedIcon } from "@phosphor-icons/react/dist/ssr";

import { m } from "@/paraglide/messages";

export function NotFoundComponent() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
      <FileDashedIcon size={72} weight="thin" />
      {m.not_found_page()}
    </div>
  );
}
