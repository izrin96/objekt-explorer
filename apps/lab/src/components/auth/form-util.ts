import { useEffect, useRef, useState } from "react";
import type * as z from "zod";

/** what `<Form errors>` takes: one key per `<Field name>` */
export type FieldErrors = Record<string, string | string[]>;

/**
 * Runs a schema over the values Base UI's `Form` hands `onFormSubmit` and
 * returns them in the shape the `errors` prop wants. `z.flattenError` is the
 * documented route, but its `fieldErrors` is `Record<string, string[] |
 * undefined>` and `Errors` has no `undefined` member, so walking the issues is
 * both shorter and exactly typed.
 */
export function zodErrors(schema: z.ZodType, values: Record<string, unknown>): FieldErrors {
  const result = schema.safeParse(values);
  if (result.success) return {};

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? "");
    const existing = errors[key];
    if (existing) existing.push(issue.message);
    else errors[key] = [issue.message];
  }
  return errors;
}

/**
 * Stands in for the website's `useMutation`: every auth call here is fake, but
 * the button still has to spend a beat in its `loading` state or the pending
 * styling is unreachable. The timer is cleared on unmount, since a successful
 * sign in navigates away while it is still running.
 */
export function useFakeSubmit(): { pending: boolean; run: (onDone: () => void) => void } {
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  return {
    pending,
    run: (onDone) => {
      setPending(true);
      timer.current = setTimeout(() => {
        setPending(false);
        onDone();
      }, 450);
    },
  };
}
