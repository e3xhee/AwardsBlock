import {
  getMockParticipantProjects,
  mergeParticipantEventsWithMockData,
  renderParticipantEventCard,
  renderParticipantProjectList,
  renderParticipantProjectPage,
  type ParticipantEventSummary,
} from "./ParticipantProjectPage";

const html = renderParticipantProjectPage();

if (!html.includes("participant-project-page")) {
  throw new Error("Expected participant project page shell");
}

if (
  !html.includes('id="participant-event-list"') ||
  !html.includes("참가 가능한 행사")
) {
  throw new Error("Expected participant page to show joinable events");
}

if (
  !html.includes('id="participant-project-form"') ||
  !html.includes("프로젝트 제출")
) {
  throw new Error(
    "Expected participant page to keep the project submission form",
  );
}

if (
  !html.includes('id="participant-my-project-list"') ||
  !html.includes("내 제출 프로젝트")
) {
  throw new Error("Expected participant page to show my submitted projects");
}

const events: ParticipantEventSummary[] = [
  {
    id: "event-1",
    name: "Real Event",
    status: "Published",
    startDate: "2026-08-01T00:00:00.000Z",
    endDate: "2026-08-02T00:00:00.000Z",
    submissionDeadline: null,
  },
];

const mergedEvents = mergeParticipantEventsWithMockData(events);
const names = new Set(mergedEvents.map((event) => event.name));

if (mergedEvents.length < 4 || names.size !== mergedEvents.length) {
  throw new Error("Expected real events plus distinct mock participant events");
}

if (!mergedEvents.every((event) => event.submissionDeadline)) {
  throw new Error(
    "Expected participant event cards to have submission deadlines",
  );
}

const eventCard = renderParticipantEventCard(mergedEvents[0]);

if (
  !eventCard.includes("제출 마감") ||
  !eventCard.includes("data-participant-event-id")
) {
  throw new Error(
    "Expected participant event card to show deadline and selection control",
  );
}

const mockProjects = getMockParticipantProjects("0xAAAA");
const projectList = renderParticipantProjectList(mockProjects);

if (
  !projectList.includes("내 제출 프로젝트") ||
  !projectList.includes("Uniport")
) {
  throw new Error(
    "Expected participant project list to show mock submitted projects",
  );
}
