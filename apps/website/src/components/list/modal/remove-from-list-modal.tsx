import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/intentui/button";
import {
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/intentui/modal";
import { useRemoveFromList } from "@/hooks/actions/remove-from-list";
import { useListTarget } from "@/hooks/use-list-target";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { m } from "@/paraglide/messages";

export function RemoveFromListModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (val: boolean) => void;
}) {
  const target = useListTarget()!;
  const selected = useObjektSelect(useShallow((a) => a.getSelected()));
  const removeObjektsFromList = useRemoveFromList();
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{m.list_manage_objekt_remove_title()}</ModalTitle>
        <ModalDescription>{m.list_manage_objekt_remove_description()}</ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>{m.common_modal_cancel()}</ModalClose>

        <Button
          intent="danger"
          type="submit"
          isPending={removeObjektsFromList.isPending}
          onPress={() => {
            removeObjektsFromList.mutate(
              {
                slug: target.slug,
                entryIds: selected.map((a) => Number(a.id)),
              },
              {
                onSuccess: () => {
                  setOpen(false);
                },
              },
            );
          }}
        >
          {m.common_actions_continue()}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
