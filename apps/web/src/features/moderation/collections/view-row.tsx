import type { Outputs } from "@repo/api";
import type { IndexedObjekt } from "@repo/lib/types/objekt";

import { Button } from "@/components/ui/button";
import { When } from "@/features/moderation/console/when";
import { m } from "@/paraglide/messages";

import type { ColorState, RowColors } from "./colors";
import { CollectionCell, MiniCard } from "./row-cells";

type AdminData = Outputs["admin"]["collectionOverrides"];
type OverrideRow = AdminData["overrides"][number];
type Listed = IndexedObjekt;
export type ColorField = "text" | "background";

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="size-3 shrink-0 rounded-xs border"
      style={{ backgroundColor: color }}
    />
  );
}

function ColorCell({
  field,
  state,
  resetLabel,
  busy,
  onReset,
}: {
  field: ColorField;
  state: ColorState;
  resetLabel: string;
  busy: boolean;
  onReset: () => void;
}) {
  return (
    <div role="cell" className="flex flex-col items-start gap-0.5">
      <span className="flex items-center gap-1.5 font-mono text-xs">
        <Swatch color={state.current} />
        {state.current}
      </span>
      {state.overridden ? (
        <span className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
          <Swatch color={state.source} />
          <span className="sr-only">{m.mod_collections_source_value({ color: state.source })}</span>
          <s aria-hidden>{state.source}</s>
          <Button
            size="xs"
            variant="ghost"
            data-control={`reset-${field}`}
            disabled={busy}
            aria-label={resetLabel}
            onClick={onReset}
          >
            {m.mod_collections_reset()}
          </Button>
        </span>
      ) : null}
    </div>
  );
}

export function ViewRow({
  collection,
  colors,
  override,
  busy,
  onEdit,
  onReset,
}: {
  collection: Listed;
  colors: RowColors;
  override: OverrideRow | undefined;
  busy: boolean;
  onEdit: () => void;
  onReset: (field: ColorField) => void;
}) {
  return (
    <>
      <div role="cell">
        <MiniCard
          collection={collection}
          text={colors.text.current}
          background={colors.background.current}
        />
      </div>
      <CollectionCell collection={collection} />
      <ColorCell
        field="text"
        state={colors.text}
        busy={busy}
        resetLabel={m.mod_collections_reset_text({ slug: collection.slug })}
        onReset={() => onReset("text")}
      />
      <ColorCell
        field="background"
        state={colors.background}
        busy={busy}
        resetLabel={m.mod_collections_reset_background({ slug: collection.slug })}
        onReset={() => onReset("background")}
      />
      <div role="cell" className="text-muted-foreground text-xs text-pretty">
        {override ? (
          <>
            {override.updatedBy?.identity?.name ? `${override.updatedBy.identity.name} · ` : null}
            <When iso={override.updatedAt} className="tabular-nums" />
          </>
        ) : (
          m.mod_collections_source()
        )}
      </div>
      <div role="cell" className="flex justify-end">
        <Button
          size="xs"
          variant="outline"
          data-control="edit"
          aria-label={m.mod_collections_edit_label({ slug: collection.slug })}
          onClick={onEdit}
        >
          {m.mod_collections_edit()}
        </Button>
      </div>
    </>
  );
}
