import { InfoIcon } from "@phosphor-icons/react/dist/ssr";

import { Link } from "@/components/intentui/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/intentui/tooltip";
import { cn, parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export default function UserLink({
  address,
  nickname,
  className,
}: {
  address?: string | null;
  nickname?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 gap-2", className)}>
      {address ? (
        <>
          <Link
            className="min-w-0 truncate"
            to="/@{$nickname}"
            params={{
              nickname: nickname || address.toLowerCase(),
            }}
          >
            {parseNickname(address, nickname)}
          </Link>
          {!nickname && (
            <Tooltip delay={0} closeDelay={0}>
              <TooltipTrigger aria-label={m.user_link_preview()}>
                <InfoIcon size={16} />
              </TooltipTrigger>
              <TooltipContent inverse>{m.user_link_nickname_not_available()}</TooltipContent>
            </Tooltip>
          )}
        </>
      ) : (
        <span className="text-muted-fg font-mono">{m.user_link_deleted()}</span>
      )}
    </div>
  );
}
