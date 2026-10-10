import type { AddressTransfersFilters } from "../schemas/transfers";

type TransferOrder = AddressTransfersFilters["order"];

/** Merge two arrays sorted by (timestamp, id) in `order`, deduplicate, return the first `limit` */
export function mergeSortedTransfers<T extends { transfer: { id: string; timestamp: string } }>(
  a: T[],
  b: T[],
  limit: number,
  order: TransferOrder,
): T[] {
  const result: T[] = [];
  let i = 0;
  let j = 0;

  while (result.length < limit && (i < a.length || j < b.length)) {
    let next: T;
    if (j >= b.length) {
      next = a[i++]!;
    } else if (i >= a.length) {
      next = b[j++]!;
    } else if (comesFirst(a[i]!.transfer, b[j]!.transfer, order)) {
      next = a[i++]!;
    } else {
      next = b[j++]!;
    }

    if (result.at(-1)?.transfer.id !== next.transfer.id) {
      result.push(next);
    }
  }

  return result;
}

function comesFirst(
  a: { id: string; timestamp: string },
  b: { id: string; timestamp: string },
  order: TransferOrder,
) {
  if (a.timestamp !== b.timestamp) {
    return order === "desc" ? a.timestamp > b.timestamp : a.timestamp < b.timestamp;
  }
  return order === "desc" ? a.id >= b.id : a.id <= b.id;
}
