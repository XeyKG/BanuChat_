import {
  getAnnouncements,
  type AnnouncementsInput,
} from "../application/announcements.js";
import {
  getCalendarEvents,
  type CalendarEventsInput,
} from "../application/calendar-events.js";
import {
  getCourseCatalog,
  type CourseCatalogStatus,
} from "../application/course-catalog.js";
import {
  lookupDocuments,
  type DocumentLookupInput,
} from "../application/document-lookup.js";
import {
  getProfileProgress,
  type ProfileProgressStatus,
} from "../application/profile-progress.js";
import {
  renderAnnouncements,
  renderBasicSocial,
  renderCalendarEvents,
  renderCapabilitiesHelp,
  renderCourseCatalog,
  renderDocumentLookup,
  renderKnownOutOfScope,
  renderProfileProgress,
} from "./chat-renderers.js";
import type {
  ChatDispatchDependencies,
  ChatDispatchInput,
  ChatDispatchResult,
} from "./chat-types.js";

const AGENT_FALLBACK = { kind: "agent_fallback" } as const;

export async function dispatchChatQuery(
  dependencies: ChatDispatchDependencies,
  input: ChatDispatchInput,
): Promise<ChatDispatchResult> {
  const decision = dependencies.router.route({
    content: input.content,
    context: {
      profile_selected: input.profile_key !== null,
      now: input.now,
    },
  });

  if (decision.route === "course_catalog") {
    const result = await getCourseCatalog(dependencies.sql, {
      ...(decision.parameters.statuses === undefined
        ? {}
        : { statuses: decision.parameters.statuses as readonly CourseCatalogStatus[] }),
      ...(decision.parameters.limit === undefined
        ? {}
        : { limit: decision.parameters.limit }),
    });
    return renderCourseCatalog(result);
  }

  if (decision.route === "profile_progress") {
    if (input.profile_key === null) return AGENT_FALLBACK;

    const result = await getProfileProgress(dependencies.sql, {
      profile_key: input.profile_key,
      ...(decision.parameters.statuses === undefined
        ? {}
        : {
            statuses: decision.parameters
              .statuses as readonly ProfileProgressStatus[],
          }),
      ...(decision.parameters.limit === undefined
        ? {}
        : { limit: decision.parameters.limit }),
    });
    return renderProfileProgress(result);
  }

  if (decision.route === "document_lookup") {
    const { query } = decision.parameters;
    if (query === undefined) return AGENT_FALLBACK;

    const result = await lookupDocuments(dependencies.sql, {
      query,
      ...(decision.parameters.retrieval_mode === undefined
        ? {}
        : { retrieval_mode: decision.parameters.retrieval_mode }),
      ...(decision.parameters.limit === undefined
        ? {}
        : { limit: decision.parameters.limit }),
    } satisfies DocumentLookupInput);
    return renderDocumentLookup(result);
  }

  if (decision.route === "calendar_events") {
    const { date_from, date_to } = decision.parameters;
    if (date_from === undefined || date_to === undefined) {
      return AGENT_FALLBACK;
    }

    const result = await getCalendarEvents(dependencies.sql, {
      date_from,
      date_to,
      ...(decision.parameters.event_types === undefined
        ? {}
        : { event_types: decision.parameters.event_types }),
      ...(decision.parameters.limit === undefined
        ? {}
        : { limit: decision.parameters.limit }),
    } satisfies CalendarEventsInput);
    return renderCalendarEvents(result);
  }

  if (decision.route === "announcements") {
    const { reference_time } = decision.parameters;
    if (reference_time === undefined) return AGENT_FALLBACK;

    const result = await getAnnouncements(dependencies.sql, {
      reference_time,
      ...(decision.parameters.temporal_status === undefined
        ? {}
        : { temporal_status: decision.parameters.temporal_status }),
      ...(decision.parameters.limit === undefined
        ? {}
        : { limit: decision.parameters.limit }),
      ...(decision.parameters.query === undefined
        ? {}
        : { query: decision.parameters.query }),
    } satisfies AnnouncementsInput);
    return renderAnnouncements(result);
  }

  if (decision.route === "basic_social") {
    const { response_variant } = decision;
    if (
      response_variant !== "greeting" &&
      response_variant !== "thanks" &&
      response_variant !== "farewell"
    ) {
      return AGENT_FALLBACK;
    }
    return renderBasicSocial(input.release_id, response_variant);
  }

  if (
    decision.route === "capabilities_help" &&
    decision.response_variant === "capabilities"
  ) {
    return renderCapabilitiesHelp(input.release_id);
  }

  if (
    decision.route === "known_out_of_scope" &&
    decision.response_variant === "not_available"
  ) {
    return renderKnownOutOfScope(input.release_id);
  }

  return AGENT_FALLBACK;
}
