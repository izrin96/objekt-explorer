import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/intentui/button";
import {
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/intentui/modal";
import { orpc } from "@/lib/orpc/client";
import { m } from "@/paraglide/messages";

type DeleteListModalProps = {
  slug: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function DeleteListModal({ slug, open, setOpen }: DeleteListModalProps) {
  const deleteList = useMutation(
    orpc.list.delete.mutationOptions({
      onSuccess: (_, _v, _o, { client }) => {
        setOpen(false);
        toast.success(m.list_delete_success());
        return client.invalidateQueries({
          queryKey: orpc.user.currentUser.key(),
        });
      },
      onError: () => {
        toast.error(m.list_delete_error());
      },
    }),
  );
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{m.list_delete_title()}</ModalTitle>
        <ModalDescription>{m.list_delete_description()}</ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>{m.common_modal_cancel()}</ModalClose>
        <Button
          intent="danger"
          type="submit"
          isPending={deleteList.isPending}
          onPress={() => deleteList.mutate({ slug })}
        >
          {m.common_actions_continue()}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
