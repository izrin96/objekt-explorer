/**
 * Dev-only horizontal-overflow guard.
 *
 * The net under "runs off the right edge on a phone". It runs on every route
 * change and on resize, and `console.error`s the route plus the first element
 * that reaches past the viewport.
 *
 * Two things make it more than a `documentElement.scrollWidth` check:
 *
 * - The root layout wraps the page in `overflow-x-clip`, for the banner's
 *   `w-screen` layer, so the document itself can never scroll
 *   sideways — page overflow is silent. The walk therefore measures elements
 *   against `window.innerWidth` instead, and an element marked
 *   `data-overflow-guard` (the `<main>`) is checked the same way even though a
 *   clipping ancestor hides its overflow.
 * - Overlays are portalled outside `<main>` and scroll inside themselves, so
 *   each open drawer / sheet / dialog popup is walked as its own container.
 *
 * Walking stops at any element that clips or scrolls its own overflow: its
 * children are bounded by it, and it was already measured. Such an element is
 * reported when it scrolls horizontally and did not ask to — a form control, a
 * `truncate`d label and anything marked `data-scroll-x` (the profile tab strip,
 * the member chip row, the Activity table) are clipping on purpose and are left
 * alone.
 */

/** sub-pixel layout rounding, not a bug */
const TOLERANCE = 1;

const POPUP_SELECTOR =
  "[data-slot=drawer-popup],[data-slot=sheet-popup],[data-slot=dialog-popup],[data-slot=alert-dialog-popup]";

/** these scroll their own content by design and have no children to walk */
const FORM_CONTROLS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

type Hit = { element: Element; why: string };

function describe(el: Element): string {
  const cls = typeof el.className === "string" ? el.className : "";
  const slot = el.getAttribute("data-slot");
  return [
    el.tagName.toLowerCase(),
    slot && `[data-slot=${slot}]`,
    cls && `.${cls.trim().split(/\s+/).slice(0, 6).join(".")}`,
  ]
    .filter(Boolean)
    .join("");
}

/**
 * First descendant of `root` reaching past `limit` (a viewport-relative x), or
 * scrolling sideways without having asked to.
 */
function findOverflow(root: Element, limit: number): Hit | null {
  for (const el of root.children) {
    const rect = el.getBoundingClientRect();
    // nothing laid out, or an `sr-only` 1x1 clip — neither can push a layout
    if (rect.width <= 1 && rect.height <= 1) continue;

    if (rect.right > limit + TOLERANCE) {
      return { element: el, why: `right edge ${Math.round(rect.right)} > ${Math.round(limit)}` };
    }

    const style = getComputedStyle(el);
    if (style.overflowX === "visible") {
      const hit = findOverflow(el, limit);
      if (hit) return hit;
      continue;
    }

    // clipping on purpose: a text field scrolling its own value, `truncate`
    // cutting a label to an ellipsis, or a row that declared itself a scroller
    if (
      el.hasAttribute("data-scroll-x") ||
      FORM_CONTROLS.has(el.tagName) ||
      style.textOverflow === "ellipsis"
    ) {
      continue;
    }
    if (el.scrollWidth > el.clientWidth + TOLERANCE) {
      return {
        element: el,
        why: `scrolls horizontally: scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`,
      };
    }
  }
  return null;
}

function report(route: string, scope: string, hit: Hit): void {
  console.error(
    `[overflow] ${route} — ${scope}: ${describe(hit.element)} (${hit.why})`,
    hit.element,
  );
}

/** One pass over the document and every open popup. Exported for manual runs. */
export function checkOverflow(route: string): void {
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth + TOLERANCE) {
    console.error(
      `[overflow] ${route} — document scrolls sideways: scrollWidth ${doc.scrollWidth} > clientWidth ${doc.clientWidth}`,
    );
  }

  // not `document.body`: the root wrapper clips the overflow away, and the
  // walk stops at anything that clips. `<main>` is the box inside it.
  for (const page of document.querySelectorAll("[data-overflow-guard]")) {
    const hit = findOverflow(page, window.innerWidth);
    if (hit) report(route, "page", hit);
  }

  for (const popup of document.querySelectorAll(POPUP_SELECTOR)) {
    // the popup's own `scrollWidth` is no use: cnippet's drawer paints a 48px
    // `::after` bleed past its edge, which no element walk can see and which is
    // off-screen anyway. Its children, measured against its own right edge, are.
    const right = Math.min(popup.getBoundingClientRect().right, window.innerWidth);
    const hit = findOverflow(popup, right);
    if (hit) report(route, popup.getAttribute("data-slot") ?? "popup", hit);
  }
}

/**
 * Starts the guard. `getRoute` is read at check time so the message names the
 * route the layout was measured on. Returns the teardown.
 */
export function startOverflowGuard(getRoute: () => string): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const schedule = (delay: number) => {
    clearTimeout(timer);
    timer = setTimeout(() => checkOverflow(getRoute()), delay);
  };

  // let images, fonts and the drawer's open transition settle first
  schedule(400);
  const onResize = () => schedule(250);
  window.addEventListener("resize", onResize);

  // overlays portal into <body> rather than into the route, so a route change
  // alone would never see them; re-check whenever one mounts
  const observer = new MutationObserver((records) => {
    const opened = records.some((record) =>
      [...record.addedNodes].some(
        (node) => node instanceof Element && node.querySelector(POPUP_SELECTOR) !== null,
      ),
    );
    // cnippet's drawer transition runs 450ms; measure after it has landed
    if (opened) schedule(700);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    clearTimeout(timer);
    window.removeEventListener("resize", onResize);
    observer.disconnect();
  };
}
