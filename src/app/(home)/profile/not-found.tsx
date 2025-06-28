import { GhostIcon } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 py-12 font-semibold">
      <GhostIcon size={72} weight="thin" />
      User not found
    </div>
  );
}
