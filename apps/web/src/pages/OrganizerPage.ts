import { apiPost } from "../api/client";
import {
  mountWalletConnectButton,
  renderWalletConnectButton
} from "../components/WalletConnectButton";

export type OrganizerAwardDraft = {
  eventName: string;
  eventDescription: string;
  eventStartDate: string;
  eventEndDate: string;
  eventLocation: string;
  eventOfficialUrl: string;
  projectName: string;
  projectTagline: string;
  projectDescription: string;
  projectProblem: string;
  projectSolution: string;
  projectGithubUrl: string;
  projectDemoUrl: string;
  awardTitle: string;
  awardRank: string;
  awardReason: string;
  judgingSummary: string;
  rewardTokenAddress: string;
  rewardTokenSymbol: string;
  rewardTokenDecimals: string;
  totalReward: string;
  claimStart: string;
  claimEnd: string;
  metadataUri: string;
  metadataHash: string;
  recipientName: string;
  recipientEmail: string;
  recipientAllocation: string;
  inviteExpiresAt: string;
};

type OrganizerAwardPayloads = {
  event: {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    location: string | null;
    officialUrl: string | null;
  };
  project: {
    name: string;
    tagline: string;
    description: string;
    problem: string | null;
    solution: string | null;
    githubUrl: string | null;
    demoUrl: string | null;
  };
  award: {
    title: string;
    rank: string | null;
    reason: string | null;
    judgingSummary: string | null;
    rewardTokenAddress: string;
    rewardTokenSymbol: string;
    rewardTokenDecimals: number;
    totalReward: string;
    claimStart: string;
    claimEnd: string;
    metadataUri: string | null;
    metadataHash: string | null;
    status: string;
  };
  member: {
    displayName: string;
    email: string | null;
    allocation: string;
    inviteStatus: string;
  };
  invite: {
    expiresAt?: string;
  };
};

type CreatedEventResponse = {
  event: {
    id: string;
    name: string;
  };
};

type CreatedProjectResponse = {
  project: {
    id: string;
    name: string;
  };
};

type CreatedAwardResponse = {
  award: {
    id: string;
    title: string;
  };
};

type CreatedMemberResponse = {
  member: {
    id: string;
    displayName: string;
  };
};

type CreatedInviteResponse = {
  invite: {
    id: string;
    token: string;
  };
};

type OrganizerSubmissionResult = {
  eventId: string;
  projectId: string;
  awardId: string;
  memberId: string;
  inviteId: string;
  inviteToken: string;
  awardTitle: string;
  recipientName: string;
  claimPath: string;
  awardPath: string;
};

const defaultDraft: OrganizerAwardDraft = {
  eventName: "Seoul Demo Day",
  eventDescription: "Demo day for builder award submissions",
  eventStartDate: "2026-08-01T09:00:00.000Z",
  eventEndDate: "2026-08-01T18:00:00.000Z",
  eventLocation: "Seoul",
  eventOfficialUrl: "https://awardblock.example/events/seoul-demo-day",
  projectName: "ProofBoard",
  projectTagline: "Verifiable award submissions",
  projectDescription: "A project that makes award review traceable.",
  projectProblem: "Judges need consistent context before assigning prize rewards.",
  projectSolution: "Teams submit canonical award proof.",
  projectGithubUrl: "https://github.com/example/proofboard",
  projectDemoUrl: "https://proofboard.example",
  awardTitle: "Best Product",
  awardRank: "1st",
  awardReason: "The team delivered the clearest user-facing award flow.",
  judgingSummary: "Strong product thinking and complete demo.",
  rewardTokenAddress: "0x2222222222222222222222222222222222222222",
  rewardTokenSymbol: "MNT",
  rewardTokenDecimals: "18",
  totalReward: "1000000000000000000",
  claimStart: "2026-08-02T00:00:00.000Z",
  claimEnd: "2026-09-01T00:00:00.000Z",
  metadataUri: "ipfs://awardblock/best-product",
  metadataHash: "0xabc123",
  recipientName: "Ada Lee",
  recipientEmail: "ada@example.com",
  recipientAllocation: "600000000000000000",
  inviteExpiresAt: "2026-08-15T00:00:00.000Z"
};

export function renderOrganizerPage(): string {
  return `
    <main class="page-shell organizer-page">
      <section class="organizer-hero">
        <div>
          <p class="eyebrow">Organizer</p>
          <h1>Award Setup</h1>
          <p>Create the event, project, award, recipient allocation, and claim invite from one authenticated flow.</p>
        </div>
        <div class="page-actions">
          <span class="status-badge">Draft flow</span>
          ${renderWalletConnectButton()}
        </div>
      </section>
      <section class="organizer-layout">
        <form id="organizer-award-form" class="organizer-form">
          ${renderEventFields(defaultDraft)}
          ${renderProjectFields(defaultDraft)}
          ${renderAwardFields(defaultDraft)}
          ${renderRecipientFields(defaultDraft)}
          <button class="button" type="submit">Create award setup</button>
        </form>
        <aside id="organizer-result" class="organizer-result" aria-live="polite">
          <p class="eyebrow">Ready</p>
          <h2>Waiting for organizer session</h2>
          <p>Submit after connecting an organizer wallet session. The API will reject the flow until a session cookie exists.</p>
        </aside>
      </section>
    </main>
  `;
}

export function mountOrganizerPage(root: ParentNode): void {
  mountWalletConnectButton(root);

  const form = root.querySelector<HTMLFormElement>("#organizer-award-form");
  const result = root.querySelector<HTMLElement>("#organizer-result");

  if (!form || !result) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector<HTMLButtonElement>("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Creating...";
    }

    result.innerHTML = renderOrganizerProgress("Creating event");

    try {
      const submission = await createOrganizerAwardSetup(readOrganizerAwardDraft(form), (step) => {
        result.innerHTML = renderOrganizerProgress(step);
      });
      result.innerHTML = renderOrganizerSuccess(submission);
      form.reset();
    } catch {
      result.innerHTML = renderOrganizerError();
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Create award setup";
      }
    }
  });
}

export function buildOrganizerAwardPayloads(
  draft: OrganizerAwardDraft
): OrganizerAwardPayloads {
  return {
    event: {
      name: requiredText(draft.eventName),
      description: requiredText(draft.eventDescription),
      startDate: requiredText(draft.eventStartDate),
      endDate: requiredText(draft.eventEndDate),
      location: nullableText(draft.eventLocation),
      officialUrl: nullableText(draft.eventOfficialUrl)
    },
    project: {
      name: requiredText(draft.projectName),
      tagline: requiredText(draft.projectTagline),
      description: requiredText(draft.projectDescription),
      problem: nullableText(draft.projectProblem),
      solution: nullableText(draft.projectSolution),
      githubUrl: nullableText(draft.projectGithubUrl),
      demoUrl: nullableText(draft.projectDemoUrl)
    },
    award: {
      title: requiredText(draft.awardTitle),
      rank: nullableText(draft.awardRank),
      reason: nullableText(draft.awardReason),
      judgingSummary: nullableText(draft.judgingSummary),
      rewardTokenAddress: requiredText(draft.rewardTokenAddress),
      rewardTokenSymbol: requiredText(draft.rewardTokenSymbol),
      rewardTokenDecimals: Number(requiredText(draft.rewardTokenDecimals)),
      totalReward: requiredText(draft.totalReward),
      claimStart: requiredText(draft.claimStart),
      claimEnd: requiredText(draft.claimEnd),
      metadataUri: nullableText(draft.metadataUri),
      metadataHash: nullableText(draft.metadataHash),
      status: "Claiming"
    },
    member: {
      displayName: requiredText(draft.recipientName),
      email: nullableText(draft.recipientEmail),
      allocation: requiredText(draft.recipientAllocation),
      inviteStatus: "Pending"
    },
    invite: {
      ...(nullableText(draft.inviteExpiresAt) === null
        ? {}
        : { expiresAt: requiredText(draft.inviteExpiresAt) })
    }
  };
}

async function createOrganizerAwardSetup(
  draft: OrganizerAwardDraft,
  onStep: (step: string) => void
): Promise<OrganizerSubmissionResult> {
  const payloads = buildOrganizerAwardPayloads(draft);
  const event = await apiPost<CreatedEventResponse, OrganizerAwardPayloads["event"]>(
    "/events",
    payloads.event
  );

  onStep("Creating project");
  const project = await apiPost<CreatedProjectResponse, OrganizerAwardPayloads["project"]>(
    `/events/${encodeURIComponent(event.event.id)}/projects`,
    payloads.project
  );

  onStep("Creating award");
  const award = await apiPost<CreatedAwardResponse, OrganizerAwardPayloads["award"]>(
    `/projects/${encodeURIComponent(project.project.id)}/awards`,
    payloads.award
  );

  onStep("Adding recipient");
  const member = await apiPost<CreatedMemberResponse, OrganizerAwardPayloads["member"]>(
    `/awards/${encodeURIComponent(award.award.id)}/members`,
    payloads.member
  );

  onStep("Creating claim invite");
  const invite = await apiPost<CreatedInviteResponse, OrganizerAwardPayloads["invite"]>(
    `/award-members/${encodeURIComponent(member.member.id)}/claim-invites`,
    payloads.invite
  );

  return {
    eventId: event.event.id,
    projectId: project.project.id,
    awardId: award.award.id,
    memberId: member.member.id,
    inviteId: invite.invite.id,
    inviteToken: invite.invite.token,
    awardTitle: award.award.title,
    recipientName: member.member.displayName,
    claimPath: `/claim/${encodeURIComponent(invite.invite.token)}`,
    awardPath: `/awards/${encodeURIComponent(award.award.id)}`
  };
}

function readOrganizerAwardDraft(form: HTMLFormElement): OrganizerAwardDraft {
  const formData = new FormData(form);
  return {
    eventName: readFormString(formData, "eventName"),
    eventDescription: readFormString(formData, "eventDescription"),
    eventStartDate: readFormString(formData, "eventStartDate"),
    eventEndDate: readFormString(formData, "eventEndDate"),
    eventLocation: readFormString(formData, "eventLocation"),
    eventOfficialUrl: readFormString(formData, "eventOfficialUrl"),
    projectName: readFormString(formData, "projectName"),
    projectTagline: readFormString(formData, "projectTagline"),
    projectDescription: readFormString(formData, "projectDescription"),
    projectProblem: readFormString(formData, "projectProblem"),
    projectSolution: readFormString(formData, "projectSolution"),
    projectGithubUrl: readFormString(formData, "projectGithubUrl"),
    projectDemoUrl: readFormString(formData, "projectDemoUrl"),
    awardTitle: readFormString(formData, "awardTitle"),
    awardRank: readFormString(formData, "awardRank"),
    awardReason: readFormString(formData, "awardReason"),
    judgingSummary: readFormString(formData, "judgingSummary"),
    rewardTokenAddress: readFormString(formData, "rewardTokenAddress"),
    rewardTokenSymbol: readFormString(formData, "rewardTokenSymbol"),
    rewardTokenDecimals: readFormString(formData, "rewardTokenDecimals"),
    totalReward: readFormString(formData, "totalReward"),
    claimStart: readFormString(formData, "claimStart"),
    claimEnd: readFormString(formData, "claimEnd"),
    metadataUri: readFormString(formData, "metadataUri"),
    metadataHash: readFormString(formData, "metadataHash"),
    recipientName: readFormString(formData, "recipientName"),
    recipientEmail: readFormString(formData, "recipientEmail"),
    recipientAllocation: readFormString(formData, "recipientAllocation"),
    inviteExpiresAt: readFormString(formData, "inviteExpiresAt")
  };
}

function renderEventFields(draft: OrganizerAwardDraft): string {
  return `
    <fieldset>
      <legend>Event</legend>
      ${renderInput("Event name", "eventName", draft.eventName, true)}
      ${renderTextarea("Description", "eventDescription", draft.eventDescription, true)}
      <div class="organizer-field-grid">
        ${renderInput("Start date", "eventStartDate", draft.eventStartDate, true)}
        ${renderInput("End date", "eventEndDate", draft.eventEndDate, true)}
      </div>
      <div class="organizer-field-grid">
        ${renderInput("Location", "eventLocation", draft.eventLocation)}
        ${renderInput("Official URL", "eventOfficialUrl", draft.eventOfficialUrl)}
      </div>
    </fieldset>
  `;
}

function renderProjectFields(draft: OrganizerAwardDraft): string {
  return `
    <fieldset>
      <legend>Project</legend>
      ${renderInput("Project name", "projectName", draft.projectName, true)}
      ${renderInput("Tagline", "projectTagline", draft.projectTagline, true)}
      ${renderTextarea("Description", "projectDescription", draft.projectDescription, true)}
      <div class="organizer-field-grid">
        ${renderInput("Problem", "projectProblem", draft.projectProblem)}
        ${renderInput("Solution", "projectSolution", draft.projectSolution)}
      </div>
      <div class="organizer-field-grid">
        ${renderInput("GitHub URL", "projectGithubUrl", draft.projectGithubUrl)}
        ${renderInput("Demo URL", "projectDemoUrl", draft.projectDemoUrl)}
      </div>
    </fieldset>
  `;
}

function renderAwardFields(draft: OrganizerAwardDraft): string {
  return `
    <fieldset>
      <legend>Award</legend>
      <div class="organizer-field-grid">
        ${renderInput("Award title", "awardTitle", draft.awardTitle, true)}
        ${renderInput("Rank", "awardRank", draft.awardRank)}
      </div>
      ${renderTextarea("Reason", "awardReason", draft.awardReason)}
      ${renderTextarea("Judging summary", "judgingSummary", draft.judgingSummary)}
      <div class="organizer-field-grid">
        ${renderInput("Reward token address", "rewardTokenAddress", draft.rewardTokenAddress, true)}
        ${renderInput("Symbol", "rewardTokenSymbol", draft.rewardTokenSymbol, true)}
        ${renderInput("Decimals", "rewardTokenDecimals", draft.rewardTokenDecimals, true)}
      </div>
      ${renderInput("Total reward in base units", "totalReward", draft.totalReward, true)}
      <div class="organizer-field-grid">
        ${renderInput("Claim start", "claimStart", draft.claimStart, true)}
        ${renderInput("Claim end", "claimEnd", draft.claimEnd, true)}
      </div>
      <div class="organizer-field-grid">
        ${renderInput("Metadata URI", "metadataUri", draft.metadataUri)}
        ${renderInput("Metadata hash", "metadataHash", draft.metadataHash)}
      </div>
    </fieldset>
  `;
}

function renderRecipientFields(draft: OrganizerAwardDraft): string {
  return `
    <fieldset>
      <legend>Recipient</legend>
      <div class="organizer-field-grid">
        ${renderInput("Recipient name", "recipientName", draft.recipientName, true)}
        ${renderInput("Recipient email", "recipientEmail", draft.recipientEmail)}
      </div>
      <div class="organizer-field-grid">
        ${renderInput("Allocation in base units", "recipientAllocation", draft.recipientAllocation, true)}
        ${renderInput("Invite expires at", "inviteExpiresAt", draft.inviteExpiresAt)}
      </div>
    </fieldset>
  `;
}

function renderInput(label: string, name: keyof OrganizerAwardDraft, value: string, required = false): string {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <input name="${name}" value="${escapeHtml(value)}"${required ? " required" : ""} />
    </label>
  `;
}

function renderTextarea(
  label: string,
  name: keyof OrganizerAwardDraft,
  value: string,
  required = false
): string {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      <textarea name="${name}"${required ? " required" : ""}>${escapeHtml(value)}</textarea>
    </label>
  `;
}

function renderOrganizerProgress(step: string): string {
  return `
    <p class="eyebrow">Working</p>
    <h2>${escapeHtml(step)}</h2>
    <span class="loading-bar"></span>
  `;
}

function renderOrganizerSuccess(result: OrganizerSubmissionResult): string {
  return `
    <p class="eyebrow">Created</p>
    <h2>${escapeHtml(result.awardTitle)}</h2>
    <dl class="organizer-result-list">
      <div><dt>Recipient</dt><dd>${escapeHtml(result.recipientName)}</dd></div>
      <div><dt>Event ID</dt><dd>${escapeHtml(result.eventId)}</dd></div>
      <div><dt>Project ID</dt><dd>${escapeHtml(result.projectId)}</dd></div>
      <div><dt>Award ID</dt><dd>${escapeHtml(result.awardId)}</dd></div>
      <div><dt>Invite ID</dt><dd>${escapeHtml(result.inviteId)}</dd></div>
    </dl>
    <div class="organizer-result-actions">
      <a class="text-link" href="${escapeHtml(result.awardPath)}">View award</a>
      <a class="text-link" href="${escapeHtml(result.claimPath)}">Open claim invite</a>
    </div>
  `;
}

function renderOrganizerError(): string {
  return `
    <p class="eyebrow">Create failed</p>
    <h2>Organizer wallet session required</h2>
    <p>Sign in with an organizer wallet session, then submit again.</p>
  `;
}

function readFormString(formData: FormData, key: keyof OrganizerAwardDraft): string {
  return String(formData.get(key) ?? "");
}

function requiredText(value: string): string {
  return value.trim();
}

function nullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
