const viteEnv = import.meta.env ?? {};

export const chainConfig = {
  chainId: Number(viteEnv.VITE_CHAIN_ID ?? 31337),
  rpcUrl: viteEnv.VITE_RPC_URL ?? "http://127.0.0.1:8545",
  blockExplorerUrl: viteEnv.VITE_BLOCK_EXPLORER_URL ?? "",
  registryAddress: viteEnv.VITE_REGISTRY_CONTRACT_ADDRESS ?? "",
  mockUsdcAddress: viteEnv.VITE_MOCK_USDC_ADDRESS ?? ""
};
