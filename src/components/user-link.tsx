import { InfoIcon } from "@phosphor-icons/react/dist/ssr";
import { parseNickname } from "@/lib/utils";
import { Link, Tooltip } from "./ui";

export default function UserLink({ address, nickname }: { address?: string; nickname?: string }) {
  return (
    <div className="inline-flex gap-2">
      {address ? (
        <>
          <Link href={`/@${nickname ?? address}`}>{parseNickname(address, nickname)}</Link>
          {!nickname && (
            <Tooltip delay={0} closeDelay={0}>
              <Tooltip.Trigger aria-label="Preview">
                <InfoIcon size={16} />
              </Tooltip.Trigger>
              <Tooltip.Content inverse>Nickname not available.</Tooltip.Content>
            </Tooltip>
          )}
        </>
      ) : (
        <span>(deleted)</span>
      )}
    </div>
  );
}
