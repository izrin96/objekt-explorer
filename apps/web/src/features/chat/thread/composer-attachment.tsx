import { XIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import type { Attachment } from "@/features/chat/attachment";
import { CollectionLabel } from "@/features/objekt/objekt-label";
import { m } from "@/paraglide/messages";

export function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
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
