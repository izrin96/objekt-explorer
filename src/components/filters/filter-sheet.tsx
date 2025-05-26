"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { FunnelIcon } from "@phosphor-icons/react/dist/ssr";

type Props = React.PropsWithChildren;

export function FilterSheet({ children }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button
        className="fixed bottom-32 right-2 z-1 bg-bg/50 h-8 w-8 p-0 border border-border/50"
        intent="plain"
        onPress={() => setIsOpen(true)}
      >
        <FunnelIcon size={16} weight="duotone" />
      </Button>
      <Sheet.Content
        classNames={{ content: "max-w-sm" }}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      >
        <Sheet.Header>
          <Sheet.Title>Filter</Sheet.Title>
        </Sheet.Header>
        <Sheet.Body>{children}</Sheet.Body>
        <Sheet.Footer className="justify-end">
          <Sheet.Close>Close</Sheet.Close>
        </Sheet.Footer>
      </Sheet.Content>
    </>
  );
}
