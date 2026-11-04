import { parseHexColor, type SetCollectionColorsInput } from "@repo/api/schemas/admin";
import type { IndexedObjekt } from "@repo/lib/types/objekt";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { m } from "@/paraglide/messages";

import { colorChange, type RowColors } from "./colors";
import { CollectionCell, MiniCard } from "./row-cells";

type Listed = IndexedObjekt;
export type Draft = { slug: string; text: string; background: string };

function HexField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const errorId = useId();
  const valid = parseHexColor(value) !== null;
  return (
    <div role="cell" className="flex flex-col gap-1">
      <Input
        aria-label={label}
        aria-invalid={!valid || undefined}
        aria-describedby={valid ? undefined : errorId}
        className="w-28 font-mono"
        spellCheck={false}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {valid ? null : (
        <span id={errorId} className="text-destructive-foreground max-w-36 text-xs text-pretty">
          {m.mod_collections_hex_invalid()}
        </span>
      )}
    </div>
  );
}

export function EditRow({
  collection,
  colors,
  draft,
  saving,
  onDraft,
  onSave,
  onCancel,
}: {
  collection: Listed;
  colors: RowColors;
  draft: Draft;
  saving: boolean;
  onDraft: (draft: Draft) => void;
  onSave: (input: SetCollectionColorsInput) => void;
  onCancel: () => void;
}) {
  const change = colorChange(colors, draft);
  const changed = change !== null && Object.keys(change).length > 0;
  return (
    <>
      <div role="cell">
        <MiniCard
          collection={collection}
          text={parseHexColor(draft.text) ?? colors.text.current}
          background={parseHexColor(draft.background) ?? colors.background.current}
        />
      </div>
      <CollectionCell collection={collection} />
      <HexField
        label={m.mod_collections_text_field({ slug: collection.slug })}
        value={draft.text}
        onChange={(text) => onDraft({ ...draft, text })}
      />
      <HexField
        label={m.mod_collections_background_field({ slug: collection.slug })}
        value={draft.background}
        onChange={(background) => onDraft({ ...draft, background })}
      />
      <div role="cell" />
      <div role="cell" className="flex justify-end gap-1">
        <Button
          size="xs"
          data-control="save"
          disabled={change === null}
          loading={saving}
          onClick={() => {
            if (change === null) return;
            if (changed) onSave({ slug: collection.slug, ...change });
            else onCancel();
          }}
        >
          {m.common_actions_save()}
        </Button>
        <Button size="xs" variant="ghost" onClick={onCancel}>
          {m.common_modal_cancel()}
        </Button>
      </div>
    </>
  );
}
