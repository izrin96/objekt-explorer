import { UserIcon } from "@phosphor-icons/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/** An account with no name of its own is called by its address, in full or as `shortAddress` gives it. */
const ADDRESS_NAME = /^0x(?:[0-9a-f]{40}|[0-9a-f]{4}…[0-9a-f]{4})$/i;

/**
 * A person's avatar: their image, else a plain person placeholder for an account known only by
 * its address, else the first letter of the name. `className` sizes it (`size-9 shrink-0`).
 */
export function PersonAvatar({
  name,
  image,
  className,
}: {
  name: string;
  image: string | null | undefined;
  className?: string;
}) {
  const nameless = !name || ADDRESS_NAME.test(name);
  return (
    <Avatar className={className}>
      {image ? <AvatarImage src={image} alt="" /> : null}
      <AvatarFallback>
        {nameless ? (
          <UserIcon aria-hidden weight="bold" className="size-1/2 opacity-72" />
        ) : (
          name.slice(0, 1).toUpperCase()
        )}
      </AvatarFallback>
    </Avatar>
  );
}
