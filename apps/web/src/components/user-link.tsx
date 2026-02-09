import { InfoIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";

import { parseNickname } from "@/lib/utils";

import { Link } from "./ui/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export default function UserLink({
  address,
  nickname,
}: {
  address?: string | null;
  nickname?: string | null;
}) {
  const t = useTranslations("user_link");
  return (
    <div className="inline-flex gap-2">
      {address ? (
        <>
          <Link href={`/@${nickname ?? address}`}>{parseNickname(address, nickname)}</Link>
          {!nickname && (
            <Tooltip delay={0} closeDelay={0}>
              <TooltipTrigger aria-label={t("preview")}>
                <InfoIcon size={16} />
              </TooltipTrigger>
              <TooltipContent inverse>{t("nickname_not_available")}</TooltipContent>
            </Tooltip>
          )}
        </>
      ) : (
        <span className="text-muted-fg font-mono">{t("deleted")}</span>
      )}
    </div>
  );
}
