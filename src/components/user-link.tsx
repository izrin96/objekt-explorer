import { Tooltip, Link } from "./ui";
import { InfoIcon } from "lucide-react";

export default function UserLink({
  address,
  nickname,
}: {
  address: string;
  nickname?: string;
}) {
  return (
    <div className="inline-flex gap-2">
      {address ? (
        <>
          <Link href={`/@${nickname ?? address}`}>
            {nickname ?? address.substring(0, 6)}
          </Link>
          {!nickname && (
            <Tooltip delay={0} closeDelay={0}>
              <Tooltip.Trigger aria-label="Preview">
                <InfoIcon className="size-3.5" />
              </Tooltip.Trigger>
              <Tooltip.Content>
                Displayed as a wallet address. Nickname not yet available.
              </Tooltip.Content>
            </Tooltip>
          )}
        </>
      ) : (
        <span>(deleted)</span>
      )}
    </div>
  );
}
