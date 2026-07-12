// Online-labeled collections that were actually pre-assigned tokenIds up front
// (like offline objekts), so their serial can NOT be derived from online mint
// order. They are excluded from the online serial path and routed through the
// offline path instead. Shared by populate-serial and the serial scripts.
export const preAssignedCollections = [
  "cream02-jiyeon-315z",
  "cream02-kotone-315z",
  "cream02-hayeon-315z",
  "cream02-jiwoo-315z",
  "cream02-xinyu-315z",
  "cream02-yeonji-315z",
];
