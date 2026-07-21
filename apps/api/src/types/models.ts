export type AwardStatus =
  | "Draft"
  | "AwaitingRecipients"
  | "ReadyToFund"
  | "Funded"
  | "Finalized"
  | "Claiming"
  | "Completed"
  | "Superseded"
  | "Closed";

export type EventStatus = "Draft" | "Published" | "Completed" | "Archived";
