import { getEventId, getProjectId, renderRoute } from "./router";

if (getEventId("/events/event-1") !== "event-1") {
  throw new Error("Expected event route id");
}

if (getEventId("/events/event%201") !== "event 1") {
  throw new Error("Expected decoded event route id");
}

const eventRouteHtml = renderRoute("/events/event-1");

if (
  !eventRouteHtml.includes("event-detail-page") ||
  !eventRouteHtml.includes("event-detail-content")
) {
  throw new Error(
    "Expected event detail route to render an event detail shell",
  );
}

if (getProjectId("/projects/project-1") !== "project-1") {
  throw new Error("Expected project route id");
}

if (getProjectId("/projects/project%201") !== "project 1") {
  throw new Error("Expected decoded project route id");
}

const projectRouteHtml = renderRoute("/projects/project-1");

if (
  !projectRouteHtml.includes("project-detail-page") ||
  !projectRouteHtml.includes("project-detail-content")
) {
  throw new Error(
    "Expected project detail route to render a project detail shell",
  );
}

const loginRouteHtml = renderRoute("/login");

if (!loginRouteHtml.includes("role-login-page") || !loginRouteHtml.includes("등록자로 지갑 연결")) {
  throw new Error("Expected role login route to render organizer and participant wallet login choices");
}

const organizerEventRouteHtml = renderRoute("/organizer/events");

if (
  !organizerEventRouteHtml.includes("organizer-event-page") ||
  !organizerEventRouteHtml.includes("행사 등록")
) {
  throw new Error("Expected organizer event route to render event creation flow");
}

const participantProjectRouteHtml = renderRoute("/participant/projects");

if (
  !participantProjectRouteHtml.includes("participant-project-page") ||
  !participantProjectRouteHtml.includes("프로젝트 제출")
) {
  throw new Error("Expected participant project route to render project submission flow");
}

const organizerWinnerRouteHtml = renderRoute("/organizer/winners");

if (
  !organizerWinnerRouteHtml.includes("organizer-winner-page") ||
  !organizerWinnerRouteHtml.includes("우승자 선택")
) {
  throw new Error("Expected organizer winner route to render winner selection flow");
}
const participantDashboardRouteHtml = renderRoute("/participant");

if (
  !participantDashboardRouteHtml.includes("participant-dashboard-page") ||
  !participantDashboardRouteHtml.includes("참가자 대시보드")
) {
  throw new Error("Expected participant route to render a participant dashboard separate from submission");
}