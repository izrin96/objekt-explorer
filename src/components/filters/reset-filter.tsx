"use client";

import React from "react";
import { Button } from "../ui";
import { IconX } from "@intentui/icons";

export default function ResetFilter({ onReset }: { onReset: () => void }) {
  return (
    <Button intent="outline" onClick={onReset}>
      <IconX />
      Reset filter
    </Button>
  );
}
