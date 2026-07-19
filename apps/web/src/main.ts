import "./styles/base.css";
import { mountAwardDetailPage } from "./pages/AwardDetailPage";
import { mountHomePage } from "./pages/HomePage";
import { mountProfilePage } from "./pages/ProfilePage";
import { getAwardId, getProfileWalletAddress, renderRoute } from "./router/router";

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
  const awardId = getAwardId(pathname);
  const profileWalletAddress = getProfileWalletAddress(pathname);

  if (awardId) {
    await mountAwardDetailPage(root, awardId);
    return;
  }

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
