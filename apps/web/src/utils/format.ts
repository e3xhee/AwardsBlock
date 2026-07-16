export function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTokenAmount(baseUnits: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = baseUnits / divisor;
  const fraction = baseUnits % divisor;
  const fractionLabel = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fractionLabel ? `${whole}.${fractionLabel}` : whole.toString();
}
