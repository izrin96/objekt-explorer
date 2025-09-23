import type { ButtonProps } from "@/components/ui";

export type ObjektActionProps = {
  handleAction: (open: () => void) => void;
  size?: ButtonProps["size"];
};

export type ObjektActionModalProps = {
  open: boolean;
  setOpen: (val: boolean) => void;
};
