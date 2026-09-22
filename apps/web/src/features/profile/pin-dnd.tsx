import type { Announcements, DragStartEvent, DropAnimation } from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createContext, use, useRef, useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const dropAnimation: DropAnimation = {
  duration: 200,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }),
};

/**
 * Mouse: 8px of travel, so a click still opens the drawer and the hover check
 * still selects. The keyboard reorders through the card menu's Move up / Move
 * down instead of a drag.
 *
 * Touch is the awkward one, because the long press is already spent on
 * "select" (`useLongPress`, cancelled by 8px of movement). dnd-kit only offers
 * a delay constraint, which fires on the timer whether or not the finger
 * moved, so a 250ms delay arms the drag before the select:
 *
 * - move inside 250ms → both cancel, the page scrolls;
 * - hold 250ms, then move → the drag is live and the long press has cancelled
 *   itself on the same 8px, so drag wins;
 * - hold still past the long press → the drag is live but has no translation,
 *   the long press fires, and the drop lands where it started, so select wins.
 *
 * The last case would still flash the lifted card, which reads as a drag that
 * did not happen; `moved` holds the overlay back until the first `onDragMove`.
 */
const useDragSensors = () =>
  useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

/** true once the live drag has actually travelled; see `useDragSensors` */
const PinDragStateContext = createContext(false);

export function PinDnd({
  ids,
  onReorder,
  renderOverlay,
  children,
}: {
  /** the pinned token ids in display order; the reorder is committed against these */
  ids: string[];
  onReorder: (ids: string[]) => void;
  renderOverlay: (id: string) => ReactNode;
  children: ReactNode;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [moved, setMoved] = useState(false);
  // dnd-kit calls the announcements mid-gesture, so they read the live value
  // rather than the one this render closed over
  const movedRef = useRef(false);
  const sensors = useDragSensors();

  const at = (id: string) => ({
    position: String(ids.indexOf(id) + 1),
    total: String(ids.length),
  });

  // a drag the user never saw must not be a drag the screen reader heard: on a
  // still touch the gesture is the long press that selects the card
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      movedRef.current ? m.profile_reorder_picked_up(at(String(active.id))) : undefined,
    onDragOver: ({ active, over }) =>
      over && over.id !== active.id ? m.profile_reorder_moved(at(String(over.id))) : undefined,
    onDragEnd: ({ active, over }) => {
      if (!movedRef.current) return undefined;
      return over
        ? m.profile_reorder_dropped(at(String(over.id)))
        : m.profile_reorder_returned(at(String(active.id)));
    },
    onDragCancel: ({ active }) =>
      movedRef.current ? m.profile_reorder_cancelled(at(String(active.id))) : undefined,
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
      accessibility={{ announcements }}
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

export function SortablePin({ id, children }: { id: string; children: ReactNode }) {
  const { listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id,
    animateLayoutChanges: () => false,
  });
  const moved = use(PinDragStateContext);

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
      {children}
    </div>
  );
}
