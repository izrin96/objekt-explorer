import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The offer page's grid. From `lg`: the title over a sticky column (the top-up, the note, Sending
 * as, the hint, Cancel and Send) beside the main area (the status line, then both sides). Below
 * `lg`, one column in reading order with the hint and the buttons in a bar at the bottom.
 *
 * The title and the status line are the caller's and stay mounted while `BuilderBody` changes
 * from placeholders to the form, so the one status region is never replaced.
 */
export function BuilderGrid({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-8 lg:gap-y-5">
      {children}
    </div>
  );
}

export function BuilderTitle({ children }: { children: ReactNode }) {
  return <div className="min-w-0 lg:col-start-1 lg:row-start-1">{children}</div>;
}

/** Placement for the caller's status region, right above the sides. */
export const STATUS_AREA = "min-w-0 lg:col-start-2 lg:row-start-1 lg:self-end";

export function BuilderBody({
  status,
  sides,
  details,
  hint,
  cancel,
  send,
  picker,
}: {
  /** a status region sits above the sides; without one the sides start beside the title */
  status: boolean;
  sides: ReactNode;
  /** the top-up, the note, Sending as and the send error */
  details?: ReactNode;
  hint?: ReactNode;
  cancel: ReactNode;
  send?: ReactNode;
  /** the picker sheet, which portals */
  picker?: ReactNode;
}) {
  return (
    <>
      <div
        className={cn(
          "flex min-w-0 flex-col gap-4 lg:col-start-2",
          status ? "lg:row-start-2" : "lg:row-span-2 lg:row-start-1",
        )}
      >
        {sides}
      </div>
      {/* `contents` below `lg`, so the bar is a child of the page's column and sticks across it */}
      <div className="contents lg:sticky lg:top-20 lg:col-start-1 lg:row-start-2 lg:flex lg:min-w-0 lg:flex-col lg:gap-5">
        {details}
        {/* -mx-5 -mb-10 undo PageMain's px-5 pb-10, so the phone bar spans the screen and sits flush */}
        <div className="bg-background sticky bottom-0 z-10 -mx-5 -mb-10 flex flex-col gap-2 border-t px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+--spacing(4))] lg:static lg:m-0 lg:border-0 lg:bg-transparent lg:p-0">
          {hint}
          <div className="flex items-center gap-2">
            {cancel}
            {send}
          </div>
        </div>
      </div>
      {picker}
    </>
  );
}
