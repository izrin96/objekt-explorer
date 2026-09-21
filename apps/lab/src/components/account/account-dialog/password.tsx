import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toastManager } from "@/components/ui/toast";

export function PasswordSection({
  hasPassword,
  onSet,
}: {
  hasPassword: boolean;
  onSet: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && confirm !== next;
  const ready = next.length > 0 && confirm.length > 0 && !mismatch && (!hasPassword || !!current);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs">
        {hasPassword
          ? "Changing it signs out your other devices."
          : "You signed up with a social account, so there is no password yet."}
      </p>

      {hasPassword && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="acct-current">Current password</Label>
          <Input
            id="acct-current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="acct-new">New password</Label>
        <Input
          id="acct-new"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="acct-confirm">Confirm new password</Label>
        <Input
          id="acct-confirm"
          type="password"
          aria-invalid={mismatch}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {mismatch && <span className="text-destructive-foreground text-xs">Does not match</span>}
      </div>

      <div className="flex">
        <Button
          size="sm"
          disabled={!ready}
          onClick={() => {
            setCurrent("");
            setNext("");
            setConfirm("");
            onSet();
            toastManager.add({
              type: "success",
              title: hasPassword ? "Password changed" : "Password set",
            });
          }}
        >
          {hasPassword ? "Change password" : "Set password"}
        </Button>
      </div>
    </div>
  );
}
