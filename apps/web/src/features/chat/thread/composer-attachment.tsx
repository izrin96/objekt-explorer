import { XIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { Button } from "@/components/ui/button";
import type { Attachment } from "@/features/chat/attachment";
import { CollectionLabel } from "@/features/objekt/objekt-label";
import { m } from "@/paraglide/messages";

import { PostCardMessage } from "./post-card-message";

export function AttachmentChip({
  attachment,
  onRemove,
  onOpen,
  onPickObjekts,
}: {
  attachment: Attachment;
  onRemove: () => void;
  onOpen: (objekt: ValidObjekt) => void;
  onPickObjekts: () => void;
}) {
  if (attachment.kind === "post") {
    return (
      <div className="flex min-w-0 flex-col items-start gap-1.5">
        <PostCardMessage
          view={attachment.view}
          mine
          collections={attachment.collections}
          onOpen={onOpen}
          action={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={m.chat_attach_remove_post()}
              onClick={onRemove}
            >
              <XIcon />
            </Button>
          }
        />
        <Button variant="outline" size="xs" onClick={onPickObjekts}>
          {m.chat_attach_pick_objekts()}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-secondary/60 flex items-center gap-2 self-start rounded-lg border py-1 ps-1 pe-1">
      <img
        src={attachment.objekt.thumbnailImage}
        alt=""
        className="h-10 w-7 shrink-0 rounded object-cover"
      />
      <span className="min-w-0 text-sm">
        <span className="font-medium">
          <CollectionLabel slug={attachment.objekt.slug} collection={attachment.objekt} />
        </span>
        {attachment.listName ? (
          <span className="text-muted-foreground"> · {attachment.listName}</span>
        ) : null}
      </span>
      <Button variant="ghost" size="icon-sm" aria-label={m.chat_attach_remove()} onClick={onRemove}>
        <XIcon />
      </Button>
    </div>
  );
}
