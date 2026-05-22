import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";

export function Notice() {
  return (
    <div className="flex items-center justify-center space-x-1 bg-rose-100 text-center text-xs leading-loose text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
      <WarningCircleIcon className="mx-1.5 inline-flex size-4" />
      Example notice
    </div>
  );
}
