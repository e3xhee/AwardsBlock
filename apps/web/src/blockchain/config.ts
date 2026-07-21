const viteEnv = import.meta.env ?? {};

export type ChainConfig = {
  chainId: number;
  rpcUrl: string;
  blockExplorerUrl: string;
  registryAddress: string;
  mockUsdcAddress: string;
};

export type OnchainConfigStatus = {
  ready: boolean;
  missing: string[];
  message: string;
  chainId: number;
  registryAddress: string;
  mockUsdcAddress: string;
};

export type RegistryConfigStatus = {
  ready: boolean;
  message: string;
  registryAddress: string;
};

export const chainConfig: ChainConfig = {
  chainId: Number(viteEnv.VITE_CHAIN_ID ?? 31337),
  rpcUrl: viteEnv.VITE_RPC_URL ?? "http://127.0.0.1:8545",
  blockExplorerUrl: viteEnv.VITE_BLOCK_EXPLORER_URL ?? "",
  registryAddress: viteEnv.VITE_REGISTRY_CONTRACT_ADDRESS ?? "",
  mockUsdcAddress: viteEnv.VITE_MOCK_USDC_ADDRESS ?? "",
};

export function isConfiguredEvmAddress(
  value: string | null | undefined,
): boolean {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

export function getRegistryConfigStatus(
  registryAddress = chainConfig.registryAddress,
): RegistryConfigStatus {
  const normalizedRegistryAddress = registryAddress.trim();

  if (!isConfiguredEvmAddress(normalizedRegistryAddress)) {
    return {
      ready: false,
      message:
        "Registry 컨트랙트 주소가 비어 있거나 올바른 EVM 주소 형식이 아닙니다.",
      registryAddress: normalizedRegistryAddress,
    };
  }

  return {
    ready: true,
    message: "Registry 컨트랙트 설정이 준비되었습니다.",
    registryAddress: normalizedRegistryAddress,
  };
}

export function getOnchainConfigStatus(
  config: ChainConfig = chainConfig,
): OnchainConfigStatus {
  const missing: string[] = [];
  const registryAddress = config.registryAddress.trim();
  const mockUsdcAddress = config.mockUsdcAddress.trim();

  if (!Number.isInteger(config.chainId) || config.chainId <= 0) {
    missing.push("체인 ID");
  }

  if (!isConfiguredEvmAddress(registryAddress)) {
    missing.push("Registry 컨트랙트 주소");
  }

  if (!isConfiguredEvmAddress(mockUsdcAddress)) {
    missing.push("mUSDC 컨트랙트 주소");
  }

  return {
    ready: missing.length === 0,
    missing,
    message:
      missing.length === 0
        ? "온체인 설정이 준비되었습니다."
        : `${missing.join(", ")} 설정이 필요합니다.`,
    chainId: config.chainId,
    registryAddress,
    mockUsdcAddress,
  };
}
