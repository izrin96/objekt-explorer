import { Addresses } from "@repo/lib";
import type { DataHandlerContext as BaseDataHandlerContext } from "@subsquid/batch-processor";
import type * as evmObjects from "@subsquid/evm-objects";
import { DataSourceBuilder, type FieldSelection } from "@subsquid/evm-stream";
import type { Logger } from "@subsquid/logger";

import * as ABI_COMO from "./abi/como";
import * as ABI_GRAVITY from "./abi/gravity";
import * as ABI_OBJEKT from "./abi/objekt";
import { env } from "./env";

const COSMO_START_BLOCK = 6363806;

console.log(
  `[processor] Starting processor with objekts ${env.ENABLE_OBJEKTS} and gravity ${env.ENABLE_GRAVITY}`,
);

export const fields = {
  block: { timestamp: true },
  log: {
    address: true,
    topics: true,
    data: true,
    transactionHash: true,
  },
  transaction: {
    to: true,
    input: true,
    sighash: true,
  },
} satisfies FieldSelection;

export type Fields = typeof fields;
export type Block = evmObjects.BlockHeader<Fields>;
export type BlockData = evmObjects.Block<Fields>;
export type Log = evmObjects.Log<Fields>;
export type Transaction = evmObjects.Transaction<Fields>;
export type ProcessorContext<Store> = BaseDataHandlerContext<BlockData, Store> & {
  log: Logger;
};

export const dataSource = new DataSourceBuilder()
  .setPortal({
    url: "https://portal.sqd.dev/datasets/abstract-mainnet",
    http: { retryAttempts: Infinity },
  })
  .setBlockRange({ from: COSMO_START_BLOCK })
  .setFields(fields)
  // objekt transfers
  .addLog({
    where: { address: [Addresses.OBJEKT], topic0: [ABI_OBJEKT.events.Transfer.topic] },
    range: { from: COSMO_START_BLOCK },
  })
  // objekt transferability updates
  .addTransaction({
    where: {
      to: [Addresses.OBJEKT],
      sighash: [ABI_OBJEKT.functions.batchUpdateObjektTransferability.sighash],
    },
    range: { from: COSMO_START_BLOCK },
  })
  // single como transfers
  .addLog({
    where: { address: [Addresses.COMO], topic0: [ABI_COMO.events.TransferSingle.topic] },
    range: { from: COSMO_START_BLOCK },
  })
  // batch como transfers
  .addLog({
    where: { address: [Addresses.COMO], topic0: [ABI_COMO.events.TransferBatch.topic] },
    range: { from: COSMO_START_BLOCK },
  })
  // gravity votes
  .addLog({
    where: { address: [Addresses.GRAVITY], topic0: [ABI_GRAVITY.events.Voted.topic] },
    range: { from: COSMO_START_BLOCK },
  })
  // gravity reveals
  .addTransaction({
    where: { to: [Addresses.GRAVITY], sighash: [ABI_GRAVITY.functions.reveal.sighash] },
    range: { from: COSMO_START_BLOCK },
  })
  .build();
