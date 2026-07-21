import {
  awardDistributionRegistryAbi,
  mockUsdcAbi
} from "@awardblock/shared";
import {
  encodeFunctionData,
  isAddress,
  keccak256,
  toBytes,
  type Address,
  type Hex
} from "viem";

export type ContractWriteProvider = {
  request<TResponse = unknown>(request: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<TResponse>;
};

export type ContractTransactionRequest = {
  from: Address;
  to: Address;
  data: Hex;
};

type ContractAwardInput = {
  from: string;
  registryAddress: string;
  awardId: string;
};

type AmountInput = {
  amount: string;
};

type RegistryCall =
  | { functionName: "createAward"; args: [Hex, Hex, Hex, string, Hex, Address, bigint, bigint] }
  | { functionName: "setRecipients"; args: [Hex, Address[], bigint[]] }
  | { functionName: "fundAward"; args: [Hex, bigint] }
  | { functionName: "finalizeAward"; args: [Hex] }
  | { functionName: "claim"; args: [Hex] };

export const awardRegistryAbi = awardDistributionRegistryAbi;
export const erc20ApproveAbi = mockUsdcAbi;

export function buildAwardContractId(value: string): Hex {
  const trimmed = value.trim();

  if (/^0x[a-fA-F0-9]{64}$/.test(trimmed)) {
    return trimmed.toLowerCase() as Hex;
  }

  if (trimmed === "") {
    throw new Error("AWARD_CONTRACT_ID_REQUIRED");
  }

  return keccak256(toBytes(trimmed));
}

export function buildApproveRewardTokenRequest(input: {
  from: string;
  tokenAddress: string;
  spenderAddress: string;
  amount: string;
}): ContractTransactionRequest {
  return {
    from: requireAddress(input.from, "from"),
    to: requireAddress(input.tokenAddress, "tokenAddress"),
    data: encodeFunctionData({
      abi: erc20ApproveAbi,
      functionName: "approve",
      args: [requireAddress(input.spenderAddress, "spenderAddress"), parseAmount(input.amount)]
    })
  };
}

export function buildCreateAwardRequest(input: {
  from: string;
  registryAddress: string;
  awardId: string;
  eventId: string;
  projectId: string;
  metadataUri: string | null;
  metadataHash: string | null;
  rewardTokenAddress: string;
  claimStart: string;
  claimEnd: string;
}): ContractTransactionRequest {
  return buildRegistryRequest(input, {
    functionName: "createAward",
    args: [
      buildAwardContractId(input.awardId),
      buildAwardContractId(input.eventId),
      buildAwardContractId(input.projectId),
      input.metadataUri ?? "",
      buildAwardContractId(input.metadataHash ?? `${input.awardId}:metadata`),
      requireAddress(input.rewardTokenAddress, "rewardTokenAddress"),
      parseUnixSeconds(input.claimStart, "claimStart"),
      parseUnixSeconds(input.claimEnd, "claimEnd")
    ]
  });
}

export function buildSetRecipientsRequest(input: {
  from: string;
  registryAddress: string;
  awardId: string;
  recipients: Array<{ walletAddress: string; allocation: string }>;
}): ContractTransactionRequest {
  if (input.recipients.length === 0) {
    throw new Error("RECIPIENTS_REQUIRED");
  }

  return buildRegistryRequest(input, {
    functionName: "setRecipients",
    args: [
      buildAwardContractId(input.awardId),
      input.recipients.map((recipient) =>
        requireAddress(recipient.walletAddress, "recipientWalletAddress")
      ),
      input.recipients.map((recipient) => parseAmount(recipient.allocation))
    ]
  });
}

export function buildFundAwardRequest(
  input: ContractAwardInput & AmountInput
): ContractTransactionRequest {
  return buildRegistryRequest(input, {
    functionName: "fundAward",
    args: [buildAwardContractId(input.awardId), parseAmount(input.amount)]
  });
}

export function buildFinalizeAwardRequest(input: ContractAwardInput): ContractTransactionRequest {
  return buildRegistryRequest(input, {
    functionName: "finalizeAward",
    args: [buildAwardContractId(input.awardId)]
  });
}

export function buildClaimAwardRequest(input: ContractAwardInput): ContractTransactionRequest {
  return buildRegistryRequest(input, {
    functionName: "claim",
    args: [buildAwardContractId(input.awardId)]
  });
}

export async function sendContractWrite(
  provider: ContractWriteProvider,
  request: ContractTransactionRequest
): Promise<Hex> {
  return provider.request<Hex>({
    method: "eth_sendTransaction",
    params: [request]
  });
}

function buildRegistryRequest(
  input: ContractAwardInput,
  call: RegistryCall
): ContractTransactionRequest {
  return {
    from: requireAddress(input.from, "from"),
    to: requireAddress(input.registryAddress, "registryAddress"),
    data: encodeFunctionData({
      abi: awardRegistryAbi,
      ...call
    })
  };
}

function requireAddress(value: string, name: string): Address {
  if (!isAddress(value)) {
    throw new Error(`${name.toUpperCase()}_INVALID`);
  }

  return value as Address;
}

function parseAmount(value: string): bigint {
  if (!/^[1-9]\d*$/.test(value.trim())) {
    throw new Error("AMOUNT_INVALID");
  }

  return BigInt(value);
}

function parseUnixSeconds(value: string, name: string): bigint {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    throw new Error(`${name.toUpperCase()}_INVALID`);
  }

  return BigInt(Math.floor(timestamp / 1000));
}
