import { CubeIcon } from "@phosphor-icons/react/dist/ssr";

import { Link } from "@/components/intentui/link";
import { SITE_NAME } from "@/lib/utils";

export default function AppLogo() {
  return (
    <Link to="/">
      <div className="flex h-8 items-center gap-2">
        <CubeIcon size={24} weight="fill" />
        <span className="hidden truncate text-lg font-semibold select-none sm:block">
          {SITE_NAME}
        </span>
      </div>
    </Link>
  );
}
