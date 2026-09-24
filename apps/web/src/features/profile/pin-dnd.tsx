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
import { useState } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const dropDuration = 200;
const dropEasing = "cubic-bezier(0.18, 0.67, 0.6, 1.22)";
const dropSideEffects = defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } });

const dropAnimation: DropAnimation = {
  duration: dropDuration,
  easing: dropEasing,
  // dnd-kit animates only the overlay's own transform, so the lift's tilt and
  // scale on the inner wrapper settle alongside it rather than snapping at the end
  sideEffects: (params) => {
    params.dragOverlay.node.firstElementChild?.firstElementChild?.animate(
      [{ rotate: "0deg", scale: "1" }],
      {
        duration: dropDuration,
        easing: dropEasing,
        fill: "forwards",
      },
    );
    return dropSideEffects(params);
  },
};

/**
 * Mouse: 8px of travel, so a click still opens the drawer and the hover check
 * still selects. The keyboard reorders through the card menu's Move up / Move
 * down instead of a drag.
 *
 * Touch: a pin's long press is the drag, not a select (the Select button is
 * the way into select mode there), so a 250ms hold lifts the card and moving
 * inside it scrolls the page instead.
 */
const useDragSensors = () =>
  useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

type PinDndProps = {
  /** the pinned token ids in display order; the reorder is committed against these */
  ids: string[];
  onReorder: (ids: string[]) => void;
  renderOverlay: (id: string) => ReactNode;
  /** a grid nobody may reorder renders its children with no drag context at all */
  disabled?: boolean;
  children: ReactNode;
};

export function PinDnd({ disabled, ...props }: PinDndProps) {
  if (disabled) return props.children;
  return <PinDragProvider {...props} />;
}

function PinDragProvider({
  ids,
  onReorder,
  renderOverlay,
  children,
}: Omit<PinDndProps, "disabled">) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useDragSensors();

  const at = (id: string) => ({
    position: String(ids.indexOf(id) + 1),
    total: String(ids.length),
  });

  const announcements: Announcements = {
    onDragStart: ({ active }) => m.profile_reorder_picked_up(at(String(active.id))),
    onDragOver: ({ active, over }) =>
      over && over.id !== active.id ? m.profile_reorder_moved(at(String(over.id))) : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? m.profile_reorder_dropped(at(String(over.id)))
        : m.profile_reorder_returned(at(String(active.id))),
    onDragCancel: ({ active }) => m.profile_reorder_cancelled(at(String(active.id))),
  };

  function start(event: DragStartEvent) {
    setActiveId(String(event.active.id));
    // a touch drag starts on a timer with the finger still, so say it lifted
    if (event.activatorEvent.type === "touchstart" && typeof navigator.vibrate === "function") {
      navigator.vibrate(12);
    }
  }

  function finish() {
    setActiveId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      accessibility={{ announcements }}
      onDragStart={start}
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
        {children}
      </SortableContext>
      <DragOverlay dropAnimation={dropAnimation}>
        {activeId !== null ? (
          // dnd-kit measures the overlay's only child for the drop, and a tilted
          // box's bounds overshoot the card, so the tilt sits one level below it
          <div>
            <div className="motion-safe:animate-pin-lift scale-103 rotate-2">
              {renderOverlay(activeId)}
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

type SortablePinProps = {
  id: string;
  disabled?: boolean;
  children: ReactNode;
};

export function SortablePin({ id, disabled, children }: SortablePinProps) {
  const { listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id,
    disabled,
    animateLayoutChanges: () => false,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
      }}
      className={cn("touch-manipulation", isDragging && "opacity-50")}
    >
      {children}
    </div>
  );
}
