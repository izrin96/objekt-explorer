import { ChatCircleIcon } from "@phosphor-icons/react";
import type { CardInput, ChatTarget } from "@repo/api/schemas/chat";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";

import { Button, type ButtonProps } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/user/hooks";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

import { refusalOf, refusalText } from "./format";
import { invalidateChatLists } from "./queries";

/**
 * Opens the conversation with the target's account, adding `card` as a message. The
 * caller decides whether to show it at all (`messageable`, and never on the viewer's own).
 * `name` makes an icon-only button say whom it messages.
 */
export function MessageButton({
  target,
  card,
  name,
  iconOnly = false,
  labelClassName,
  variant = "outline",
  size,
  className,
}: {
  target: ChatTarget;
  card?: CardInput;
  name?: string;
  iconOnly?: boolean;
  /** e.g. `max-sm:sr-only`, where a row has no room for the word */
  labelClassName?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  const { start, pending } = useStartConversation();
  const label = name ? m.chat_message_name({ name }) : m.chat_message();

  return (
    <Button
      variant={variant}
      size={size ?? (iconOnly ? "icon-sm" : "sm")}
      aria-label={name ? label : undefined}
      title={iconOnly ? label : undefined}
      loading={pending}
      onClick={() => start(target, card)}
      className={className}
    >
      <ChatCircleIcon />
      {iconOnly ? null : <span className={labelClassName}>{m.chat_message()}</span>}
    </Button>
  );
}

/** Opens the conversation with the target's account, for a button or a menu item. */
export function useStartConversation() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { gate, offerLink } = useStartGate();

  const mutation = useMutation(
    orpc.chat.start.mutationOptions({
      onSuccess: ({ id }) => {
        void invalidateChatLists(queryClient);
        void navigate({ to: "/messages/$id", params: { id: String(id) } });
      },
      onError: (error) => {
        const refusal = refusalOf(error);
        if (refusal?.reason === "no_address") return void offerLink();
        toastManager.add({
          type: "error",
          title: refusal ? refusalText(refusal) : m.chat_start_error(),
        });
      },
    }),
  );

  return {
    start: (target: ChatTarget, card?: CardInput) => {
      if (gate()) mutation.mutate({ to: target, card });
    },
    pending: mutation.isPending,
  };
}

/**
 * What starting a conversation needs before any request: a session, and a linked Cosmo
 * profile. `gate` sends the visitor where they can get the missing one and says whether to go on.
 */
export function useStartGate() {
  const { data: current } = useCurrentUser();
  const navigate = useNavigate();
  const href = useLocation({ select: (location) => location.href });

  const offerLink = () =>
    toastManager.add({
      type: "info",
      title: m.chat_refused_no_address(),
      // it carries the only way forward, so it stays until dismissed
      timeout: 0,
      actionProps: {
        children: m.link_link_cosmo(),
        onClick: () => void navigate({ to: "/link" }),
      },
    });

  const gate = () => {
    if (!current) {
      void navigate({ to: "/login", search: { redirect: href } });
      return false;
    }
    if (current.profiles.length === 0) {
      offerLink();
      return false;
    }
    return true;
  };

  return { gate, offerLink };
}
