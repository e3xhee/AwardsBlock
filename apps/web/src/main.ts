import "./styles/base.css";
import { mountAwardDetailPage } from "./pages/AwardDetailPage";
import { mountClaimInvitePage } from "./pages/ClaimInvitePage";
import { mountEventDetailPage } from "./pages/EventDetailPage";
import { mountHomePage } from "./pages/HomePage";
import { mountOrganizerDashboardPage } from "./pages/OrganizerDashboardPage";
import { mountOrganizerEventPage } from "./pages/OrganizerEventPage";
import { mountOrganizerWinnerPage } from "./pages/OrganizerWinnerPage";
import { mountParticipantProjectPage } from "./pages/ParticipantProjectPage";
import { mountProfilePage } from "./pages/ProfilePage";
import { mountProjectDetailPage } from "./pages/ProjectDetailPage";
import { mountRoleLoginPage } from "./pages/RoleLoginPage";
import {
  getAwardId,
  getClaimInviteToken,
  getEventId,
  getProfileWalletAddress,
  getProjectId,
  renderRoute
} from "./router/router";

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
  const eventId = getEventId(pathname);
  const projectId = getProjectId(pathname);
  const awardId = getAwardId(pathname);
  const claimInviteToken = getClaimInviteToken(pathname);
  const profileWalletAddress = getProfileWalletAddress(pathname);

  if (eventId) {
    await mountEventDetailPage(root, eventId);
    return;
  }

  if (projectId) {
    await mountProjectDetailPage(root, projectId);
    return;
  }

  if (awardId) {
    await mountAwardDetailPage(root, awardId);
    return;
  }

  if (claimInviteToken) {
    await mountClaimInvitePage(root, claimInviteToken);
    return;
  }

  if (profileWalletAddress) {
    await mountProfilePage(root, profileWalletAddress);
    return;
  }

  if (pathname === "/login") {
    mountRoleLoginPage(root);
    return;
  }

  if (pathname === "/organizer") {
    mountOrganizerDashboardPage(root);
    return;
  }

  if (pathname === "/organizer/events") {
    mountOrganizerEventPage(root);
    return;
  }

  if (pathname === "/organizer/winners") {
    mountOrganizerWinnerPage(root);
    return;
  }

  if (pathname === "/participant" || pathname === "/participant/projects") {
    mountParticipantProjectPage(root);
    return;
  }

  if (pathname === "/") {
    await mountHomePage(root);
  }
}

window.addEventListener("popstate", render);
render();