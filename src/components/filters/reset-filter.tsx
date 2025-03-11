"use client"

import React from "react";
import { Button } from "../ui";
import { IconX } from "justd-icons";
import { useFilters } from "@/hooks/use-filters";

export default function ResetFilter() {
  const [, setFilters] = useFilters();
  function resetFilters() {
    setFilters({
      member: null,
      artist: null,
      sort: null,
      class: null,
      season: null,
      on_offline: null,
      transferable: null,
      search: null,
      grouped: null,
      group_by: null,
      group_bys: null,
      sort_dir: null,
      group_dir: null,
      unowned: null,
      edition: null,
    });
  }
  return (
    <Button intent="outline" onPress={() => resetFilters()}>
      <IconX />
      Reset filter
    </Button>
  );
}
