import {
  mountWalletConnectButton,
  renderWalletConnectButton
} from "./WalletConnectButton";

const html = renderWalletConnectButton();

if (!html.includes("data-wallet-auth")) {
  throw new Error("Expected wallet auth root attribute");
}

if (!html.includes("data-wallet-status")) {
  throw new Error("Expected wallet auth status attribute");
}

if (!html.includes("지갑 세션 없음")) {
  throw new Error("Expected disconnected wallet status");
}

if (!html.includes("지갑 연결")) {
  throw new Error("Expected connect wallet button label");
}

if (typeof mountWalletConnectButton !== "function") {
  throw new Error("Expected wallet auth mount function");
}
