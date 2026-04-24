import { InfoIcon } from "@phosphor-icons/react/dist/ssr";
import { useIntlayer } from "react-intlayer";

import { parseNickname } from "@/lib/utils";

import { Link } from "./intentui/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "./intentui/tooltip";

export default function UserLink({
  address,
  nickname,
}: {
  address?: string | null;
  nickname?: string | null;
}) {
  const content = useIntlayer("user_link");
  return (
    <div className="inline-flex gap-2">
      {address ? (
        <>
          <Link
            to="/@$nickname"
            params={{
              nickname: nickname || address,
            }}
          >
            {parseNickname(address, nickname)}
          </Link>
          {!nickname && (
            <Tooltip delay={0} closeDelay={0}>
              <TooltipTrigger aria-label={content.preview.value}>
                <InfoIcon size={16} />
              </TooltipTrigger>
              <TooltipContent inverse>{content.nickname_not_available.value}</TooltipContent>
            </Tooltip>
          )}
        </>
      ) : (
        <span className="text-muted-fg font-mono">{content.deleted.value}</span>
      )}
    </div>
  );
}
