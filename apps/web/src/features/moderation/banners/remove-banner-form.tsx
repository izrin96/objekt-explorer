import { MOD_REASON_MAX_LENGTH } from "@repo/api/schemas/moderation";
import { type InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { errorReason } from "@/lib/orpc-error";
import { refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

import { bannersOptions } from "./queries";
import { type Banner, type BannerPage, profileName } from "./shared";

export function RemoveBannerForm({
  banner,
  onClose,
  onRemoved,
}: {
  banner: Banner;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState(false);
  const ids = { title: useId(), reason: useId(), note: useId() };
  const name = profileName(banner);
  const { queryKey } = bannersOptions();

  const remove = useMutation(
    orpc.admin.removeBanner.mutationOptions({
      onSuccess: () => {
        queryClient.setQueryData<InfiniteData<BannerPage>>(queryKey, (data) =>
          data
            ? {
                ...data,
                pages: data.pages.map((page) => ({
                  ...page,
                  banners: page.banners.filter((row) => row.id !== banner.id),
                })),
              }
            : data,
        );
        toastManager.add({ type: "success", title: m.mod_banners_removed({ profile: name }) });
        onRemoved();
      },
      onError: (error) => {
        // the owner replaced it: show the banner the profile has now
        if (errorReason(error).reason === "admin_banner_changed") {
          void queryClient.invalidateQueries({ queryKey });
        }
      },
    }),
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = reason.trim();
    setMissing(trimmed === "");
    if (trimmed === "") return;
    remove.mutate({ address: banner.address, bannerImgUrl: banner.bannerImgUrl, reason: trimmed });
  };

  return (
    <form
      aria-labelledby={ids.title}
      onSubmit={submit}
      className="border-destructive/32 bg-destructive/4 flex flex-col gap-2 rounded-lg border p-3"
    >
      <p id={ids.title} className="text-sm font-medium text-pretty">
        {m.mod_banners_remove_title({ profile: name })}
      </p>
      <p className="text-muted-foreground text-xs text-pretty">
        {banner.holder ? m.mod_banners_remove_notified() : m.mod_banners_remove_unheld()}
      </p>
      <Label htmlFor={ids.reason} className="sr-only">
        {m.mod_act_reason()}
      </Label>
      <Textarea
        id={ids.reason}
        autoFocus
        value={reason}
        maxLength={MOD_REASON_MAX_LENGTH}
        aria-required
        aria-invalid={missing || undefined}
        aria-describedby={ids.note}
        placeholder={m.mod_banners_reason_placeholder()}
        onChange={(event) => setReason(event.target.value)}
      />
      <p id={ids.note} className="text-muted-foreground text-xs text-pretty">
        {missing ? (
          <span className="text-destructive-foreground">{m.mod_act_reason_required()}</span>
        ) : (
          m.mod_banners_reason_hint()
        )}
      </p>
      <p role="alert" className="text-destructive-foreground text-sm empty:hidden">
        {remove.isError ? refusalText(remove.error) : null}
      </p>
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="destructive" loading={remove.isPending}>
          {m.mod_banners_remove_confirm()}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          {m.common_modal_cancel()}
        </Button>
      </div>
    </form>
  );
}
