/** Abstract mainnet's block explorer; a transaction's page is this base plus its hash. */
const EXPLORER_TX_BASE = "https://abscan.org/tx/";

export const explorerTxUrl = (hash: string) => `${EXPLORER_TX_BASE}${hash}`;
