import { CubeIcon } from "@phosphor-icons/react";

/** The site's mark beside its name: the nav bar, the phone menu and the sign-in pages. */
export function BrandMark() {
  return (
    <span className="bg-foreground text-background grid size-6 shrink-0 place-items-center rounded-[7px]">
      <CubeIcon weight="bold" className="size-3.5" />
    </span>
  );
}
