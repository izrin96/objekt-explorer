import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A password `Input` with a show/hide toggle. The toggle cannot be a child of
 * cnippet's `Input` — it renders `<span data-slot=input-control>{control}</span>`
 * and takes no children — so the button is absolutely positioned against a
 * wrapper of our own, and the room for it is bought with `pe-7` on the
 * *control*: `className` lands on that bordered span, and the span's padding is
 * what moves the inner `<input>`, which keeps its own 11px either way.
 *
 * The button is `tabIndex={-1}`: it is a view toggle, not a step in the form,
 * and Tab should go from the password to Submit the way it does on the website.
 */
export function PasswordInput({ className, ...props }: InputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative w-full min-w-0">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pe-7", className)} />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 end-0 grid w-8 cursor-pointer place-items-center rounded-e-lg outline-none focus-visible:ring-2"
      >
        {visible ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    </div>
  );
}
