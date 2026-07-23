import { renderAwardDetailPage } from "../pages/AwardDetailPage";
import { renderClaimInvitePage } from "../pages/ClaimInvitePage";
import { renderEventDetailPage } from "../pages/EventDetailPage";
import { renderHomePage } from "../pages/HomePage";
import { renderOrganizerDashboardPage } from "../pages/OrganizerDashboardPage";
import { renderOrganizerEventPage } from "../pages/OrganizerEventPage";
import { renderOrganizerWinnerPage } from "../pages/OrganizerWinnerPage";
import { renderParticipantDashboardPage } from "../pages/ParticipantDashboardPage";
import { renderParticipantProjectPage } from "../pages/ParticipantProjectPage";
import { renderProfilePage } from "../pages/ProfilePage";
import { renderProjectDetailPage } from "../pages/ProjectDetailPage";
import { renderRoleLoginPage } from "../pages/RoleLoginPage";

export function renderRoute(pathname: string): string {
  if (pathname.startsWith("/events/")) return renderEventDetailPage(getEventId(pathname));
  if (pathname.startsWith("/projects/")) return renderProjectDetailPage(getProjectId(pathname));
  if (pathname.startsWith("/awards/")) return renderAwardDetailPage(getAwardId(pathname));
  if (pathname.startsWith("/profile/")) return renderProfilePage(getProfileWalletAddress(pathname));
  if (pathname.startsWith("/claim/")) return renderClaimInvitePage(getClaimInviteToken(pathname));
  if (pathname === "/login") return renderRoleLoginPage();
  if (pathname === "/organizer") return renderOrganizerDashboardPage();
  if (pathname === "/organizer/events") return renderOrganizerEventPage();
  if (pathname === "/organizer/winners") return renderOrganizerWinnerPage();
  if (pathname === "/participant") return renderParticipantDashboardPage();
  if (pathname === "/participant/projects") return renderParticipantProjectPage();
  return renderHomePage();
}

export function getAwardId(pathname: string): string | null {
  const match = pathname.match(/^\/awards\/([^/]+)$/);

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1] ?? "");
  } catch {
    return match[1] ?? "";
  }
}

export function getEventId(pathname: string): string | null {
  const match = pathname.match(/^\/events\/([^/]+)$/);

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1] ?? "");
  } catch {
    return match[1] ?? "";
  }
}

export function getProjectId(pathname: string): string | null {
  const match = pathname.match(/^\/projects\/([^/]+)$/);

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1] ?? "");
  } catch {
    return match[1] ?? "";
  }
}

export function getProfileWalletAddress(pathname: string): string | null {
  const match = pathname.match(/^\/profile\/([^/]+)$/);

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1] ?? "");
  } catch {
    return match[1] ?? "";
  }
}

export function getClaimInviteToken(pathname: string): string | null {
  const match = pathname.match(/^\/claim\/([^/]+)$/);

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1] ?? "");
  } catch {
    return match[1] ?? "";
  }
}