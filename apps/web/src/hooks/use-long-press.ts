import type { PointerEvent as ReactPointerEvent, SyntheticEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type LongPressOptions = {
  onLongPress: () => void;
  delay?: number;
  /** px of movement that turns the press into a scroll / drag and cancels it */
  moveTolerance?: number;
  disabled?: boolean;
};

type LongPressResult = {
  handlers: {
    onPointerDown: (event: ReactPointerEvent) => void;
    onPointerMove: (event: ReactPointerEvent) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onContextMenu: (event: SyntheticEvent) => void;
  };
  /**
   * True from the moment a long press fires until the click it generates has
   * been consumed; bail out of the click handler when it returns true, so a
   * long press never also opens what a tap would open.
   */
  consumeClick: () => boolean;
};

/**
 * Touch/pen long-press. Only `touch` and `pen` arm the timer, so a mouse keeps
 * its plain click.
 */
export function useLongPress({
  onLongPress,
  delay = 400,
  moveTolerance = 8,
  disabled = false,
}: LongPressOptions): LongPressResult {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  // state, not a ref: the context-menu handler must re-render to see a live press
  const [pending, setPending] = useState(false);

  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
    setPending(false);
  }, []);

  useEffect(() => cancel, [cancel]);

  // a scroll means the finger was panning, not holding
  useEffect(() => {
    if (!pending) return;
    const onScroll = () => cancel();
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", onScroll, { capture: true });
  }, [pending, cancel]);

  const onPointerDown = (event: ReactPointerEvent) => {
    fired.current = false;
    if (disabled || (event.pointerType !== "touch" && event.pointerType !== "pen")) return;
    // a press starting on a nested control belongs to that control
    if (event.target instanceof Element && event.target.closest("button, a, input")) return;
    // React bubbles a portal's events to the card: a tap on a menu's outside-press
    // backdrop lands here, and the backdrop unmounting takes the pointerup that
    // would cancel the timer with it
    if (!(event.target instanceof Node) || !event.currentTarget.contains(event.target)) return;

    origin.current = { x: event.clientX, y: event.clientY };
    setPending(true);
    timer.current = setTimeout(() => {
      fired.current = true;
      cancel();
      if (typeof navigator.vibrate === "function") navigator.vibrate(12);
      onLongPress();
    }, delay);
  };

  const onPointerMove = (event: ReactPointerEvent) => {
    const start = origin.current;
    if (start === null) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > moveTolerance) cancel();
  };

  return {
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onContextMenu: (event) => {
        // only while holding: a right-click on desktop keeps the native menu
        if (pending || fired.current) event.preventDefault();
      },
    },
    consumeClick: () => {
      const hit = fired.current;
      fired.current = false;
      return hit;
    },
  };
}
