"use client";

import { useMutation } from "@tanstack/react-query";
import { useIntlayer } from "next-intlayer";
import { toast } from "sonner";

import { Button } from "@/components/intentui/button";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/intentui/modal";
import { orpc } from "@/lib/orpc/client";
import type { PublicList } from "@/lib/universal/user";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
  list: PublicList;
};

export function ExportListModal({ open, setOpen, list }: Props) {
  const content = useIntlayer("common");
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{content.export.title.value}</ModalTitle>
        <ModalDescription>{content.export.description.value}</ModalDescription>
      </ModalHeader>
      <ModalFooter className="flex justify-end gap-2">
        <Button intent="outline" onPress={() => setOpen(false)}>
          {content.modal.cancel.value}
        </Button>
        <ExportConfirmButton slug={list.slug} onSuccess={() => setOpen(false)} />
      </ModalFooter>
    </ModalContent>
  );
}

function ExportConfirmButton({ slug, onSuccess }: { slug: string; onSuccess: () => void }) {
  const content = useIntlayer("common");
  const exportMutation = useMutation(
    orpc.list.export.mutationOptions({
      onError: () => {
        toast.error(content.export.error.value);
      },
    }),
  );

  const handleExport = () => {
    exportMutation.mutate(
      { slug },
      {
        onSuccess: (file) => {
          const url = URL.createObjectURL(file);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
          onSuccess();
        },
      },
    );
  };

  return (
    <Button intent="primary" onPress={handleExport} isPending={exportMutation.isPending}>
      {content.actions.export.value}
    </Button>
  );
}
