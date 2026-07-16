export const chainConfig = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID ?? 31337),
  rpcUrl: import.meta.env.VITE_RPC_URL ?? "http://127.0.0.1:8545",
  blockExplorerUrl: import.meta.env.VITE_BLOCK_EXPLORER_URL ?? "",
};
