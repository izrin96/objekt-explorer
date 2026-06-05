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

export type RemoveLinkModalProps = {
  address: string;
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function RemoveLinkModal({ address, open, setOpen }: RemoveLinkModalProps) {
  const removeLink = useMutation(
    orpc.cosmoLink.removeLink.mutationOptions({
      onSuccess: (_, _v, _o, { client }) => {
        setOpen(false);
        toast.success(m.link_unlink_success());
        void client.invalidateQueries({
          queryKey: orpc.user.currentUser.key(),
        });
      },
      onError: () => {
        toast.error(m.link_unlink_error());
      },
    }),
  );
  return (
    <ModalContent isOpen={open} onOpenChange={setOpen} role="alertdialog">
      <ModalHeader>
        <ModalTitle>{m.link_unlink_title()}</ModalTitle>
        <ModalDescription>{m.link_unlink_description()}</ModalDescription>
      </ModalHeader>
      <ModalFooter>
        <ModalClose>{m.common_modal_cancel()}</ModalClose>
        <Button
          intent="danger"
          type="submit"
          isPending={removeLink.isPending}
          onPress={() => removeLink.mutate(address)}
        >
          {m.link_unlink_submit()}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
