import { getEventId, renderRoute } from "./router";

if (getEventId("/events/event-1") !== "event-1") {
  throw new Error("Expected event route id");
}

if (getEventId("/events/event%201") !== "event 1") {
  throw new Error("Expected decoded event route id");
}

if (!renderRoute("/events/event-1").includes("Event Detail")) {
  throw new Error("Expected event detail route to render an event detail shell");
}
