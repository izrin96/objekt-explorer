import type { ValidObjekt } from "@repo/lib/types/objekt";

import { ApolloIcon } from "@/components/shared/apollo-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/time";
import { m } from "@/paraglide/messages";

import { isObjektOwned, memberNames } from "../objekt-utils";

/** the attribute list and the outbound links beside the drawer's card */
export function ObjektSummary({ objekt, artistName }: { objekt: ValidObjekt; artistName: string }) {
  const owned = isObjektOwned(objekt);

  const attributes: [string, string][] = [
    [m.objekt_artist(), artistName],
    [m.objekt_member(), memberNames(objekt)],
    [m.objekt_season(), objekt.season],
    [m.objekt_class(), objekt.class],
    [m.objekt_collection_no(), objekt.collectionNo],
    [m.objekt_type(), objekt.onOffline === "offline" ? m.objekt_physical() : m.objekt_digital()],
  ];
  if (owned) attributes.push([m.objekt_serial(), `#${objekt.serial}`]);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] content-start gap-x-4 gap-y-1.5 text-sm">
        {attributes.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono">{value}</dd>
          </div>
        ))}
        {owned && (
          <>
            <dt className="text-muted-foreground">{m.objekt_transferable()}</dt>
            <dd>
              <Badge variant={objekt.transferable ? "success" : "error"} size="sm">
                {objekt.transferable ? m.objekt_yes() : m.objekt_no()}
              </Badge>
            </dd>
            <dt className="text-muted-foreground">{m.objekt_received()}</dt>
            <dd className="font-mono">{formatTimestamp(new Date(objekt.receivedAt))}</dd>
          </>
        )}
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        {/* a drawer tab list that navigates away reads as a trap, so this
            sits with the actions rather than in the tabs */}
        <Button
          variant="outline"
          size="sm"
          render={
            <a href={`https://apollo.cafe/?id=${objekt.slug}`} target="_blank" rel="noreferrer" />
          }
        >
          <ApolloIcon className="size-4" />
          {m.objekt_view_in_apollo()}
        </Button>
      </div>
    </div>
  );
}
