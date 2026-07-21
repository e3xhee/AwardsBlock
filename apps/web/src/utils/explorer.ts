export function buildTransactionExplorerUrl(
  blockExplorerUrl: string,
  txHash: string,
): string | null {
  const normalizedExplorerUrl = blockExplorerUrl.trim().replace(/\/+$/, "");
  const normalizedTxHash = txHash.trim();

  if (!normalizedExplorerUrl || !normalizedTxHash) {
    return null;
  }

  return `${normalizedExplorerUrl}/tx/${normalizedTxHash}`;
}
