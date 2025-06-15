import { LinkBreakIcon } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <div className="flex flex-col justify-center items-center w-full gap-2 py-12 font-semibold">
      <LinkBreakIcon size={72} weight="thin" />
      Live not found
    </div>
  );
}
