import { randomBytes } from "node:crypto";

export function createAuthNonce(): string {
  return randomBytes(24).toString("hex");
}

export function createSignInMessage(walletAddress: string, nonce: string): string {
  return [
    "Sign in to AwardBlock.",
    "",
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}
