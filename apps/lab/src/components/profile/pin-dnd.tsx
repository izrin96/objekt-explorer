import type { Announcements, DragStartEvent, DropAnimation } from "@dnd-kit/core";
import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixIcon } from "@phosphor-icons/react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { createContext, use, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Drag-to-reorder for the Collection tab's pinned shelf. Ported from
 * `apps/website/src/components/objekt/pin-dnd.tsx`, with the website's
 * hard-won rules kept: nothing reorders during `onDragOver` (a DOM reorder
 * mid-drag kills the shift animation), the new order is committed once in
 * `onDragEnd` as plain React state in the same commit as dnd-kit's cleanup,
 * and the lifted card is a `DragOverlay` rather than the source node.
 *
 * Two things are the lab's own:
 *
 * - **A grab handle.** The website spreads `listeners` on a bare wrapper and
 *   has no keyboard drag at all. Here the card body is already
 *   `role="button"` (it opens the drawer), and a second `role="button"` around
 *   it would make the card's own controls presentational children. So the
 *   keyboard activator is a real `<button>` in the card's overlay slot — it
 *   carries dnd-kit's `attributes` (`aria-roledescription="sortable"`,
 *   `aria-describedby` pointing at the instructions) and its `onKeyDown`,
 *   while the pointer `listeners` stay on the wrapper so the whole card is
 *   still draggable by mouse or finger.
 * - **`moved`.** See `useDragSensors` below.
 */

const dropAnimation: DropAnimation = {
  duration: 200,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
};

/**
 * Mouse: 8px of travel, so a click still opens the drawer and the hover check
 * still selects. Keyboard: Space/Enter on the handle, arrows to move.
 *
 * Touch is the interesting one, because the long press is already spent on
 * "select" (`useLongPress`, 400ms, cancelled by 8px of movement). dnd-kit
 * only offers a delay constraint, which fires on the timer whether or not the
 * finger moved, so a 250ms delay arms the drag *before* the 400ms select. The
 * split:
 *
 * - move inside 250ms → both cancel, the page scrolls;
 * - hold 250ms, then move → the drag is live and the long press has already
 *   cancelled itself on the same 8px, so **drag wins**;
 * - hold still past 400ms → the drag is live but has no translation, the long
 *   press fires, and the drop lands on the card it started on, so **select
 *   wins** and the reorder is a no-op.
 *
 * The last case would still flash the lifted card for 150ms, which reads as a
 * drag that did not happen. `moved` is the fix: the overlay and the source
 * card's dimming wait for the first `onDragMove`, so a still finger sees
 * nothing at all. A mouse drag has already travelled its 8px by the time it
 * starts, so it skips the wait.
 */
const useDragSensors = () =>
  useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

/** true once the live drag has actually travelled; see `useDragSensors` */
const PinDragStateContext = createContext(false);

function position(ids: readonly string[], id: string): string {
  return `position ${ids.indexOf(id) + 1} of ${ids.length}`;
}

interface PinDndProps {
  /** the pinned ids in display order; the reorder is committed against these */
  ids: string[];
  onReorder: (ids: string[]) => void;
  /** the lifted card, drawn into the overlay */
  renderOverlay: (id: string) => ReactNode;
  children: ReactNode;
}

export function PinDnd({ ids, onReorder, renderOverlay, children }: PinDndProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [moved, setMoved] = useState(false);
  // the announcements are built once per render, but dnd-kit calls them mid-
  // gesture, so they read the live value rather than this render's `moved`
  const movedRef = useRef(false);
  const sensors = useDragSensors();

  // A drag the user never saw must not be a drag the screen reader heard: on a
  // still touch the gesture is the long press that selects the card, so nothing
  // is said until the finger actually moves.
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      movedRef.current
        ? `Picked up pinned objekt at ${position(ids, String(active.id))}.`
        : undefined,
    onDragOver: ({ active, over }) =>
      over && over.id !== active.id
        ? `Pinned objekt moved to ${position(ids, String(over.id))}.`
        : undefined,
    onDragEnd: ({ active, over }) => {
      if (!movedRef.current) return undefined;
      return over
        ? `Pinned objekt dropped at ${position(ids, String(over.id))}.`
        : `Pinned objekt returned to ${position(ids, String(active.id))}.`;
    },
    onDragCancel: ({ active }) =>
      movedRef.current
        ? `Reordering cancelled. Pinned objekt stays at ${position(ids, String(active.id))}.`
        : undefined,
  };

  function setMovedNow(value: boolean) {
    movedRef.current = value;
    setMoved(value);
  }

  function start(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    // a mouse drag only starts after 8px of travel, so it is already "moved";
    // a touch drag starts on a timer and has to wait for a real move
    setMovedNow(event.activatorEvent.type !== "touchstart");
  }

  function finish() {
    setActiveId(null);
    setMovedNow(false);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "Press space or enter to start reordering this pinned objekt. Use the arrow keys to move it, space or enter to drop it, escape to cancel.",
        },
      }}
      onDragStart={start}
      onDragMove={() => setMovedNow(true)}
      onDragEnd={(event) => {
        const { active, over } = event;
        if (over && over.id !== active.id) {
          const from = ids.indexOf(String(active.id));
          const to = ids.indexOf(String(over.id));
          // committed here and nowhere else: reordering during onDragOver is
          // what kills the shift animation
          if (from !== -1 && to !== -1) onReorder(arrayMove(ids, from, to));
        }
        finish();
      }}
      onDragCancel={finish}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <PinDragStateContext value={moved}>{children}</PinDragStateContext>
      </SortableContext>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeId !== null && moved ? (
          <div className="rounded-photocard scale-103 shadow-2xl shadow-black/40">
            {renderOverlay(activeId)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface SortablePinProps {
  id: string;
  /** takes the handle to render into `ObjektCard`'s overlay slot */
  children: (handle: ReactNode) => ReactNode;
}

export function SortablePin({ id, children }: SortablePinProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    isDragging,
    transform,
    transition,
  } = useSortable({ id, animateLayoutChanges: () => false });
  const moved = use(PinDragStateContext);

  const handle = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      aria-label="Reorder pinned objekt"
      // no `stopPropagation` here: the card body ignores keys whose target is
      // not itself, and stopping the synthetic event would also stop the
      // native one before dnd-kit's document listener sees the arrow keys
      onKeyDown={(event: ReactKeyboardEvent<HTMLButtonElement>) => listeners?.onKeyDown?.(event)}
      onClick={(event) => event.stopPropagation()}
      className="relative z-10 grid size-[15cqi] cursor-grab place-items-center rounded-full bg-[rgba(10,12,16,.72)] text-white backdrop-blur-sm outline-none focus-visible:ring-2 focus-visible:ring-white active:cursor-grabbing [&>svg]:size-[8.5cqi]"
    >
      <DotsSixIcon weight="bold" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
      }}
      className={cn("touch-manipulation", isDragging && moved && "opacity-50")}
    >
      {children(handle)}
    </div>
  );
}
