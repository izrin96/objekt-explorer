/** Whether a Member value is a unit's combined name ("id4 X id8") rather than one member. */
export function isCombinedMember(value: string) {
  return value.toLowerCase().includes(" x ");
}
