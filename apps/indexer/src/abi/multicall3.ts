import { address, array, bool, bytes, struct } from "@subsquid/evm-codec";

import { func } from "./abi.support";

export const MULTICALL3 = "0xca11bde05977b3631167028862be2a173976ca11";

/** First Abstract block with Multicall3 deployed; earlier blocks have no code at `MULTICALL3`. */
export const MULTICALL3_DEPLOY_BLOCK = 9_051_409;

/** aggregate3((address,bool,bytes)[]) */
export const aggregate3 = func(
  "0x82ad56cb",
  {
    calls: array(
      struct({
        target: address,
        allowFailure: bool,
        callData: bytes,
      }),
    ),
  },
  array(
    struct({
      success: bool,
      returnData: bytes,
    }),
  ),
);
