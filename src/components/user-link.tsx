import { InfoIcon } from "@phosphor-icons/react/dist/ssr";
import { Link, Tooltip } from "./ui";

export default function UserLink({ address, nickname }: { address?: string; nickname?: string }) {
  return (
    <div className="inline-flex gap-2">
      {address ? (
        <>
          <Link href={`/@${nickname ?? address}`}>
            {nickname ?? `${address.substring(0, 8)}...`}
          </Link>
          {!nickname && (
            <Tooltip delay={0} closeDelay={0}>
              <Tooltip.Trigger aria-label="Preview">
                <InfoIcon size={16} />
              </Tooltip.Trigger>
              <Tooltip.Content>Nickname not available.</Tooltip.Content>
            </Tooltip>
          )}
        </>
      ) : (
        <span>(deleted)</span>
      )}
    </div>
  );
}
