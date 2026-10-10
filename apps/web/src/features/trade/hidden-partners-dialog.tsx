import { ArrowClockwiseIcon, EyeIcon, WarningIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Fragment } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { displayNickname } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { useUnhidePartner } from "./actions";
import { hiddenPartnersOptions } from "./queries";

export function HiddenPartnersDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{m.trade_hidden_partners()}</DialogTitle>
          <DialogDescription>{m.trade_hidden_partners_description()}</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <HiddenPartnersList enabled={open} />
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

export function HiddenPartnersList({ enabled }: { enabled: boolean }) {
  const query = useQuery(hiddenPartnersOptions(enabled));
  const unhide = useUnhidePartner();

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    );
  }

  if (query.isError) {
    return (
      <EmptyState
        bordered={false}
        icon={WarningIcon}
        title={m.common_error_loading_data()}
        action={
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <ArrowClockwiseIcon />
            {m.common_error_retry()}
          </Button>
        }
      />
    );
  }

  if (query.data.length === 0) {
    return <EmptyState bordered={false} icon={EyeIcon} title={m.trade_hidden_partners_empty()} />;
  }

  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {query.data.map((partner) => {
        const pending = unhide.isPending && unhide.variables.userId === partner.userId;
        const name = partner.user.name ?? "?";
        return (
          <li key={partner.userId} className="flex items-center gap-3 px-3 py-2">
            <Avatar className="size-8 shrink-0">
              {partner.user.image ? <AvatarImage src={partner.user.image} alt="" /> : null}
              <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-medium break-words">{name}</span>
              {/* only the profiles their discoverable lists show */}
              {partner.profiles.length > 0 ? (
                <span className="text-muted-foreground text-xs break-words">
                  {partner.profiles.map((p, index) => (
                    <Fragment key={p.address}>
                      {index > 0 ? ", " : null}
                      <span className={p.nickname ? undefined : "font-mono"}>
                        {displayNickname(p.address, p.nickname)}
                      </span>
                    </Fragment>
                  ))}
                </span>
              ) : null}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => unhide.mutate({ userId: partner.userId })}
            >
              <EyeIcon />
              {m.trade_unhide()}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
