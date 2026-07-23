import {
  getMockEventDetailFallback,
  mapEventDetailToViewModel,
  renderEventDetailPage,
  type EventDetailResponse,
  type EventProjectListResponse,
} from "./EventDetailPage";

const eventResponse: EventDetailResponse = {
  event: {
    id: "event-1",
    organizerWallet: "0x0123456789abcdef0123456789abcdef01234567",
    name: "Seoul Demo Day",
    description: "Demo day for builder award submissions",
    startDate: "2026-08-01T09:00:00.000Z",
    endDate: "2026-08-02T18:00:00.000Z",
    location: "Seoul",
    imageUrl: null,
    officialUrl: "https://awardblock.example/events/seoul-demo-day",
    socialUrl: null,
    status: "Published",
    createdAt: "2026-07-20T00:00:00.000Z",
    updatedAt: "2026-07-20T00:00:00.000Z",
  },
};

const projectsResponse: EventProjectListResponse = {
  projects: [
    {
      id: "project-1",
      eventId: "event-1",
      name: "ProofBoard",
      tagline: "Verifiable award submissions",
      description: "A project that makes award review traceable.",
      problem: null,
      solution: "Teams submit canonical award proof.",
      imageUrl: null,
      githubUrl: "https://github.com/example/proofboard",
      demoUrl: "https://proofboard.example",
      presentationUrl: null,
      createdAt: "2026-07-20T00:00:00.000Z",
      updatedAt: "2026-07-20T00:00:00.000Z",
    },
  ],
};

const viewModel = mapEventDetailToViewModel(
  eventResponse.event,
  projectsResponse.projects,
);

if (viewModel.name !== "Seoul Demo Day") {
  throw new Error("Expected event name");
}

if (viewModel.organizerLabel !== "0x0123...4567") {
  throw new Error("Expected shortened organizer wallet");
}

if (viewModel.dateRangeLabel !== "2026년 8월 01일 - 2026년 8월 02일") {
  throw new Error("Expected formatted event date range");
}

if (viewModel.locationLabel !== "Seoul") {
  throw new Error("Expected event location label");
}

if (viewModel.projects[0]?.href !== "/projects/project-1") {
  throw new Error("Expected project detail link");
}

if (viewModel.status !== "공개됨") {
  throw new Error("Expected Korean event status label");
}

if (!renderEventDetailPage("event-1").includes("이벤트 상세")) {
  throw new Error("Expected Korean event detail title");
}

if (!renderEventDetailPage("event-1").includes("event-detail-content")) {
  throw new Error("Expected event detail content mount target");
}

const seoulFallback = getMockEventDetailFallback("mock-seoul-builder-sprint");
const campusFallback = getMockEventDetailFallback("mock-campus-proof-demo-day");

if (!seoulFallback || !campusFallback) {
  throw new Error(
    "Expected mock event detail fallbacks for project event links",
  );
}

const seoulViewModel = mapEventDetailToViewModel(
  seoulFallback.event,
  seoulFallback.projects,
);
const campusViewModel = mapEventDetailToViewModel(
  campusFallback.event,
  campusFallback.projects,
);

if (
  seoulViewModel.name !== "Seoul Builder Sprint" ||
  seoulViewModel.projects[0]?.href !== "/projects/mock-my-project-uniport"
) {
  throw new Error(
    "Expected Seoul mock event to link back to Uniport project detail",
  );
}

if (
  campusViewModel.name !== "Campus Proof Demo Day" ||
  campusViewModel.projects[0]?.href !== "/projects/mock-my-project-chainfolio"
) {
  throw new Error(
    "Expected Campus mock event to link back to Chainfolio project detail",
  );
}

if (getMockEventDetailFallback("unknown-event") !== null) {
  throw new Error("Expected unknown event ids not to return fallback data");
}
