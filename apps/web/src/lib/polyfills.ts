// Object.groupBy and Map.groupBy are missing before Safari 17.4 and Chrome 117
if (typeof Object.groupBy !== "function") {
  Object.groupBy = <K extends PropertyKey, T>(
    items: Iterable<T>,
    keyOf: (item: T, index: number) => K,
  ): Partial<Record<K, T[]>> => {
    const groups = Object.create(null) as Partial<Record<K, T[]>>;
    let index = 0;
    for (const item of items) (groups[keyOf(item, index++)] ??= []).push(item);
    return groups;
  };
}

if (typeof Map.groupBy !== "function") {
  Map.groupBy = <K, T>(items: Iterable<T>, keyOf: (item: T, index: number) => K): Map<K, T[]> => {
    const groups = new Map<K, T[]>();
    let index = 0;
    for (const item of items) {
      const key = keyOf(item, index++);
      const group = groups.get(key);
      if (group) group.push(item);
      else groups.set(key, [item]);
    }
    return groups;
  };
}
