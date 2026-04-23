"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr";
import { useIntlayer } from "next-intlayer";

import { Button } from "../intentui/button";

export default function ResetFilter({
  onReset,
  isDisabled,
}: {
  onReset: () => void;
  isDisabled?: boolean;
}) {
  const content = useIntlayer("filter");
  return (
    <Button intent="outline" onPress={onReset} isDisabled={isDisabled}>
      <XIcon data-slot="icon" />
      {content.reset_filter.value}
    </Button>
  );
}
