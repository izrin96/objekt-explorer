import { InfoIcon } from "@phosphor-icons/react/dist/ssr";
import { parseNickname } from "@/lib/utils";
import { Link, Tooltip, TooltipContent, TooltipTrigger } from "./ui";

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
          <Link href={`/@${nickname ?? address}`}>{parseNickname(address, nickname)}</Link>
          {!nickname && (
            <Tooltip delay={0} closeDelay={0}>
              <TooltipTrigger aria-label="Preview">
                <InfoIcon size={16} />
              </TooltipTrigger>
              <TooltipContent inverse>Nickname not available.</TooltipContent>
            </Tooltip>
          )}
        </>
      ) : (
        <span className="font-mono text-muted-fg">(deleted)</span>
      )}
    </div>
  );
}
