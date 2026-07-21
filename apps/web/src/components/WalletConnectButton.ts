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
      <span class="wallet-auth__status" data-wallet-status>지갑 세션 없음</span>
      <button class="button wallet-auth__button" type="button" data-wallet-connect>
        지갑 연결
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
    button.textContent = "연결 중...";
    status.textContent = "지갑 서명 대기 중";
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
      status.textContent = "지갑 연결 실패";
      button.disabled = false;
      button.textContent = "지갑 연결";
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
    status.textContent = "지갑 세션 없음";
    button.textContent = "지갑 연결";
    return;
  }

  status.textContent = `연결됨 ${shortenAddress(address)}`;
  button.textContent = "지갑 변경";
}
