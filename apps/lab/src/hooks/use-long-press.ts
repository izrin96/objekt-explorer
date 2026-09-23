import type { PointerEvent as ReactPointerEvent, SyntheticEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type LongPressOptions = {
  /** fired once the press survives `delay` without moving or scrolling */
  onLongPress: () => void;
  /** ms the finger has to stay down (iOS Photos uses ~0.5s; 400 feels quicker) */
  delay?: number;
  /** px of movement that turns the press into a scroll / drag and cancels it */
  moveTolerance?: number;
  /** skip the whole thing (cards that cannot be selected) */
  disabled?: boolean;
};

type LongPressResult = {
  /** spread onto the element that should receive the press */
  handlers: {
    onPointerDown: (event: ReactPointerEvent) => void;
    onPointerMove: (event: ReactPointerEvent) => void;
    onPointerUp: () => void;
    onPointerCancel: () => void;
    onContextMenu: (event: SyntheticEvent) => void;
  };
  /**
   * True from the moment a long press fires until the click it generates has
   * been consumed. Call it in the click handler and bail out when it returns
   * true, so a long press never also opens what a tap would open.
   */
  consumeClick: () => boolean;
};

/**
 * Touch/pen long-press, the iOS Photos gesture: hold a card to select it.
 *
 * Only `touch` and `pen` pointers arm the timer — a mouse keeps its hover
 * affordance and its plain click. The press is cancelled by movement past
 * `moveTolerance`, by `pointercancel` (which is what the browser sends once it
 * claims the gesture for a scroll), and by a scroll anywhere on the page.
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
  // only state here: the context menu must be suppressed during a live press,
  // and React needs to re-render for the handler to see it
  const [pending, setPending] = useState(false);

  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
    setPending(false);
  }, []);

  // unmounting mid-press (a filter change, a route change) must not leave a timer
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
    // a press that starts on one of the card's own controls belongs to that control
    if (event.target instanceof Element && event.target.closest("button, a, input")) return;

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
