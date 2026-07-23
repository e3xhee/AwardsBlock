import { renderRoleLoginPage } from "./RoleLoginPage";

const html = renderRoleLoginPage();

if (!html.includes("role-login-page")) {
  throw new Error("Expected role login page shell");
}

if (!html.includes("data-role-login=\"organizer\"") || !html.includes("등록자로 지갑 연결")) {
  throw new Error("Expected organizer wallet login action");
}

if (!html.includes("data-role-login=\"participant\"") || !html.includes("참가자로 지갑 연결")) {
  throw new Error("Expected participant wallet login action");
}

if (html.includes("href=\"/organizer/events\"") || html.includes("href=\"/participant/projects\"")) {
  throw new Error("Expected role login to authenticate before routing to role pages");
}

if (html.includes("role-login-status") || html.includes("먼저 역할을 선택하세요")) {
  throw new Error("Expected role login page not to render the waiting status panel");
}