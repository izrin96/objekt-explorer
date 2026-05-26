import { ImageBrokenIcon } from "@phosphor-icons/react/dist/ssr";

import { m } from "@/paraglide/messages";

export default function ListNotFoundComponent() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
      <ImageBrokenIcon size={72} weight="thin" />
      {m.not_found_list()}
    </div>
  );
}
