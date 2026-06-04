import { LinkIcon } from "@heroicons/react/24/outline";

import type { PublicList } from "@/lib/universal/list";
import { parseNickname } from "@/lib/utils";

import { Badge } from "./badge";
import { ListTypeBadge } from "./list-type-badge";

export function ListLabel({ list }: { list: PublicList }) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-x-1">
        {list.name}
        {["have", "want"].includes(list.listTypeNew) && (
          <ListTypeBadge className="text-xxs/3" variant="solid" type={list.listTypeNew} />
        )}
        {list.listTypeNew === "sale" && (
          <Badge className="bg-secondary text-fg text-xxs/3">{list.currency}</Badge>
        )}
      </div>
      <div className="inline-flex items-center gap-x-1">
        {list.profile && (
          <>
            <span className="text-muted-fg text-xs">
              {parseNickname(list.profile.address, list.profile.nickname)}
            </span>
            {list.isProfileBind && <LinkIcon className="size-3" />}
          </>
        )}
      </div>
    </div>
  );
}
