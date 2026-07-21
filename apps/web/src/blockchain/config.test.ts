import {
  getOnchainConfigStatus,
  getRegistryConfigStatus,
  isConfiguredEvmAddress,
  type ChainConfig,
} from "./config";

const completeConfig: ChainConfig = {
  chainId: 31337,
  rpcUrl: "http://127.0.0.1:8545",
  blockExplorerUrl: "",
  registryAddress: "0x1111111111111111111111111111111111111111",
  mockUsdcAddress: "0x2222222222222222222222222222222222222222",
};

if (!isConfiguredEvmAddress(completeConfig.registryAddress)) {
  throw new Error("Expected valid EVM address to pass config validation");
}

if (isConfiguredEvmAddress("0x123")) {
  throw new Error("Expected short EVM address to fail config validation");
}

const registryStatus = getRegistryConfigStatus(completeConfig.registryAddress);

if (!registryStatus.ready) {
  throw new Error("Expected valid registry address to be ready");
}

if (registryStatus.registryAddress !== completeConfig.registryAddress) {
  throw new Error(
    "Expected registry address to be normalized without changing value",
  );
}

const missingRegistryStatus = getRegistryConfigStatus("");

if (
  missingRegistryStatus.ready ||
  !missingRegistryStatus.message.includes("Registry")
) {
  throw new Error(
    "Expected missing registry address to return a Registry config message",
  );
}

const onchainStatus = getOnchainConfigStatus(completeConfig);

if (!onchainStatus.ready) {
  throw new Error("Expected complete on-chain config to be ready");
}

const incompleteStatus = getOnchainConfigStatus({
  ...completeConfig,
  registryAddress: "",
  mockUsdcAddress: "0x123",
});

if (incompleteStatus.ready) {
  throw new Error("Expected incomplete on-chain config to be blocked");
}

if (!incompleteStatus.missing.includes("Registry 컨트랙트 주소")) {
  throw new Error("Expected missing Registry address to be reported");
}

if (!incompleteStatus.missing.includes("mUSDC 컨트랙트 주소")) {
  throw new Error("Expected missing mUSDC address to be reported");
}
