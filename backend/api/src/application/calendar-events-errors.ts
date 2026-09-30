export type CalendarEventsErrorReason =
  | "invalid_argument"
  | "invalid_database_result";

export class CalendarEventsError extends Error {
  readonly code = "CALENDAR_EVENTS_REJECTED" as const;

  constructor(readonly reason: CalendarEventsErrorReason) {
    super("Calendar events request rejected");
    this.name = "CalendarEventsError";
  }

  toJSON(): {
    code: "CALENDAR_EVENTS_REJECTED";
    reason: CalendarEventsErrorReason;
  } {
    return { code: this.code, reason: this.reason };
  }
}
