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
  | { functionName: "fundAward"; args: [Hex, bigint] }
  | { functionName: "finalizeAward"; args: [Hex] }
  | { functionName: "claim"; args: [Hex] };

export const awardRegistryAbi = [
  {
    type: "function",
    name: "createAward",
    stateMutability: "nonpayable",
    inputs: [
      { name: "awardId", type: "bytes32" },
      { name: "eventId", type: "bytes32" },
      { name: "projectId", type: "bytes32" },
      { name: "metadataURI", type: "string" },
      { name: "metadataHash", type: "bytes32" },
      { name: "rewardToken", type: "address" },
      { name: "claimStart", type: "uint64" },
      { name: "claimEnd", type: "uint64" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "setRecipients",
    stateMutability: "nonpayable",
    inputs: [
      { name: "awardId", type: "bytes32" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "fundAward",
    stateMutability: "nonpayable",
    inputs: [
      { name: "awardId", type: "bytes32" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "finalizeAward",
    stateMutability: "nonpayable",
    inputs: [{ name: "awardId", type: "bytes32" }],
    outputs: []
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "awardId", type: "bytes32" }],
    outputs: []
  }
] as const;

export const erc20ApproveAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  }
] as const;

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
