/** cards a collection holds on average before a heading over each is worth its line */
const HEADING_MIN = 3;

/**
 * Whether See the objekts heads each collection: only when the rule spans several and they hold
 * a few cards each. One collection, or one or two chosen members a collection, reads best flat.
 */
export function showsHeadings(groups: readonly { objekts: readonly unknown[] }[]) {
  if (groups.length < 2) return false;
  const cards = groups.reduce((sum, group) => sum + group.objekts.length, 0);
  return cards / groups.length >= HEADING_MIN;
}
