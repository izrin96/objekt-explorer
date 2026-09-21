import { useEffect, useState } from "react";

/**
 * Minimal JSON fetch hook for the lab: no React Query, no cache, just one
 * in-flight request per url with an AbortController so a fast drawer close or
 * a serial change cannot land a stale response.
 *
 * `url === null` means "nothing to fetch yet" and leaves the hook idle.
 */
export type ApiState<T> = {
  data: T | null;
  loading: boolean;
  /** set when the request failed; callers swap in fixtures and flag it */
  error: boolean;
};

/** the state plus the url it belongs to, so a stale url can be spotted in render */
type Tracked<T> = ApiState<T> & { url: string | null };

function idle<T>(url: string | null): Tracked<T> {
  return { url, data: null, loading: url !== null, error: false };
}

export function useApi<T>(url: string | null): ApiState<T> {
  const [state, setState] = useState<Tracked<T>>(() => idle<T>(url));

  // The url changed, so the state belongs to the previous one. Resetting here
  // rather than from the effect is React's own "adjust state when a prop
  // changes" pattern: an effect would paint the old url's data for a frame
  // first, and a synchronous setState in an effect is what the react-compiler
  // rule warns about. React re-runs this render immediately with the reset
  // value, and the next pass sees `state.url === url`.
  if (state.url !== url) setState(idle<T>(url));

  useEffect(() => {
    if (url === null) return;

    const controller = new AbortController();

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return (await response.json()) as T;
      })
      .then((data) => setState({ url, data, loading: false, error: false }))
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        console.warn(`[lab] ${url} failed`, cause);
        setState({ url, data: null, loading: false, error: true });
      });

    return () => controller.abort();
  }, [url]);

  return state;
}
