import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

/**
 * The room for the toggle is bought with `pe-7` on the *control*: `className`
 * lands on the bordered span, and the span's padding is what moves the inner
 * `<input>`. `tabIndex={-1}` keeps Tab going from the password to Submit.
 */
export function PasswordInput({ className, ...props }: InputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative w-full min-w-0">
      <Input {...props} type={visible ? "text" : "password"} className={cn("pe-7", className)} />
      <button
        type="button"
        tabIndex={-1}
        aria-label={visible ? m.auth_password_hide() : m.auth_password_show()}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 end-0 grid w-8 cursor-pointer place-items-center rounded-e-lg outline-none focus-visible:ring-2"
      >
        {visible ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
      </button>
    </div>
  );
}
