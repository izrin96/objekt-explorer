import { useMutation } from "@tanstack/react-query";
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
import type { PublicList } from "@/lib/universal/list";
import { m } from "@/paraglide/messages";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
  list: PublicList;
};

export function ExportListModal({ open, setOpen, list }: Props) {
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{m.common_export_title()}</ModalTitle>
        <ModalDescription>{m.common_export_description()}</ModalDescription>
      </ModalHeader>
      <ModalFooter className="flex justify-end gap-2">
        <Button intent="outline" onPress={() => setOpen(false)}>
          {m.common_modal_cancel()}
        </Button>
        <ExportConfirmButton slug={list.slug} onSuccess={() => setOpen(false)} />
      </ModalFooter>
    </ModalContent>
  );
}

function ExportConfirmButton({ slug, onSuccess }: { slug: string; onSuccess: () => void }) {
  const exportMutation = useMutation(
    orpc.list.export.mutationOptions({
      onError: () => {
        toast.error(m.common_export_error());
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
      {m.common_actions_export()}
    </Button>
  );
}
