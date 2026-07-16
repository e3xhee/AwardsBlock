export type WalletState = {
  address: string | null;
  chainId: number | null;
};

export const walletState: WalletState = {
  address: null,
  chainId: null,
};
