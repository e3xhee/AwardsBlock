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
