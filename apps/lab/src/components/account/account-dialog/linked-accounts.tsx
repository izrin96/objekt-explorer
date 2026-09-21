import {
  ArrowsClockwiseIcon,
  DiscordLogoIcon,
  LinkBreakIcon,
  LinkIcon,
  XLogoIcon,
} from "@phosphor-icons/react";

import { notImplemented } from "@/components/shared/not-implemented";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";

export type Provider = "discord" | "x";

const PROVIDER_LABEL: Record<Provider, string> = { discord: "Discord", x: "X" };

const PROVIDER_ICON: Record<Provider, React.ReactElement> = {
  discord: <DiscordLogoIcon weight="fill" className="text-discord size-4" />,
  x: <XLogoIcon weight="fill" className="size-4" />,
};

/** Port of `auth/account/link-account.tsx`: one row per provider. */
export function LinkedAccountRow({
  provider,
  handle,
  onChange,
}: {
  provider: Provider;
  handle: string | null;
  onChange: (handle: string | null) => void;
}) {
  const label = PROVIDER_LABEL[provider];

  if (handle === null) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm">
          {PROVIDER_ICON[provider]}
          {label}
        </span>
        <Button
          variant="outline"
          size="xs"
          onClick={() => {
            onChange(provider === "discord" ? ".izrin96" : "izrin96_");
            toastManager.add({ type: "success", title: `Linked ${label}` });
          }}
        >
          <LinkIcon />
          Link
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2 text-sm">
        {PROVIDER_ICON[provider]}
        {label}
        <span className="text-muted-foreground truncate font-mono text-xs">{handle}</span>
      </span>
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="xs"
          onClick={() => notImplemented({ title: `Pulled your ${label} profile` })}
        >
          <ArrowsClockwiseIcon />
          Refresh
        </Button>
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="destructive-outline" size="xs" />}>
            <LinkBreakIcon />
            Unlink
          </AlertDialogTrigger>
          <AlertDialogPopup className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Unlink {label}?</AlertDialogTitle>
              <AlertDialogDescription>
                You will no longer be able to sign in with {label}, and the handle comes off your
                profile.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
              <AlertDialogClose
                render={<Button variant="destructive" />}
                onClick={() => {
                  onChange(null);
                  toastManager.add({ type: "info", title: `Unlinked ${label}` });
                }}
              >
                Unlink
              </AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      </div>
    </div>
  );
}
