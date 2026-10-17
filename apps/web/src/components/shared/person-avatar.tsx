import { Identicon } from "@/components/shared/identicon";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** An account with no name of its own is called by its address, which is all that tells it apart when none is known. */
const ADDRESS_NAME = /^0x/i;

/**
 * A person's avatar: their image, else the identicon of their address when it is known (or of
 * the name, when it is itself an address), else the first letter of the name. `className` sizes it (`size-9 shrink-0`).
 */
export function PersonAvatar({
  name,
  image,
  address,
  className,
}: {
  name: string;
  image: string | null | undefined;
  address?: string | null;
  className?: string;
}) {
  const seed = address || (ADDRESS_NAME.test(name) ? name : null);
  if (!image && seed) {
    return <Identicon address={seed} className={cn("rounded-full", className)} />;
  }
  return (
    <Avatar className={className}>
      {image ? <AvatarImage src={image} alt="" /> : null}
      <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}
