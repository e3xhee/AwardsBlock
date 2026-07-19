import { renderAwardDetailPage } from "../pages/AwardDetailPage";
import { renderClaimInvitePage } from "../pages/ClaimInvitePage";
import { renderEventDetailPage } from "../pages/EventDetailPage";
import { renderHomePage } from "../pages/HomePage";
import { renderOrganizerPage } from "../pages/OrganizerPage";
import { renderProfilePage } from "../pages/ProfilePage";
import { renderProjectDetailPage } from "../pages/ProjectDetailPage";

export function renderRoute(pathname: string): string {
  if (pathname.startsWith("/events/")) return renderEventDetailPage();
  if (pathname.startsWith("/projects/")) return renderProjectDetailPage();
  if (pathname.startsWith("/awards/")) return renderAwardDetailPage();
  if (pathname.startsWith("/profile/")) return renderProfilePage(getProfileWalletAddress(pathname));
  if (pathname.startsWith("/claim/")) return renderClaimInvitePage();
  if (pathname === "/organizer") return renderOrganizerPage();
  return renderHomePage();
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
