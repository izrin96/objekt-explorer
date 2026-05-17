import { XIcon } from "@phosphor-icons/react/dist/ssr";

import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";

export default function ResetFilter({
  onReset,
  isDisabled,
}: {
  onReset: () => void;
  isDisabled?: boolean;
}) {
  return (
    <Button intent="outline" onPress={onReset} isDisabled={isDisabled}>
      <XIcon data-slot="icon" />
      {m.filter_reset_filter()}
    </Button>
  );
}
