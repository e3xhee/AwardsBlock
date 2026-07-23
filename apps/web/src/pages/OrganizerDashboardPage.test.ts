import {
  filterOrganizerEvents,
  getMockProjectsForEvent,
  mapProjectToWinnerPayloads,
  mergeOrganizerEventsWithMockData,
  renderOrganizerDashboardPage,
  renderOrganizerEventRow,
  type OrganizerDashboardEvent,
  type OrganizerDashboardProject,
} from "./OrganizerDashboardPage";

const html = renderOrganizerDashboardPage();

if (!html.includes("organizer-dashboard-page")) {
  throw new Error("Expected organizer dashboard shell");
}

if (
  !html.includes('id="organizer-event-form"') ||
  !html.includes("행사 등록")
) {
  throw new Error(
    "Expected organizer dashboard to render event registration form",
  );
}

if (
  !html.includes('id="organizer-event-list"') ||
  !html.includes("등록한 행사")
) {
  throw new Error(
    "Expected organizer dashboard to render organizer event list",
  );
}

if (
  !html.includes('id="organizer-project-review"') ||
  !html.includes("제출 프로젝트")
) {
  throw new Error(
    "Expected organizer dashboard to render submitted project review area",
  );
}

if (
  html.includes('href="/organizer/events"') ||
  html.includes('href="/organizer/winners"')
) {
  throw new Error(
    "Expected organizer dashboard not to rely on separate workflow links",
  );
}

const events: OrganizerDashboardEvent[] = [
  {
    id: "event-1",
    organizerWallet: "0xaaaa",
    name: "Mine",
    description: "My event",
    startDate: "2026-08-01T00:00:00.000Z",
    endDate: "2026-08-02T00:00:00.000Z",
    submissionDeadline: "2026-07-25T23:59:00.000Z",
    location: "Seoul",
    status: "Published",
  },
  {
    id: "event-2",
    organizerWallet: "0xbbbb",
    name: "Other",
    description: "Other event",
    startDate: "2026-08-01T00:00:00.000Z",
    endDate: "2026-08-02T00:00:00.000Z",
    submissionDeadline: null,
    location: null,
    status: "Published",
  },
];

const organizerEvents = filterOrganizerEvents(events, "0xAAAA");

if (organizerEvents.length !== 1 || organizerEvents[0]?.id !== "event-1") {
  throw new Error(
    "Expected organizer dashboard to show only events created by the signed-in organizer",
  );
}

const mergedEvents = mergeOrganizerEventsWithMockData([], "0xAAAA");
const mergedEventNames = new Set(mergedEvents.map((event) => event.name));

if (mergedEvents.length < 3 || mergedEventNames.size !== mergedEvents.length) {
  throw new Error(
    "Expected organizer dashboard mock events to contain multiple distinct events",
  );
}

if (!mergedEvents.every((event) => event.submissionDeadline)) {
  throw new Error("Expected every mock event to expose a submission deadline");
}

const eventRow = renderOrganizerEventRow(mergedEvents[0]);

if (!eventRow.includes("제출 마감")) {
  throw new Error(
    "Expected organizer event rows to show the submission deadline",
  );
}

const mockProjects = getMockProjectsForEvent(mergedEvents[0]);

if (
  mockProjects.length === 0 ||
  !mockProjects[0]?.eventId.includes(mergedEvents[0].id)
) {
  throw new Error(
    "Expected clicking a mock event to reveal matching submitted projects",
  );
}

const project: OrganizerDashboardProject = {
  id: "project-1",
  eventId: "event-1",
  submitterWallet: "0x3333333333333333333333333333333333333333",
  name: "Uniport",
  tagline: "Unified passport",
  description: "Project description",
  githubUrl: "https://github.com/example/uniport",
  demoUrl: "https://uniport.example",
};

const winnerPayloads = mapProjectToWinnerPayloads(project);

if (winnerPayloads.award.title !== "Grand Prize") {
  throw new Error("Expected winner selection to create a Grand Prize award");
}

if (winnerPayloads.member.walletAddress !== project.submitterWallet) {
  throw new Error(
    "Expected winner recipient wallet to use the project submitter wallet",
  );
}
