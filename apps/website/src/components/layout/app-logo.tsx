import { CubeIcon } from "@phosphor-icons/react/dist/ssr";

import { Link } from "@/components/intentui/link";
import { SITE_NAME } from "@/lib/utils";

export default function AppLogo() {
  return (
    <Link to="/">
      <div className="flex h-12 items-center gap-2.5">
        <div className="bg-secondary/80 text-fg flex size-7 items-center justify-center rounded-lg">
          <CubeIcon size={18} weight="fill" />
        </div>
        <span className="font-display hidden text-lg font-bold tracking-tight select-none sm:block">
          {SITE_NAME}
        </span>
      </div>
    </Link>
  );
}
