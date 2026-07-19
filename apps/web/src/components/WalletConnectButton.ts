import {
  authenticateWallet,
  loadWalletSession,
  type WalletSession
} from "../auth/walletAuth";
import { walletState } from "../state/appState";
import { shortenAddress } from "../utils/format";

type MountWalletConnectButtonOptions = {
  authenticate?: () => Promise<WalletSession>;
  loadSession?: () => Promise<WalletSession | null>;
};

export function renderWalletConnectButton(): string {
  return `
    <div class="wallet-auth" data-wallet-auth>
      <span class="wallet-auth__status" data-wallet-status>No wallet session</span>
      <button class="button wallet-auth__button" type="button" data-wallet-connect>
        Connect wallet
      </button>
    </div>
  `;
}

export function mountWalletConnectButton(
  root: ParentNode,
  options: MountWalletConnectButtonOptions = {}
): void {
  const container = root.querySelector<HTMLElement>("[data-wallet-auth]");
  const status = container?.querySelector<HTMLElement>("[data-wallet-status]");
  const button = container?.querySelector<HTMLButtonElement>("[data-wallet-connect]");

  if (!container || !status || !button) return;

  const authenticate = options.authenticate ?? authenticateWallet;
  const loadSession = options.loadSession ?? loadWalletSession;

  renderWalletState(container, status, button, walletState.address);

  void loadSession()
    .then((session) => {
      renderWalletState(container, status, button, session?.walletAddress ?? null);
    })
    .catch(() => {
      renderWalletState(container, status, button, null);
    });

  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Connecting...";
    status.textContent = "Awaiting wallet signature";
    container.classList.remove("wallet-auth--error");

    try {
      const session = await authenticate();
      renderWalletState(container, status, button, session.walletAddress);
      container.dispatchEvent(
        new CustomEvent("awardblock:wallet-session", {
          bubbles: true,
          detail: session
        })
      );
    } catch {
      container.classList.add("wallet-auth--error");
      status.textContent = "Wallet connection failed";
      button.disabled = false;
      button.textContent = "Connect wallet";
    }
  });
}

function renderWalletState(
  container: HTMLElement,
  status: HTMLElement,
  button: HTMLButtonElement,
  address: string | null
): void {
  container.classList.remove("wallet-auth--error");
  button.disabled = false;

  if (!address) {
    status.textContent = "No wallet session";
    button.textContent = "Connect wallet";
    return;
  }

  status.textContent = `Connected ${shortenAddress(address)}`;
  button.textContent = "Switch wallet";
}
