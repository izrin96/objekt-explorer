"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { IconFilter } from "@intentui/icons";

type Props = React.PropsWithChildren;

export function FilterSheet({ children }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        className="fixed bottom-4 right-4 z-50"
        intent="outline"
        onPress={() => setIsOpen(true)}
      >
        <IconFilter />
      </Button>
      <Sheet.Content isOpen={isOpen} onOpenChange={setIsOpen}>
        <Sheet.Header>
          <Sheet.Title>Filter</Sheet.Title>
        </Sheet.Header>
        <Sheet.Body>{children}</Sheet.Body>
      </Sheet.Content>
    </>
  );
}
