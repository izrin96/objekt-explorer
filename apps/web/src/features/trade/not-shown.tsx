import { Button } from "@/components/ui/button";
import { m } from "@/paraglide/messages";

export function NotShown({
  notShown,
  onShowHidden,
}: {
  notShown: { notOwned: number; notTransferable: number; hidden: number; blocked: number };
  onShowHidden: () => void;
}) {
  const parts = [
    notShown.notOwned > 0 ? m.trade_not_shown_not_owned({ count: notShown.notOwned }) : null,
    notShown.notTransferable > 0
      ? m.trade_not_shown_not_transferable({ count: notShown.notTransferable })
      : null,
    notShown.hidden > 0 ? m.trade_not_shown_hidden({ count: notShown.hidden }) : null,
    notShown.blocked > 0 ? m.trade_not_shown_blocked({ count: notShown.blocked }) : null,
  ].filter((part) => part !== null);

  if (parts.length === 0) return null;

  return (
    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-dashed px-4 py-2.5 text-sm">
      <p className="text-pretty tabular-nums">
        <span className="text-foreground font-medium">{m.trade_not_shown()}</span>{" "}
        {parts.join(" · ")}
      </p>
      {notShown.hidden > 0 ? (
        <Button variant="ghost" size="sm" onClick={onShowHidden}>
          {m.trade_hidden_partners()}
        </Button>
      ) : null}
    </div>
  );
}
