import { Toggle } from "@/components/ui/toggle";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import type { previewRows } from "./add-to-list-source";

/** rows the preview draws before folding the rest into a count */
const PREVIEW_ROWS = 12;

export function PreviewSection({
  rows,
  unpicked,
  onToggle,
  copyCount,
  hint,
}: {
  rows: ReturnType<typeof previewRows>;
  unpicked: ReadonlySet<string>;
  onToggle: (tokenId: string) => void;
  copyCount: { picked: number; total: number } | null;
  hint: string | null;
}) {
  const shown = rows.slice(0, PREVIEW_ROWS);
  const hidden = rows.length - shown.length;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{m.list_add_preview_label()}</span>
        {copyCount && (
          <span className="text-muted-foreground text-xs tabular-nums">
            {m.list_add_copies_count({
              picked: copyCount.picked.toLocaleString(getLocale()),
              total: copyCount.total.toLocaleString(getLocale()),
            })}
          </span>
        )}
      </div>
      <ul className="flex max-h-64 min-w-0 flex-col gap-2 overflow-y-auto rounded-lg border p-2">
        {shown.map(({ objekt, copies }) => (
          <li key={objekt.slug} className="flex min-w-0 items-start gap-2.5">
            <div className="@container w-9 shrink-0">
              <ObjektCard objekt={objekt} image="thumbnail" hideLabel hideSerial />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
              <span className="truncate font-mono text-xs">{objekt.collectionId}</span>
              {copies.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {copies.map((copy) => (
                    <Toggle
                      key={copy.tokenId}
                      size="sm"
                      variant="outline"
                      pressed={!unpicked.has(copy.tokenId)}
                      onPressedChange={() => onToggle(copy.tokenId)}
                      className="not-data-pressed:text-muted-foreground font-mono text-xs tabular-nums not-data-pressed:line-through"
                    >
                      #{copy.serial}
                    </Toggle>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
        {hidden > 0 && (
          <li className="text-muted-foreground text-xs">
            {m.list_add_more_rows({ count: hidden.toLocaleString(getLocale()) })}
          </li>
        )}
      </ul>
      {hint && <span className="text-muted-foreground text-xs text-pretty">{hint}</span>}
    </div>
  );
}
