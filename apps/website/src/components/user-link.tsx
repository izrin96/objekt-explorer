import { InfoIcon } from "@phosphor-icons/react/dist/ssr";

import { parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Link } from "./intentui/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "./intentui/tooltip";

export default function UserLink({
  address,
  nickname,
}: {
  address?: string | null;
  nickname?: string | null;
}) {
  return (
    <div className="inline-flex gap-2">
      {address ? (
        <>
          <Link
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
