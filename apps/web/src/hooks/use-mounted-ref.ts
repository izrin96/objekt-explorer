import { useEffect, useRef } from "react";

/** Whether the component is still mounted, for a callback that outlives it; read only outside render. */
export function useMountedRef() {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}
