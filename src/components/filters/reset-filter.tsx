"use client";

import React from "react";
import { Button } from "../ui";
import { TrashSimpleIcon } from "@phosphor-icons/react/dist/ssr";

export default function ResetFilter({ onReset }: { onReset: () => void }) {
  return (
    <Button intent="outline" onClick={onReset}>
      <TrashSimpleIcon data-slot="icon" />
      Reset filter
    </Button>
  );
}
