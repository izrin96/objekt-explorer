const round = (n: number) => Math.round(n * 100) / 100;

/** A line over `values`, broken where a day has none. A flat series runs through the middle. */
export function sparklinePath(values: (number | null)[], width: number, height: number): string {
  const present = values.filter((v) => v !== null);
  if (present.length === 0) return "";
  const min = Math.min(...present);
  const span = Math.max(...present) - min;
  const step = values.length > 1 ? width / (values.length - 1) : 0;

  let path = "";
  let drawing = false;
  values.forEach((value, index) => {
    if (value === null) {
      drawing = false;
      return;
    }
    const y = span === 0 ? height / 2 : height - ((value - min) / span) * height;
    path += `${drawing ? "L" : "M"}${round(index * step)},${round(y)}`;
    drawing = true;
  });
  return path;
}
