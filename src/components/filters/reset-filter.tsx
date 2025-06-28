"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "../ui";

export default function ResetFilter({
  onReset,
  isDisabled,
}: {
  onReset: () => void;
  isDisabled?: boolean;
}) {
  return (
    <Button intent="outline" onClick={onReset} isDisabled={isDisabled}>
      <XIcon data-slot="icon" />
      Reset filter
    </Button>
  );
}
