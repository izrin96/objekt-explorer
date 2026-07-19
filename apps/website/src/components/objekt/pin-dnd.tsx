import type { DragEndEvent, DropAnimation } from "@dnd-kit/core";
import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PropsWithChildren, ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const dropAnimation: DropAnimation = {
  duration: 200,
  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
};

interface PinDndProviderProps {
  pinnedTokenIds: string[];
  onReorder: (tokenIds: string[]) => void;
  disabled?: boolean;
}

const PinDragPreviewContext = createContext<Map<string, ReactNode> | null>(null);

export function PinDndProvider({
  pinnedTokenIds,
  onReorder,
  disabled,
  children,
}: PropsWithChildren<PinDndProviderProps>) {
  if (disabled) return children;
  return (
    <PinDndProviderInner pinnedTokenIds={pinnedTokenIds} onReorder={onReorder}>
      {children}
    </PinDndProviderInner>
  );
}

function PinDndProviderInner({
  pinnedTokenIds,
  onReorder,
  children,
}: PropsWithChildren<{ pinnedTokenIds: string[]; onReorder: (tokenIds: string[]) => void }>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const previewRegistry = useRef(new Map<string, ReactNode>());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || over.id === active.id) {
      setActiveId(null);
      return;
    }

    const draggedId = String(active.id);
    const overId = String(over.id);

    const fromIndex = pinnedTokenIds.indexOf(draggedId);
    const toIndex = pinnedTokenIds.indexOf(overId);
    if (fromIndex === -1 || toIndex === -1) {
      setActiveId(null);
      return;
    }

    const newOrder = arrayMove(pinnedTokenIds, fromIndex, toIndex);

    onReorder(newOrder);

    setActiveId(null);
  }

  return (
    <PinDragPreviewContext value={previewRegistry.current}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(event) => setActiveId(String(event.active.id))}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <SortableContext items={pinnedTokenIds} strategy={rectSortingStrategy}>
          {children}
        </SortableContext>
        <DragOverlay dropAnimation={dropAnimation}>
          {activeId ? <PinDragPreview registry={previewRegistry.current} id={activeId} /> : null}
        </DragOverlay>
      </DndContext>
    </PinDragPreviewContext>
  );
}

function PinDragPreview({ registry, id }: { registry: Map<string, ReactNode>; id: string }) {
  const content = registry.get(id);
  if (!content) return null;
  return content;
}

interface DraggablePinProps {
  tokenId: string;
  children: ReactNode;
}

export function DraggablePin({ tokenId, children }: DraggablePinProps) {
  const { listeners, setNodeRef, isDragging, transform, transition } = useSortable({
    id: tokenId,
    animateLayoutChanges: () => false,
  });
  const previewRegistry = useContext(PinDragPreviewContext);

  useEffect(() => {
    if (!previewRegistry) return;
    previewRegistry.set(tokenId, children);
    return () => {
      previewRegistry.delete(tokenId);
    };
  }, [previewRegistry, tokenId, children]);

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
