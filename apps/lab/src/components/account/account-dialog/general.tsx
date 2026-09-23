import {
  ArrowCounterClockwiseIcon,
  TrashSimpleIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Account } from "@/store/account";

/** Port of the website's avatar row: upload, or remove with an undo. */
function AvatarField({
  account,
  onChange,
}: {
  account: Account;
  onChange: (next: string | null) => void;
}) {
  const objectUrl = useRef<string | null>(null);
  // the image the Remove button took away, so Undo can put it back
  const [removed, setRemoved] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );

  return (
    <div className="flex flex-col gap-2">
      <Label>Profile picture</Label>
      <div className="flex items-center gap-3">
        <Avatar className="size-14">
          {account.image && <AvatarImage src={account.image} alt="" />}
          <AvatarFallback className="bg-linear-to-br from-[#d8b4a0] to-[#8c5a4a]" />
        </Avatar>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            render={<label htmlFor="acct-avatar" className="cursor-pointer" />}
          >
            <UploadSimpleIcon />
            Upload
          </Button>
          <input
            id="acct-avatar"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
              const url = URL.createObjectURL(file);
              objectUrl.current = url;
              onChange(url);
            }}
          />
          {account.image === null && removed !== null ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onChange(removed);
                setRemoved(null);
              }}
            >
              <ArrowCounterClockwiseIcon />
              Undo
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={!account.image}
              onClick={() => {
                setRemoved(account.image);
                onChange(null);
              }}
            >
              <TrashSimpleIcon />
              Remove
            </Button>
          )}
        </div>
      </div>
      <span className="text-muted-foreground text-xs">
        Pulled from your linked account, or upload one of your own.
      </span>
    </div>
  );
}

export function GeneralSection({
  draft,
  onChange,
}: {
  draft: Account;
  onChange: (next: Account) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="acct-name">Display name</Label>
        <Input
          id="acct-name"
          required
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
        />
      </div>

      <AvatarField account={draft} onChange={(image) => onChange({ ...draft, image })} />

      <Label className="flex items-center justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          Show socials on profile
          <span className="text-muted-foreground text-xs font-normal">
            Discord and X handles next to your nickname
          </span>
        </span>
        <Switch
          checked={draft.showSocial}
          onCheckedChange={(checked) => onChange({ ...draft, showSocial: checked })}
        />
      </Label>
    </div>
  );
}
