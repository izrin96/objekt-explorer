import { AsyncLocalStorage } from "async_hooks";

// based on https://numeric.substack.com/p/upgrading-drizzleorm-logging-with
interface QueryContext {
  queryKey: string;
  startTime: number;
  queries: { sql?: string; params?: unknown[] }[];
}

const queryStorage = new AsyncLocalStorage<QueryContext>();

function wrapQuery<T>(queryKey: string, fn: () => Promise<T>): Promise<T> {
  return queryStorage.run(
    {
      queryKey,
      startTime: Date.now(),
      queries: [],
    },
    fn,
  );
}

function getContext(): QueryContext | undefined {
  return queryStorage.getStore();
}

export function addToContext(data: { sql?: string; params?: unknown[] }): void {
  const context = getContext();
  if (context) {
    context.queries.push(data);
  }
}

/**
 * Log all queries made by drizzle during the execution of a promise
 *
 * use second parameter to configure when logging occurs
 * * true    => log everything (default)
 * * false   => log nothing, skips asyncstorage entirely
 * * 'error' => only log if promise throws
 *
 */
export async function executeQuery<T = any>(
  queryKey: string,
  queryPromise: () => Promise<T>,
  when: boolean | "error" = true,
) {
  if (when === false) {
    return await queryPromise();
  }
  return wrapQuery(queryKey, async () => {
    try {
      const results = await queryPromise();

      if (when !== "error") {
        // Query is done - grab everything from context
        const context = getContext();
        const executionTime = context ? Date.now() - context.startTime : 0;
        console.info(
          "[db query]",
          { queryKey, queries: context?.queries },
          `Execution Complete in ${executionTime}ms`,
        );
      }

      return results;
    } catch (error) {
      const context = getContext();
      const executionTime = context ? Date.now() - context.startTime : 0;
      console.warn(
        "[db query]",
        { queryKey, queries: context?.queries },
        `Execution failed in ${executionTime}ms`,
      );
      throw error;
    }
  });
}
