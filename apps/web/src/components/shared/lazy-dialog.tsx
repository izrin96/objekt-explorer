import { type ComponentType, Suspense, lazy, useState } from "react";

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

/**
 * A controlled dialog whose code loads on its first open, keeping it out of the chunk that renders
 * the trigger. Once opened it stays mounted, so its close animation and its state survive.
 */
export function lazyDialog<P extends DialogProps>(load: () => Promise<ComponentType<P>>) {
  const Dialog = lazy(() => load().then((component) => ({ default: component })));

  return function LazyDialog(props: P) {
    const [opened, setOpened] = useState(props.open);
    if (props.open && !opened) setOpened(true);
    if (!opened) return null;

    return (
      <Suspense fallback={null}>
        <Dialog {...props} />
      </Suspense>
    );
  };
}
