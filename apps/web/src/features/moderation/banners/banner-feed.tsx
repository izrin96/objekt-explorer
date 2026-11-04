import { PauseIcon, PlayIcon, TrashIcon } from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import { MOD_REASON_MAX_LENGTH } from "@repo/api/schemas/moderation";
import {
  type InfiniteData,
  useMutation,
  useQueryClient,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";

import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { When } from "@/features/moderation/console/when";
import { BannerThumb, bannerThumbFrameClass } from "@/features/profile/banner-thumb";
import { useMediaQuery } from "@/hooks/use-media-query";
import { nicknameParam } from "@/lib/address";
import { orpc } from "@/lib/orpc";
import { errorReason } from "@/lib/orpc-error";
import { refusalText } from "@/lib/refusal";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { bannersOptions } from "./queries";

type BannerPage = Outputs["admin"]["banners"];
type Banner = BannerPage["banners"][number];

const GRID = "grid gap-x-4 gap-y-6 sm:grid-cols-2 xl:grid-cols-3";

const profileName = (banner: Banner) => banner.nickname ?? banner.address;

export function BannerFeed() {
  const query = useSuspenseInfiniteQuery(bannersOptions());
  const [removing, setRemoving] = useState<number | null>(null);
  const banners = query.data.pages.flatMap((page) => page.banners);

  if (banners.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-10 text-center text-sm">
        {m.mod_banners_empty()}
      </p>
    );
  }

  return (
    <>
      <ul className={GRID}>
        {banners.map((banner) => (
          <BannerTile
            key={banner.id}
            banner={banner}
            removing={removing === banner.id}
            onRemove={() => setRemoving(banner.id)}
            onClose={() => setRemoving(null)}
          />
        ))}
      </ul>
      <InfiniteSentinel
        label={m.infinite_query_load_more_aria()}
        hasNextPage={query.hasNextPage}
        isFetchingNextPage={query.isFetchingNextPage}
        isError={query.isFetchNextPageError}
        fetchNextPage={() => void query.fetchNextPage({ cancelRefetch: false })}
      />
    </>
  );
}

export function BannerFeedSkeleton() {
  return (
    <ul className={GRID} aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="flex flex-col gap-2">
          <Skeleton className={cn(bannerThumbFrameClass, "rounded-lg border-0")} />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </li>
      ))}
    </ul>
  );
}

function BannerTile({
  banner,
  removing,
  onRemove,
  onClose,
}: {
  banner: Banner;
  removing: boolean;
  onRemove: () => void;
  onClose: () => void;
}) {
  const removeButton = useRef<HTMLButtonElement>(null);
  const name = profileName(banner);

  return (
    <li className="flex min-w-0 flex-col gap-2">
      {banner.bannerImgType?.startsWith("video") ? (
        <TileVideo banner={banner} name={name} />
      ) : (
        <div className="overflow-hidden rounded-lg border *:border-b-0">
          <BannerThumb bannerImgUrl={banner.bannerImgUrl} bannerImgType={banner.bannerImgType} />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            to="/@{$nickname}"
            params={{ nickname: nicknameParam(banner.address, banner.nickname) }}
            className={cn(
              "truncate text-sm font-medium hover:underline",
              banner.nickname === null && "font-mono",
            )}
          >
            {name}
          </Link>
          <span className="text-muted-foreground text-xs text-pretty">
            {banner.updatedAt ? (
              <When iso={banner.updatedAt} className="tabular-nums" />
            ) : (
              m.mod_banners_time_unknown()
            )}
            {" · "}
            {banner.holder ? (
              <Link
                to="/mod/reports/$userId"
                params={{ userId: banner.holder.userId }}
                className="hover:text-foreground underline-offset-2 hover:underline"
              >
                {m.mod_banners_account({
                  name: banner.holder.identity?.name ?? m.mod_person_gone(),
                })}
              </Link>
            ) : (
              m.mod_banners_no_account()
            )}
          </span>
        </div>
        {banner.canRemove && !removing ? (
          <Button
            ref={removeButton}
            size="xs"
            variant="destructive-outline"
            aria-label={m.mod_banners_remove_label({ profile: name })}
            onClick={onRemove}
          >
            <TrashIcon />
            {m.mod_banners_remove()}
          </Button>
        ) : null}
      </div>
      {removing ? (
        <RemoveBannerForm
          banner={banner}
          onClose={() => {
            onClose();
            // the button comes back on the next render
            requestAnimationFrame(() => removeButton.current?.focus());
          }}
          onRemoved={onClose}
        />
      ) : null}
    </li>
  );
}

/**
 * A video banner plays only while its tile is on screen, so the feed fetches the videos in view
 * rather than every one. Under reduced motion it starts still; Play and Pause hold either way.
 */
function TileVideo({ banner, name }: { banner: Banner; name: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // the server snapshot is `true`, so the server draws every video still
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [choice, setChoice] = useState<boolean | null>(null);
  const playing = choice ?? !reduced;
  const url = banner.bannerImgUrl;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!playing) {
      video.pause();
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void video.play().catch(() => undefined);
      else video.pause();
    });
    observer.observe(video);
    return () => observer.disconnect();
    // a refetch can swap the file under the same tile, which resets the element
  }, [playing, url]);

  return (
    <div className="relative overflow-hidden rounded-lg border">
      <div className="*:border-b-0">
        <BannerThumb bannerImgUrl={url} bannerImgType={banner.bannerImgType} videoRef={videoRef} />
      </div>
      <Button
        size="icon-sm"
        variant="ghost"
        // a dark chip with a white icon reads over any frame, light or dark
        className="absolute end-2 bottom-2 bg-black/64 text-white backdrop-blur-sm hover:bg-black/80 data-pressed:bg-black/80"
        aria-label={
          playing
            ? m.mod_banners_pause_label({ profile: name })
            : m.mod_banners_play_label({ profile: name })
        }
        onClick={() => setChoice(!playing)}
      >
        {playing ? <PauseIcon weight="fill" /> : <PlayIcon weight="fill" />}
      </Button>
    </div>
  );
}

function RemoveBannerForm({
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
