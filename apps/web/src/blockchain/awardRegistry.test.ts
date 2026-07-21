import { decodeFunctionData } from "viem";
import {
  awardRegistryAbi,
  buildApproveRewardTokenRequest,
  buildAwardContractId,
  buildCreateAwardRequest,
  buildClaimAwardRequest,
  buildFinalizeAwardRequest,
  buildFundAwardRequest,
  buildSetRecipientsRequest,
  erc20ApproveAbi,
  sendContractWrite,
  type ContractWriteProvider
} from "./awardRegistry";

const organizer = "0x0123456789abcdef0123456789abcdef01234567";
const registryAddress = "0x1111111111111111111111111111111111111111";
const rewardTokenAddress = "0x2222222222222222222222222222222222222222";
const recipientAddress = "0x3333333333333333333333333333333333333333";
const contractAwardId = buildAwardContractId("award-1");

if (!/^0x[a-f0-9]{64}$/.test(contractAwardId)) {
  throw new Error("Expected text award ids to become bytes32 hex");
}

if (
  buildAwardContractId("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa") !==
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
) {
  throw new Error("Expected bytes32 award ids to pass through");
}

const approveRequest = buildApproveRewardTokenRequest({
  from: organizer,
  tokenAddress: rewardTokenAddress,
  spenderAddress: registryAddress,
  amount: "1000000"
});

if (approveRequest.to !== rewardTokenAddress) {
  throw new Error("Expected approve request to target reward token");
}

const decodedApprove = decodeFunctionData({
  abi: erc20ApproveAbi,
  data: approveRequest.data
});

if (decodedApprove.functionName !== "approve") {
  throw new Error("Expected approve function call");
}

if (decodedApprove.args[0] !== registryAddress || decodedApprove.args[1] !== 1000000n) {
  throw new Error("Expected approve spender and amount args");
}

const createAwardRequest = buildCreateAwardRequest({
  from: organizer,
  registryAddress,
  awardId: "award-1",
  eventId: "event-1",
  projectId: "project-1",
  metadataUri: "ipfs://awardblock/best-product",
  metadataHash: "0xabc123",
  rewardTokenAddress,
  claimStart: "2026-08-02T00:00:00.000Z",
  claimEnd: "2026-09-01T00:00:00.000Z"
});

if (createAwardRequest.to !== registryAddress) {
  throw new Error("Expected createAward request to target registry");
}

const decodedCreateAward = decodeFunctionData({
  abi: awardRegistryAbi,
  data: createAwardRequest.data
});

if (decodedCreateAward.functionName !== "createAward") {
  throw new Error("Expected createAward function call");
}

if (
  decodedCreateAward.args[0] !== contractAwardId ||
  decodedCreateAward.args[3] !== "ipfs://awardblock/best-product" ||
  decodedCreateAward.args[5] !== rewardTokenAddress ||
  decodedCreateAward.args[6] !== 1785628800n ||
  decodedCreateAward.args[7] !== 1788220800n
) {
  throw new Error("Expected createAward encoded args");
}

const setRecipientsRequest = buildSetRecipientsRequest({
  from: organizer,
  registryAddress,
  awardId: "award-1",
  recipients: [{ walletAddress: recipientAddress, allocation: "600000" }]
});

const decodedSetRecipients = decodeFunctionData({
  abi: awardRegistryAbi,
  data: setRecipientsRequest.data
});

if (decodedSetRecipients.functionName !== "setRecipients") {
  throw new Error("Expected setRecipients function call");
}

if (
  decodedSetRecipients.args[0] !== contractAwardId ||
  decodedSetRecipients.args[1][0] !== recipientAddress ||
  decodedSetRecipients.args[2][0] !== 600000n
) {
  throw new Error("Expected setRecipients encoded recipient allocation");
}

const fundRequest = buildFundAwardRequest({
  from: organizer,
  registryAddress,
  awardId: "award-1",
  amount: "1000000"
});

if (fundRequest.to !== registryAddress) {
  throw new Error("Expected fund request to target registry");
}

const decodedFund = decodeFunctionData({
  abi: awardRegistryAbi,
  data: fundRequest.data
});

if (decodedFund.functionName !== "fundAward") {
  throw new Error("Expected fundAward function call");
}

if (decodedFund.args[0] !== contractAwardId || decodedFund.args[1] !== 1000000n) {
  throw new Error("Expected fundAward id and amount args");
}

const decodedFinalize = decodeFunctionData({
  abi: awardRegistryAbi,
  data: buildFinalizeAwardRequest({ from: organizer, registryAddress, awardId: "award-1" }).data
});

if (decodedFinalize.functionName !== "finalizeAward") {
  throw new Error("Expected finalizeAward function call");
}

const decodedClaim = decodeFunctionData({
  abi: awardRegistryAbi,
  data: buildClaimAwardRequest({ from: organizer, registryAddress, awardId: "award-1" }).data
});

if (decodedClaim.functionName !== "claim") {
  throw new Error("Expected claim function call");
}

const providerRequests: Array<{ method: string; params?: unknown }> = [];
const provider: ContractWriteProvider = {
  async request<TResponse = unknown>({
    method,
    params
  }: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) {
    providerRequests.push({ method, params });
    return "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as TResponse;
  }
};

const txHash = await sendContractWrite(provider, fundRequest);

if (txHash !== "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa") {
  throw new Error("Expected wallet transaction hash");
}

if (providerRequests[0]?.method !== "eth_sendTransaction") {
  throw new Error("Expected eth_sendTransaction request");
}

if (JSON.stringify(providerRequests[0]?.params) !== JSON.stringify([fundRequest])) {
  throw new Error("Expected transaction request to be sent unchanged");
}
