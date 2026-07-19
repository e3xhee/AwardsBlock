import "./styles/base.css";
import { mountHomePage } from "./pages/HomePage";
import { mountProfilePage } from "./pages/ProfilePage";
import { getProfileWalletAddress, renderRoute } from "./router/router";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app root element was not found.");
}

const appRoot = app;

function render() {
  const pathname = window.location.pathname;
  appRoot.innerHTML = renderRoute(pathname);
  void mountRoute(appRoot, pathname);
}

async function mountRoute(root: ParentNode, pathname: string): Promise<void> {
  const profileWalletAddress = getProfileWalletAddress(pathname);

  if (profileWalletAddress) {
    await mountProfilePage(root, profileWalletAddress);
    return;
  }

  if (pathname === "/") {
    await mountHomePage(root);
  }
}

window.addEventListener("popstate", render);
render();
