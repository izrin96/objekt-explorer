import type { Announcements, DragStartEvent, DropAnimation } from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixIcon } from "@phosphor-icons/react";
import { createContext, use, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const dropAnimation: DropAnimation = {
  duration: 200,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
  sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.5" } } }),
};

/**
 * Mouse: 8px of travel, so a click still opens the drawer and the hover check
 * still selects. Keyboard: Space/Enter on the handle, arrows to move.
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
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
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
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: m.profile_reorder_instructions() },
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

export function SortablePin({
  id,
  children,
}: {
  id: string;
  /** takes the grab handle to render into `ObjektCard`'s overlay slot */
  children: (handle: ReactNode) => ReactNode;
}) {
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
      aria-label={m.profile_pinned_reorder_aria()}
      // no `stopPropagation` here: the card body ignores keys whose target is
      // not itself, and stopping the synthetic event would also stop the native
      // one before dnd-kit's document listener sees the arrow keys
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
