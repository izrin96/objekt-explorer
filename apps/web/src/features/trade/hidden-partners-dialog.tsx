import { ArrowClockwiseIcon, EyeIcon, WarningIcon } from "@phosphor-icons/react";
import { type UseQueryResult, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Fragment, type ReactNode, useId } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PersonAvatar } from "@/components/shared/person-avatar";
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

import { useUnhidePartner, useUnhidePost } from "./actions";
import { hiddenPartnersOptions, hiddenPostsOptions } from "./queries";

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
          <DialogTitle className="font-display">{m.trade_hidden()}</DialogTitle>
          <DialogDescription>{m.trade_hidden_description()}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-5">
          <HiddenGroup title={m.trade_hidden_partners()}>
            <HiddenPartnersList enabled={open} />
          </HiddenGroup>
          <HiddenGroup title={m.trade_hidden_posts()}>
            <HiddenPostsList enabled={open} />
          </HiddenGroup>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

/** One titled list of the Hidden dialog and Account's Hidden page. */
export function HiddenGroup({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-sm font-medium">
        {title}
      </h3>
      {children}
    </section>
  );
}

/** What a hidden list shows while it loads, fails or is empty; null once it has rows. */
function hiddenFallback(
  query: UseQueryResult<unknown[]>,
  empty: { title: string; hint: string },
): ReactNode {
  if (query.isPending) {
    return (
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
    );
  }

  if (query.isError && !query.data) {
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
    return <EmptyState bordered={false} icon={EyeIcon} title={empty.title} hint={empty.hint} />;
  }
  return null;
}

export function HiddenPartnersList({ enabled }: { enabled: boolean }) {
  const query = useQuery(hiddenPartnersOptions(enabled));
  const unhide = useUnhidePartner();

  const fallback = hiddenFallback(query, {
    title: m.trade_hidden_partners_empty(),
    hint: m.trade_hidden_partners_empty_hint(),
  });
  if (fallback !== null || !query.data) return fallback;

  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {query.data.map((partner) => {
        const pending = unhide.isPending && unhide.variables.userId === partner.userId;
        const name = partner.user.name ?? "?";
        return (
          <li key={partner.userId} className="flex items-center gap-3 px-3 py-2">
            <PersonAvatar name={name} image={partner.user.image} className="size-8 shrink-0" />
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

export function HiddenPostsList({ enabled }: { enabled: boolean }) {
  const query = useQuery(hiddenPostsOptions(enabled));
  const unhide = useUnhidePost();

  const fallback = hiddenFallback(query, {
    title: m.trade_hidden_posts_empty(),
    hint: m.trade_hidden_posts_empty_hint(),
  });
  if (fallback !== null || !query.data) return fallback;

  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {query.data.map((post) => {
        const pending = unhide.isPending && unhide.variables.listId === post.listId;
        const name = post.user.name ?? "?";
        const title = post.names.join(" · ");
        return (
          <li key={post.listId} className="flex items-center gap-3 px-3 py-2">
            <PersonAvatar name={name} image={post.user.image} className="size-8 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col">
              {post.handle ? (
                <Link
                  to="/trade/@{$handle}/$slug"
                  params={{ handle: post.handle, slug: post.slug }}
                  // a post page's loader reads the row against the feed's rate limit
                  preload={false}
                  className="text-sm font-medium break-words hover:underline"
                >
                  {title}
                </Link>
              ) : (
                <span className="text-sm font-medium break-words">{title}</span>
              )}
              <span className="text-muted-foreground text-xs break-words">
                {post.profile ? (
                  <span className={post.profile.nickname ? undefined : "font-mono"}>
                    {displayNickname(post.profile.address, post.profile.nickname)}
                  </span>
                ) : (
                  name
                )}
              </span>
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => unhide.mutate({ listId: post.listId })}
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
