import { Tooltip } from "./ui";
import { IconCircleInfo } from "justd-icons";
import Link from "next/link";

export default function UserLink({
  address,
  nickname,
}: {
  address: string;
  nickname?: string;
}) {
  return (
    <div className="inline-flex gap-2">
      <Link href={`/@${nickname ?? address}`} prefetch={false}>
        {nickname ?? address.substring(0, 6)}
      </Link>

      {!nickname && (
        <Tooltip delay={0} closeDelay={0}>
          <Tooltip.Trigger aria-label="Preview">
            <IconCircleInfo />
          </Tooltip.Trigger>
          <Tooltip.Content>
            Displayed as a wallet address. Nickname not yet available.
          </Tooltip.Content>
        </Tooltip>
      )}
    </div>
  );
}
